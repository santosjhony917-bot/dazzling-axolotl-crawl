import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { Loader2, Utensils, ArrowLeft, MapPin, Phone, DollarSign, Clock } from 'lucide-react';
import { createPageUrl } from '@/utils/url';
import { showError, showSuccess } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Mock de categorias
const mockCategories = [
  'Italiana', 'Japonesa', 'Brasileira', 'Mexicana', 'Vegetariana', 'Fast Food', 'Gourmet'
];

// Mock de horários de funcionamento
const initialOpeningHours = {
  monday: { open: '09:00', close: '22:00', isClosed: false },
  tuesday: { open: '09:00', close: '22:00', isClosed: false },
  wednesday: { open: '09:00', close: '22:00', isClosed: false },
  thursday: { open: '09:00', close: '22:00', isClosed: false },
  friday: { open: '09:00', close: '23:00', isClosed: false },
  saturday: { open: '10:00', close: '23:00', isClosed: false },
  sunday: { open: '10:00', close: '22:00', isClosed: false },
};

export default function RestaurantSignup() {
  const navigate = useNavigate();
  const { session, isLoading: isAuthLoading, refetchProfile } = useAuthContext();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Owner/Auth Info
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Step 2: Restaurant Details
  const [restaurantName, setRestaurantName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');

  // Step 3: Location and Hours
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [cep, setCep] = useState('');
  const [openingHours, setOpeningHours] = useState(initialOpeningHours);
  
  // Mock de geolocalização (para simplificar)
  const mockLatitude = -23.5505;
  const mockLongitude = -46.6333;

  // Redireciona se já estiver logado
  useEffect(() => {
    if (session) {
      // Se já logado, verifica se tem restaurante. Se sim, vai para o dashboard. Se não, vai para o hub.
      // A lógica de verificação de restaurante é complexa aqui, então redirecionamos para o hub para decidir.
      navigate(createPageUrl('restaurantAreaHub'));
    }
  }, [session, navigate]);

  const handleNext = () => {
    if (step === 1) {
      if (!firstName || !lastName || !email || !password) {
        showError('Preencha todos os campos de informações pessoais.');
        return;
      }
    } else if (step === 2) {
      if (!restaurantName || !category || !phone) {
        showError('Preencha todos os campos de detalhes do restaurante.');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleOpeningHoursChange = (day: keyof typeof initialOpeningHours, field: 'open' | 'close' | 'isClosed', value: string | boolean) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) return;

    if (!address || !cep) {
      showError('Preencha o endereço e CEP.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Criar usuário (Auth)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            user_role: 'restaurant', // Define o papel do usuário
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          showError("Este e-mail já está em uso. Por favor, faça login na página de acesso do restaurante.");
          navigate(createPageUrl('restaurant-login'));
        } else {
          throw authError;
        }
        return;
      }

      const userId = authData.user?.id;
      if (!userId) throw new Error("Falha ao obter ID do usuário após o cadastro.");

      // 2. Criar o registro do Restaurante (Database)
      const { error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          user_id: userId,
          name: restaurantName,
          description: description,
          category: category,
          phone: phone,
          address: address,
          number: number,
          cep: cep,
          latitude: mockLatitude,
          longitude: mockLongitude,
          opening_hours: openingHours,
          plan: 'free', // Começa no plano gratuito
        });

      if (restaurantError) throw restaurantError;

      showSuccess(`Restaurante cadastrado! Redirecionando para o painel.`);
      navigate(createPageUrl('restaurant-area/dashboard')); // CORRIGIDO: Redireciona para o Dashboard

    } catch (error) {
      console.error('Signup error:', error);
      showError(`Falha no cadastro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-primary">1. Informações do Proprietário</h2>
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail (Login)</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 rounded-xl" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-primary">2. Detalhes do Restaurante</h2>
            <div className="space-y-2">
              <Label htmlFor="restaurantName">Nome do Restaurante</Label>
              <Input id="restaurantName" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} required className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição Curta</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que torna seu restaurante especial?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria Principal</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {mockCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone de Contato</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="h-12 rounded-xl" />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-primary">3. Localização e Horário</h2>
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" value={cep} onChange={(e) => setCep(e.target.value)} required className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Número</Label>
              <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} className="h-12 rounded-xl" />
            </div>

            <Separator className="my-6" />
            
            <h3 className="text-lg font-semibold text-primary flex items-center">
              <Clock className="w-5 h-5 mr-2" /> Horário de Funcionamento
            </h3>
            
            {Object.entries(openingHours).map(([day, hours]) => (
              <div key={day} className="flex items-center space-x-2">
                <span className="w-20 capitalize text-sm font-medium text-gray-700">
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </span>
                <input
                  type="checkbox"
                  checked={hours.isClosed}
                  onChange={(e) => handleOpeningHoursChange(day as keyof typeof initialOpeningHours, 'isClosed', e.target.checked)}
                  className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <Label className="text-sm mr-2">Fechado</Label>
                
                <Input
                  type="time"
                  value={hours.open}
                  onChange={(e) => handleOpeningHoursChange(day as keyof typeof initialOpeningHours, 'open', e.target.value)}
                  disabled={hours.isClosed}
                  className={cn("h-10 rounded-lg text-center", hours.isClosed && "bg-gray-100")}
                />
                <span className="text-gray-500">-</span>
                <Input
                  type="time"
                  value={hours.close}
                  onChange={(e) => handleOpeningHoursChange(day as keyof typeof initialOpeningHours, 'close', e.target.value)}
                  disabled={hours.isClosed}
                  className={cn("h-10 rounded-lg text-center", hours.isClosed && "bg-gray-100")}
                />
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 p-4">
      
      {/* Header de Navegação */}
      <header className="flex items-center bg-white p-4 pb-2 justify-start sticky top-0 z-20 shadow-soft-md w-full max-w-md absolute top-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={step > 1 ? handleBack : () => navigate(createPageUrl('restaurantAreaHub'))}
          className="text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-primary text-xl font-bold ml-4">Cadastro de Restaurante</h2>
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-md pt-20">
        {/* Progresso */}
        <div className="flex justify-between mb-6 w-full max-w-sm mx-auto">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors duration-300",
                s === step ? "bg-highlight text-white" : s < step ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
              )}>
                {s}
              </div>
              <span className="text-xs mt-1 text-gray-600">Passo {s}</span>
            </div>
          ))}
        </div>

        {/* Card Principal */}
        <Card className="bg-white rounded-2xl shadow-soft-xl p-6">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {renderStep()}
            
            <div className="flex justify-between pt-4">
              {step > 1 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleBack}
                  className="h-12 rounded-xl w-1/3 border-primary text-primary hover:bg-primary/5"
                >
                  Voltar
                </Button>
              )}
              
              {step < 3 ? (
                <Button 
                  type="button" 
                  onClick={handleNext}
                  className={cn("h-12 rounded-xl", step === 1 ? "w-full" : "w-2/3 ml-auto")}
                >
                  Próximo
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  className={cn("h-12 rounded-xl bg-highlight hover:bg-highlight/90 shadow-highlight-glow", step === 1 ? "w-full" : "w-2/3 ml-auto")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Finalizar Cadastro'
                  )}
                </Button>
              )}
            </div>
          </form>

          <Separator className="my-6" />

          <div className="text-center text-sm">
            <p className="text-gray-600">
              Já tem uma conta de restaurante?
              <Link
                to={createPageUrl('restaurant-login')}
                className="font-bold text-highlight hover:underline ml-1"
              >
                Fazer Login
              </Link>
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}