import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { ArrowLeft, Store, PlusCircle, Eye, EyeOff, Loader2, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { registerRestaurant } from "@/integrations/supabase/edgeFunctions";
import { showError, showSuccess } from "@/utils/toast";
import { formatCEP } from "@/services/geocoding";
import axios from "axios";
import { useAuthData } from "@/context/AuthContext";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { AppleIcon } from "@/components/icons/AppleIcon";
import { registerRestaurantForExistingUser } from "@/integrations/supabase/edgeFunctions";

// Tipagem para a localização única
interface Location {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  phone: string;
}

const initialLocation: Location = {
  cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", phone: ""
};

export default function RestaurantSignup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const { refetchProfile, refetchRestaurant, user, restaurant } = useAuthData();

  // Dados do formulário
  const [restaurantName, setRestaurantName] = useState("");
  const [location, setLocation] = useState<Location>(initialLocation);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);

  const updateLocation = (field: keyof Location, value: string) => {
    setLocation(prev => ({ ...prev, [field]: value }));
  };
  
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCEP(rawValue);
    updateLocation('cep', formattedValue);
  };

  // Efeito para buscar CEP automaticamente
  React.useEffect(() => {
    const cleanedCep = location.cep.replace(/\D/g, '');
    if (cleanedCep.length === 8 && !loading && !isSearchingCep) {
      const fetchViaCEP = async () => {
        setIsSearchingCep(true);
        try {
          const response = await axios.get(`https://viacep.com.br/ws/${cleanedCep}/json/`);
          const data = response.data;

          if (!data.erro) {
            updateLocation('street', data.logradouro || '');
            updateLocation('neighborhood', data.bairro || '');
            updateLocation('city', data.localidade || '');
            updateLocation('state', data.uf || '');
            showSuccess("Endereço preenchido automaticamente!");
          } else {
            showError("CEP não encontrado.");
          }
        } catch (error) {
          showError("Erro ao buscar CEP.");
        } finally {
          setIsSearchingCep(false);
        }
      };
      fetchViaCEP();
    }
  }, [location.cep, loading]);

  // Efeito para registrar restaurante após login social
  React.useEffect(() => {
    if (user && !restaurant && currentStep === totalSteps && !loading) {
      // User is logged in (possibly via social login), but no restaurant is linked yet.
      // And we are on the final step of the form.
      // This is the point to register the restaurant for this user.
      const registerRestaurantAfterSocialLogin = async () => {
        setLoading(true);
        try {
          const payload = {
            restaurantName: restaurantName,
            location: location,
          };
          await registerRestaurantForExistingUser(payload);
          await refetchRestaurant(); // Fetch the newly created restaurant
          showSuccess(`Restaurante cadastrado com sucesso! Redirecionando para o painel.`);
          navigate(createPageUrl('restaurant-area/home'));
        } catch (error) {
          console.error("Error registering restaurant after social login:", error);
          showError("Ocorreu um erro ao registrar o restaurante. Tente novamente.");
          // Optionally, sign out the user if restaurant registration fails
          supabase.auth.signOut();
        } finally {
          setLoading(false);
        }
      };

      // Only proceed if the form data is valid for restaurant registration
      if (restaurantName.trim() && location.street.trim() && location.number.trim()) {
        registerRestaurantAfterSocialLogin();
      }
    }
  }, [user, restaurant, currentStep, totalSteps, loading, restaurantName, location, refetchRestaurant, navigate]);

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!restaurantName.trim()) {
        showError("O nome do restaurante é obrigatório.");
        return false;
      }
    } else if (step === 2) {
      if (
        !location.cep.replace(/\D/g, '').length || 
        !location.street.trim() || 
        !location.number.trim() || 
        !location.city.trim() || 
        !location.state.trim() ||
        !location.phone.trim()
      ) {
        showError("Preencha todos os campos obrigatórios de localização e contato.");
        return false;
      }
    } else if (step === 3) {
      if (!email || !password || !confirmPassword) {
        showError("Preencha todos os campos de acesso.");
        return false;
      }
      if (password.length < 6) {
        showError("A senha deve ter pelo menos 6 caracteres.");
        return false;
      }
      if (password !== confirmPassword) {
        showError("As senhas não coincidem.");
        return false;
      }
      if (!acceptTerms) {
        showError("Você deve aceitar os termos de uso.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + createPageUrl('restaurant-signup'), // Redirect back to this page
        },
      });
      if (error) throw error;
      // The useEffect will handle the restaurant registration after successful login
    } catch (error) {
      const msg = (error as Error).message || "Ocorreu um erro ao fazer login com o provedor social.";
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(totalSteps)) return;

    setLoading(true);
    
    try {
      // 1. Envia todos os dados para a Edge Function para criação segura do usuário e registro do restaurante.
      const payload = {
        restaurantName: restaurantName,
        location: {
          street: location.street,
          number: location.number,
          neighborhood: location.neighborhood,
          city: location.city,
          state: location.state,
          cep: location.cep,
          phone: location.phone
        },
        email,
        password,
      };
      
      const registrationResult = await registerRestaurant(payload as any);
      
      // 2. A Edge Function retornou sucesso. Agora fazemos o login no cliente.
      const { error: signInError } = await supabase.auth.signInWithPassword({ 
        email: registrationResult.email, 
        password: registrationResult.password 
      });

      if (signInError) {
        throw new Error(`Registro concluído, mas falha ao fazer login: ${signInError.message}`);
      }
      
      // 3. Refetch profile data to ensure the restaurant link is recognized
      refetchProfile();
      refetchRestaurant();

      showSuccess(`Restaurante cadastrado! Redirecionando para o painel.`);
      navigate(createPageUrl('restaurant-area/home')); // CORRIGIDO: Redireciona para o Dashboard
      
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error("Signup/Registration error:", error);
      
      if (errorMessage.includes('already been registered') || errorMessage.includes('Usuário já existe')) {
        showError("Este e-mail já está em uso. Por favor, faça login na página de acesso do restaurante.");
        navigate(createPageUrl('restaurant-login'));
      } else {
        showError(errorMessage || "Ocorreu um erro ao criar a conta ou registrar o restaurante.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStepIndicatorClass = (step: number) => {
    return step <= currentStep
      ? "bg-highlight text-white"
      : "bg-gray-200 text-gray-500";
  };

  const getStepTextClass = (step: number) => {
    return step <= currentStep ? "text-primary" : "text-gray-500";
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <label className="flex flex-col">
              <p className="text-primary text-base font-medium mb-2">
                Nome do Restaurante
              </p>
              <Input
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="Ex: Restaurante Sabor Divino"
                className="h-14 rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight text-base shadow-soft-sm"
                required
              />
            </label>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <h3 className="text-primary text-lg font-bold mb-1">
              Localização Principal
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Insira o endereço principal do seu estabelecimento.
            </p>
            
            <div className="space-y-3">
              {/* CEP */}
              <div className="relative">
                <Input
                  value={location.cep}
                  onChange={handleCepChange}
                  placeholder="CEP (Ex: 58039-000)"
                  className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight pr-12 shadow-soft-sm"
                  maxLength={9}
                  disabled={isSearchingCep}
                  required
                />
                {isSearchingCep && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-highlight" />
                )}
              </div>

              {/* Rua */}
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-highlight shrink-0" />
                <Input
                  value={location.street}
                  onChange={(e) => updateLocation('street', e.target.value)}
                  placeholder="Rua / Avenida"
                  className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight shadow-soft-sm"
                  required
                />
              </div>

              {/* Número */}
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 text-highlight shrink-0 text-center font-bold text-sm">#</span>
                <Input
                  value={location.number}
                  onChange={(e) => updateLocation('number', e.target.value)}
                  placeholder="Número"
                  className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight shadow-soft-sm"
                  required
                />
              </div>
              
              {/* Complemento */}
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 text-highlight shrink-0 text-center font-bold text-sm">C</span>
                <Input
                  value={location.complement}
                  onChange={(e) => updateLocation('complement', e.target.value)}
                  placeholder="Complemento (Ex: Sala 101, Bloco B)"
                  className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight shadow-soft-sm"
                />
              </div>

              {/* Bairro */}
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 text-highlight shrink-0 text-center font-bold text-sm">B</span>
                <Input
                  value={location.neighborhood}
                  onChange={(e) => updateLocation('neighborhood', e.target.value)}
                  placeholder="Bairro"
                  className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight shadow-soft-sm"
                  required
                />
              </div>

              {/* Cidade e Estado */}
              <div className="flex gap-3">
                <Input
                  value={location.city}
                  onChange={(e) => updateLocation('city', e.target.value)}
                  placeholder="Cidade"
                  className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight shadow-soft-sm"
                  required
                />
                <Input
                  value={location.state}
                  onChange={(e) => updateLocation('state', e.target.value)}
                  placeholder="Estado (UF)"
                  className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight w-20 shrink-0 shadow-soft-sm"
                  maxLength={2}
                  required
                />
              </div>

              {/* Telefone */}
              <div className="flex items-center gap-2 pt-2">
                <Phone className="w-5 h-5 text-highlight shrink-0" />
                <Input
                  value={location.phone}
                  onChange={(e) => updateLocation('phone', e.target.value)}
                  placeholder="Telefone de contato (obrigatório)"
                  className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight shadow-soft-sm"
                  required
                />
              </div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Social Login Buttons */}
            <Button
              type="button"
              onClick={() => handleSocialLogin('google')}
              variant="channel"
              className="flex w-full items-center justify-center rounded-xl h-12 gap-2 text-base font-bold shadow-soft-sm"
              disabled={loading}
            >
              <GoogleIcon className="h-5 w-5" />
              <span className="truncate">Continuar com Google</span>
            </Button>
            <Button
              type="button"
              onClick={() => handleSocialLogin('apple')}
              className="flex w-full items-center justify-center rounded-xl h-12 gap-2 text-base font-bold shadow-soft-sm bg-black text-white hover:bg-black/90"
              disabled={loading}
            >
              <AppleIcon className="h-5 w-5 fill-current" />
              <span className="truncate">Continuar com Apple</span>
            </Button>

            <div className="relative flex items-center justify-center py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  ou
                </span>
              </div>
            </div>

            <label className="flex flex-col">
              <p className="text-primary text-base font-medium mb-2">Email de Acesso</p>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu email"
                className="h-14 rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight text-base shadow-soft-sm"
                required
              />
            </label>
            
            <div className="relative">
              <p className="text-primary text-base font-medium mb-2">Senha</p>
              <Input
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crie uma senha (mínimo 6 caracteres)"
                className="h-14 pr-12 rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight text-base shadow-soft-sm"
                required
                minLength={6}
              />
              <button
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-primary transition-colors mt-7"
                type="button"
              >
                {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            <div className="relative">
              <p className="text-primary text-base font-medium mb-2">
                Confirmar Senha
              </p>
              <Input
                type={passwordVisible ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme sua senha"
                className="h-14 pr-12 rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight text-base shadow-soft-sm"
                required
              />
              <button
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-primary transition-colors mt-7"
                type="button"
              >
                {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="flex items-start pt-4">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(!!checked)}
                className="border-gray-400 mt-1 data-[state=checked]:bg-highlight data-[state=checked]:text-white"
              />
              <label className="ml-2 text-sm text-gray-600 leading-relaxed" htmlFor="terms">
                Concordo com os{" "}
                <Link to={createPageUrl('legal')} className="font-bold text-highlight hover:underline">
                  termos de uso
                </Link>{" "}
                e{" "}
                <Link to={createPageUrl('legal')} className="font-bold text-highlight hover:underline">
                  política de privacidade
                </Link>
                .
              </label>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background-light flex flex-col items-center">
      {/* Header */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-soft-md w-full max-w-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (currentStep > 1) {
              handleBack();
            } else {
              navigate(createPageUrl('restaurant-area-hub'));
            }
          }}
          className="text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-primary text-xl font-bold">Cadastro</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 px-4 py-6 w-full max-w-sm mx-auto flex flex-col justify-center">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center justify-center size-20 bg-primary/10 rounded-xl mx-auto mb-4">
            <Store className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-primary tracking-tight text-3xl font-bold leading-tight">
            Cadastrar Restaurante
          </h1>
          <p className="text-gray-600 text-base mt-1">
            Preencha os dados do seu estabelecimento em 3 passos.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 px-4">
          <div className="p-0 flex justify-between items-center">
            <div className="flex-1 flex flex-col items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors duration-300 ${getStepIndicatorClass(1)}`}>
                1
              </div>
              <p className={`text-xs mt-1 font-medium text-center ${getStepTextClass(1)}`}>
                Básico
              </p>
            </div>
            <div className="flex-1 border-t-2 border-gray-300 mx-2"></div>
            <div className="flex-1 flex flex-col items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors duration-300 ${getStepIndicatorClass(2)}`}>
                2
              </div>
              <p className={`text-xs mt-1 text-center ${getStepTextClass(2)}`}>
                Localização
              </p>
            </div>
            <div className="flex-1 border-t-2 border-gray-300 mx-2"></div>
            <div className="flex-1 flex flex-col items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors duration-300 ${getStepIndicatorClass(3)}`}>
                3
              </div>
              <p className={`text-xs mt-1 text-center ${getStepTextClass(3)}`}>
                Acesso
              </p>
            </div>
          </div>
        </div>

        {/* Step Forms Container */}
        <Card className="shadow-soft-xl border-none rounded-2xl">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </CardContent>
          
          {/* Navigation Buttons */}
          <CardFooter className="flex-col items-stretch p-6 pt-4 space-y-4">
            <div className="flex justify-between gap-4">
              {currentStep > 1 && (
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-primary text-primary font-bold rounded-xl hover:bg-primary/5"
                >
                  Voltar
                </Button>
              )}
              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={loading}
                  variant="highlight"
                  className={`flex-1 h-12 rounded-xl text-lg font-bold ${currentStep === 1 ? 'w-full' : ''}`}
                >
                  {currentStep === 2 ? "Salvar e Continuar" : "Próximo"}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  variant="highlight"
                  className="flex-1 h-12 rounded-xl text-lg font-bold shadow-highlight-glow"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Cadastrar Restaurante"
                  )}
                </Button>
              )}
            </div>
            <p className="text-center text-sm text-gray-600">
              Já possui cadastro?{" "}
              <Link
                to={createPageUrl('restaurant-login')}
                className="font-bold text-highlight hover:underline"
              >
                Fazer login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}