import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { Restaurant, PublicRestaurantData, SocialNetwork } from '@/types/restaurant'; // Importar SocialNetwork
import { WeekSchedule } from '@/types/schedule'; // Importar WeekSchedule do novo arquivo
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Image as ImageIcon, Phone, Mail, Link as LinkIcon, Utensils, MapPin, Clock, CreditCard, QrCode, DollarSign, Instagram, Facebook, Globe } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { getRestaurantOpenStatus } from '@/lib/schedule';
import OpeningHoursEditor from '@/components/restaurant/OpeningHoursEditor';
import SocialNetworksDialog from '@/components/restaurant/SocialNetworksDialog';
import { Json } from '@/types/supabase';

export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const { restaurant, isLoading: authLoading, isPremium, refetchProfile, refetchRestaurant } = useAuthData();
  const { updateRestaurant } = useRestaurantProfile(restaurant as Restaurant); // Cast para Restaurant
  const [formData, setFormData] = useState<Partial<Restaurant>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSocialNetworksDialogOpen, setIsSocialNetworksDialogOpen] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name,
        description: restaurant.description,
        image_url: restaurant.image_url,
        cover_image_url: restaurant.cover_image_url,
        phone: restaurant.phone,
        email: restaurant.email,
        category: restaurant.category,
        whatsapp_url: restaurant.whatsapp_url,
        ifood_url: restaurant.ifood_url,
        other_url: restaurant.other_url,
        address: restaurant.address,
        number: restaurant.number,
        neighborhood: restaurant.neighborhood,
        city: restaurant.city,
        state: restaurant.state,
        cep: restaurant.cep,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        opening_hours: restaurant.opening_hours,
        payment_methods: restaurant.payment_methods,
        social_networks: restaurant.social_networks,
        external_url: restaurant.external_url,
      });
    }
  }, [restaurant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleOpeningHoursChange = (newSchedule: WeekSchedule) => {
    setFormData(prev => ({ ...prev, opening_hours: newSchedule }));
  };

  const handlePaymentMethodsChange = (selectedMethods: string[]) => {
    setFormData(prev => ({ ...prev, payment_methods: selectedMethods as unknown as Json }));
  };

  const handleSocialNetworksSave = (newSocialNetworks: SocialNetwork[]) => {
    setFormData(prev => ({ ...prev, social_networks: newSocialNetworks }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || isSaving) return;

    setIsSaving(true);
    try {
      await updateRestaurant(formData);
      await refetchRestaurant(); // Atualiza os dados do restaurante no contexto
      showSuccess('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Failed to update restaurant profile:', error);
      showError('Falha ao atualizar perfil. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !restaurant) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-highlight" />
      </div>
    );
  }

  const currentSchedule = formData.opening_hours || restaurant.opening_hours;
  const currentPaymentMethods = (formData.payment_methods as string[] | null) || (restaurant.payment_methods as string[] | null) || [];
  const currentSocialNetworks = (formData.social_networks as SocialNetwork[] | null) || (restaurant.social_networks as SocialNetwork[] | null) || [];

  return (
    <div className="container mx-auto p-4 md:max-w-2xl">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6">Configurações do Perfil</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-[#022D68]">Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Restaurante</Label>
              <Input id="name" value={formData.name || ''} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={formData.description || ''} onChange={handleChange} rows={4} />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Input id="category" value={formData.category || ''} onChange={handleChange} placeholder="Ex: Pizzaria, Hamburgueria" />
            </div>
            <div>
              <Label htmlFor="image_url">URL da Imagem de Perfil</Label>
              <Input id="image_url" value={formData.image_url || ''} onChange={handleChange} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="cover_image_url">URL da Imagem de Capa</Label>
              <Input id="cover_image_url" value={formData.cover_image_url || ''} onChange={handleChange} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-[#022D68]">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={formData.phone || ''} onChange={handleChange} placeholder="(XX) XXXXX-XXXX" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email || ''} onChange={handleChange} placeholder="contato@restaurante.com" />
            </div>
            <div>
              <Label htmlFor="whatsapp_url">Link WhatsApp</Label>
              <Input id="whatsapp_url" value={formData.whatsapp_url || ''} onChange={handleChange} placeholder="https://wa.me/..." />
            </div>
            <div>
              <Label htmlFor="ifood_url">Link iFood</Label>
              <Input id="ifood_url" value={formData.ifood_url || ''} onChange={handleChange} placeholder="https://www.ifood.com.br/delivery/..." />
            </div>
            <div>
              <Label htmlFor="other_url">Outro Link (Cardápio Online, etc.)</Label>
              <Input id="other_url" value={formData.other_url || ''} onChange={handleChange} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="external_url">URL Externa (Site próprio)</Label>
              <Input id="external_url" value={formData.external_url || ''} onChange={handleChange} placeholder="https://seusite.com" />
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-[#022D68]">Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" value={formData.cep || ''} onChange={handleChange} placeholder="XXXXX-XXX" />
            </div>
            <div>
              <Label htmlFor="address">Rua/Avenida</Label>
              <Input id="address" value={formData.address || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="number">Número</Label>
              <Input id="number" value={formData.number || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input id="neighborhood" value={formData.neighborhood || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" value={formData.city || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="state">Estado</Label>
              <Input id="state" value={formData.state || ''} onChange={handleChange} />
            </div>
            {/* Latitude e Longitude podem ser preenchidos automaticamente ou manualmente */}
            <div>
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" type="number" value={formData.latitude || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" type="number" value={formData.longitude || ''} onChange={handleChange} />
            </div>
          </CardContent>
        </Card>

        {/* Horário de Funcionamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-[#022D68]">Horário de Funcionamento</CardTitle>
          </CardHeader>
          <CardContent>
            <OpeningHoursEditor
              initialOpeningHours={currentSchedule as WeekSchedule}
              onSave={handleOpeningHoursChange}
            />
          </CardContent>
        </Card>

        {/* Formas de Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-[#022D68]">Formas de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600 mb-2">Selecione as formas de pagamento aceitas:</p>
            {[
              'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Pix',
              'Vale Refeição', 'Vale Alimentação', 'Outros'
            ].map(method => (
              <div key={method} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`payment-${method}`}
                  checked={currentPaymentMethods.includes(method)}
                  onChange={(e) => {
                    const newMethods = e.target.checked
                      ? [...currentPaymentMethods, method]
                      : currentPaymentMethods.filter(m => m !== method);
                    handlePaymentMethodsChange(newMethods);
                  }}
                  className="h-4 w-4 text-highlight focus:ring-highlight border-gray-300 rounded"
                />
                <Label htmlFor={`payment-${method}`}>{method}</Label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Redes Sociais */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xl text-[#022D68]">Redes Sociais</CardTitle>
            <Button variant="outline" onClick={() => setIsSocialNetworksDialogOpen(true)}>
              Editar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentSocialNetworks.length > 0 ? (
              currentSocialNetworks.map((social, index) => (
                <div key={index} className="flex items-center gap-3 text-gray-700">
                  {social.platform === 'instagram' && <Instagram className="w-5 h-5 text-gray-700" />}
                  {social.platform === 'facebook' && <Facebook className="w-5 h-5 text-gray-700" />}
                  {social.platform === 'website' && <Globe className="w-5 h-5 text-gray-700" />}
                  <a href={social.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {social.platform}: {social.url}
                  </a>
                </div>
              ))
            ) : (
              <p className="text-gray-500">Nenhuma rede social adicionada.</p>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar Alterações
        </Button>
      </form>

      <SocialNetworksDialog
        isOpen={isSocialNetworksDialogOpen}
        onClose={() => setIsSocialNetworksDialogOpen(false)}
        initialSocialNetworks={currentSocialNetworks}
        onSave={handleSocialNetworksSave}
      />
    </div>
  );
}