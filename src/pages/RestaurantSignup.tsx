import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { ArrowLeft, Store, PlusCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import LocationCard from "@/components/restaurant/LocationCard";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

// Tipagem para a localização
interface Location {
  id: number;
  cep: string;
  street: string;
  number: string;
  complement: string; // Novo campo
  neighborhood: string;
  city: string;
  state: string;
  phone: string;
}

export default function RestaurantSignup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Dados do formulário
  const [restaurantName, setRestaurantName] = useState("");
  const [locations, setLocations] = useState<Location[]>([
    { id: 1, cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", phone: "" }
  ]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);

  const addLocation = () => {
    const newId = Math.max(...locations.map(l => l.id), 0) + 1;
    setLocations([...locations, { id: newId, cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", phone: "" }]);
  };

  const removeLocation = (id: number) => {
    setLocations(locations.filter(loc => loc.id !== id));
  };

  const updateLocation = (id: number, field: keyof Location, value: string) => {
    setLocations(prevLocations => prevLocations.map(loc => 
      loc.id === id ? { ...loc, [field]: value } : loc
    ));
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!restaurantName.trim()) {
        showError("O nome do restaurante é obrigatório.");
        return false;
      }
    } else if (step === 2) {
      const invalidLocation = locations.find(loc => 
        !loc.cep.replace(/\D/g, '').length || 
        !loc.street.trim() || 
        !loc.number.trim() || 
        !loc.city.trim() || 
        !loc.state.trim() ||
        !loc.phone.trim()
      );
      
      if (locations.length === 0) {
        showError("Pelo menos uma filial é obrigatória.");
        return false;
      }
      
      if (invalidLocation) {
        showError("Preencha todos os campos obrigatórios (CEP, Rua, Número, Cidade, Estado, Telefone) para todas as filiais.");
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

  const handleSubmit = async () => {
    if (!validateStep(totalSteps)) return;

    setLoading(true);
    
    try {
      // 1. Sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email, 
        password,
        options: {
          data: {
            full_name: restaurantName,
          },
        }
      });

      if (signUpError) {
        // Se o erro for que o usuário já existe, tentamos fazer login
        if (signUpError.message.includes('already exists')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
          
          showSuccess("Usuário já cadastrado. Login realizado com sucesso!");
          navigate(createPageUrl('restaurant-area/profile-menu')); // Redireciona para o perfil se o login for bem-sucedido
          return;
        }
        throw signUpError;
      }
      
      // 2. Se o cadastro for bem-sucedido, informamos o usuário para verificar o e-mail
      showSuccess("Conta criada! Verifique seu e-mail para confirmar e prossiga para o login.");
      navigate(createPageUrl('restaurant-login'));
      
    } catch (error) {
      console.error("Signup error:", error);
      showError((error as Error).message || "Ocorreu um erro ao criar a conta.");
    } finally {
      setLoading(false);
    }
  };

  const getStepIndicatorClass = (step: number) => {
    return step <= currentStep
      ? "bg-[#E47948] text-white"
      : "bg-gray-200 text-gray-500";
  };

  const getStepTextClass = (step: number) => {
    return step <= currentStep ? "text-[#022D68]" : "text-gray-500";
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
              <p className="text-[#022D68] text-base font-medium mb-2">
                Nome do Restaurante
              </p>
              <Input
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="Ex: Restaurante Sabor Divino"
                className="h-14 rounded-full border-gray-200 focus:border-[#E47948] focus:ring-[#E47948] text-base"
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
            <div className="mb-4">
              <h3 className="text-[#022D68] text-lg font-bold mb-1">
                Localização e Contato
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Adicione e gerencie as filiais do seu restaurante.
              </p>
              <div className="space-y-4">
                {locations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    onUpdate={updateLocation}
                    onRemove={removeLocation}
                  />
                ))}
              </div>
              <Button
                onClick={addLocation}
                variant="outline"
                className="w-full mt-6 h-12 border-2 border-[#022D68] text-[#022D68] hover:bg-[#022D68]/5 rounded-full font-bold"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Adicionar Nova Filial
              </Button>
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
            <label className="flex flex-col">
              <p className="text-[#022D68] text-base font-medium mb-2">Email de Acesso</p>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu email"
                className="h-14 rounded-full border-gray-200 focus:border-[#E47948] focus:ring-[#E47948] text-base"
                required
              />
            </label>
            
            <div className="relative">
              <p className="text-[#022D68] text-base font-medium mb-2">Senha</p>
              <Input
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crie uma senha (mínimo 6 caracteres)"
                className="h-14 pr-12 rounded-full border-gray-200 focus:border-[#E47948] focus:ring-[#E47948] text-base"
                required
                minLength={6}
              />
              <button
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-[#022D68] transition-colors mt-7"
                type="button"
              >
                {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            <div className="relative">
              <p className="text-[#022D68] text-base font-medium mb-2">
                Confirmar Senha
              </p>
              <Input
                type={passwordVisible ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme sua senha"
                className="h-14 pr-12 rounded-full border-gray-200 focus:border-[#E47948] focus:ring-[#E47948] text-base"
                required
              />
              <button
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-[#022D68] transition-colors mt-7"
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
                className="border-gray-400 mt-1 data-[state=checked]:bg-[#E47948] data-[state=checked]:text-white"
              />
              <label className="ml-2 text-sm text-gray-600 leading-relaxed" htmlFor="terms">
                Concordo com os{" "}
                <a className="font-bold text-[#E47948] hover:underline" href="#">
                  termos de uso
                </a>{" "}
                e{" "}
                <a className="font-bold text-[#E47948] hover:underline" href="#">
                  política de privacidade
                </a>
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
    <div className="min-h-screen bg-[#f5f7f8] flex flex-col">
      {/* Header */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('restaurant-area'))}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-[#022D68] text-xl font-bold">Cadastro</h2>
        </div>
        <div className="w-10"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 w-full max-w-md mx-auto">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center justify-center size-16 bg-[#022D68]/10 rounded-full mx-auto mb-4">
            <Store className="w-8 h-8 text-[#022D68]" />
          </div>
          <h1 className="text-[#022D68] tracking-tight text-3xl font-bold leading-tight">
            Cadastrar Restaurante
          </h1>
          <p className="text-gray-600 text-base mt-1">
            Preencha os dados do seu estabelecimento em 3 passos.
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 shadow-lg border-none rounded-xl p-4">
          <CardContent className="p-0 flex justify-between items-center">
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
          </CardContent>
        </Card>

        {/* Step Forms Container */}
        <Card className="shadow-xl border-none rounded-xl p-6">
          <CardContent className="p-0">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="pt-8 pb-4 space-y-4">
          <div className="flex justify-between gap-4">
            {currentStep > 1 && (
              <Button
                onClick={handleBack}
                variant="outline"
                className="flex-1 h-12 border-2 border-[#022D68] text-[#022D68] font-bold rounded-full hover:bg-[#022D68]/5"
              >
                Voltar
              </Button>
            )}
            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={loading}
                className={`flex-1 h-12 bg-[#E47948] hover:bg-[#E47948]/90 text-white font-bold rounded-full text-lg ${currentStep === 1 ? 'w-full' : ''}`}
              >
                {currentStep === 2 ? "Salvar e Continuar" : "Próximo"}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 h-12 bg-[#022D68] hover:bg-[#022D68]/90 text-white font-bold rounded-full text-lg"
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
              className="font-bold text-[#E47948] hover:underline"
            >
              Fazer login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}