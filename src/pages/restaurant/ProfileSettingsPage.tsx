import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurant } from '@/context/RestaurantContext';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from '@/components/ui/label';
import { EditHoursDialog, OpeningHours } from '@/components/EditHoursDialog';
import { ImageUploader } from '@/components/ImageUploader';
import { Loader2, MapPin, Clock } from 'lucide-react';
import { PaymentMethodsEditor } from '@/components/PaymentMethodsEditor';
import { SocialNetworksEditor } from '@/components/SocialNetworksEditor';
import { Restaurant, PaymentMethod, SocialNetwork } from '@/types';

const weekdayLabels: { [key: string]: string } = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const weekOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const { restaurant, loading, updateRestaurant } = useRestaurant();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cep, setCep] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<OpeningHours>({});
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [socialNetworks, setSocialNetworks] = useState<SocialNetwork[]>([]);

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name || '');
      setDescription(restaurant.description || '');
      setCategory(restaurant.category || '');
      setPhone(restaurant.phone || '');
      setAddress(restaurant.address || '');
      setCity(restaurant.city || '');
      setState(restaurant.state || '');
      setCep(restaurant.cep || '');
      setImageUrl(restaurant.image_url || null);
      setCoverImageUrl(restaurant.cover_image_url || null);
      setCurrentSchedule((restaurant.opening_hours as unknown as OpeningHours) || {});
      setPaymentMethods((restaurant.payment_methods as unknown as PaymentMethod[]) || []);
      setSocialNetworks((restaurant.social_networks as unknown as SocialNetwork[]) || []);
    }
  }, [restaurant]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!user || !restaurant) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <p className="mb-4">Você precisa estar logado e ter um restaurante para ver esta página.</p>
        <Button onClick={() => navigate('/login')}>Ir para o Login</Button>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    const updatedData: Partial<Restaurant> = {
      name,
      description,
      category,
      phone,
      address,
      city,
      state,
      cep,
      image_url: imageUrl,
      cover_image_url: coverImageUrl,
      payment_methods: paymentMethods,
      social_networks: socialNetworks as any,
    };

    try {
      await updateRestaurant(updatedData);
      toast.success('Perfil do restaurante atualizado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar o perfil.', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveHours = async (newSchedule: OpeningHours) => {
    await updateRestaurant({ opening_hours: newSchedule as any });
  };

  const handleImageUpload = async (file: File, type: 'profile' | 'cover') => {
    if (!user) return;
    setIsUploading(true);
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('restaurant-images').upload(fileName, file);

    if (error) {
      toast.error('Erro no upload da imagem.', { description: error.message });
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(data.path);

    if (type === 'profile') {
      setImageUrl(publicUrl);
    } else {
      setCoverImageUrl(publicUrl);
    }
    setIsUploading(false);
    toast.success('Imagem enviada com sucesso!');
  };

  const renderOpeningHoursSummary = () => {
    const scheduleExists = currentSchedule && Object.keys(currentSchedule).length > 0;

    if (!scheduleExists) {
      return <p className="text-sm text-gray-500">Nenhum horário definido.</p>;
    }

    const sortedDays = weekOrder.filter(day => currentSchedule[day]?.isOpen);

    if (sortedDays.length === 0) {
      return <p className="text-sm text-gray-500">Fechado todos os dias.</p>;
    }

    return (
      <div className="space-y-1">
        {sortedDays.map(day => (
          <div key={day} className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">{weekdayLabels[day]}</span>
            <span className="text-gray-600">{currentSchedule[day].open} - {currentSchedule[day].close}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Configurações do Perfil</h1>
        <p className="text-gray-600">Gerencie as informações do seu restaurante.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-soft-lg">
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>Atualize os detalhes principais do seu restaurante.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Restaurante</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Cantina da Mama" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Fale um pouco sobre seu restaurante..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Italiana, Brasileira, Japonesa" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone para Contato</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(99) 99999-9999" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><MapPin className="mr-2 h-5 w-5 text-primary"/> Endereço</CardTitle>
              <CardDescription>Mantenha seu endereço atualizado para que os clientes possam te encontrar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="99999-999" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Logradouro</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua das Flores, 123" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="SP" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft-lg">
            <CardHeader>
              <CardTitle>Redes Sociais</CardTitle>
              <CardDescription>Conecte suas redes para que os clientes possam te seguir.</CardDescription>
            </CardHeader>
            <CardContent>
              <SocialNetworksEditor
                socialNetworks={socialNetworks}
                onChange={setSocialNetworks}
              />
            </CardContent>
          </Card>

        </div>

        <div className="space-y-8">
          <Card className="shadow-soft-lg">
            <CardHeader>
              <CardTitle>Imagens</CardTitle>
              <CardDescription>Uma boa imagem atrai mais clientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Foto de Perfil</Label>
                <ImageUploader
                  currentImage={imageUrl}
                  onImageUpload={(file) => handleImageUpload(file, 'profile')}
                  onImageRemove={() => setImageUrl(null)}
                  isUploading={isUploading}
                  label="Enviar foto de perfil"
                />
              </div>
              <div>
                <Label>Foto de Capa</Label>
                <ImageUploader
                  currentImage={coverImageUrl}
                  onImageUpload={(file) => handleImageUpload(file, 'cover')}
                  onImageRemove={() => setCoverImageUrl(null)}
                  isUploading={isUploading}
                  label="Enviar foto de capa"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><Clock className="mr-2 h-5 w-5 text-primary"/> Horários de Funcionamento</CardTitle>
              <CardDescription>Informe aos clientes quando você está aberto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderOpeningHoursSummary()}
              <Button variant="outline" className="w-full" onClick={() => setIsHoursDialogOpen(true)}>
                Editar Horários
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft-lg">
            <CardHeader>
              <CardTitle>Formas de Pagamento</CardTitle>
              <CardDescription>Selecione os métodos de pagamento que você aceita.</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentMethodsEditor
                selectedMethods={paymentMethods}
                onChange={setPaymentMethods}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="mt-12 text-center">
        <Button size="lg" onClick={handleSave} disabled={isSaving || isUploading} className="bg-primary hover:bg-primary-dark text-white">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar Alterações
        </Button>
      </footer>

      <EditHoursDialog
        open={isHoursDialogOpen}
        onOpenChange={setIsHoursDialogOpen}
        currentSchedule={currentSchedule}
        onSave={handleSaveHours}
      />
    </div>
  );
}