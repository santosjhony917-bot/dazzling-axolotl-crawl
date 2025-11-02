import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Utensils, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { createPageUrl } from '@/utils/url';
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/hooks/useAuth"; // Importar useAuth
import { claimRestaurant } from "@/integrations/supabase/edgeFunctions"; // Importar claimRestaurant

export default function ClaimRestaurant() {
  const navigate = useNavigate();
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [accessCode, setAccessCode] = useState(restaurantId || ""); // Adicionado, inicializa com restaurantId se disponível
  const [confirmPassword, setConfirmPassword] = useState(""); // Adicionado
  const { refetchProfile, refetchRestaurant } = useAuth(); // Usar o hook useAuth para obter as funções de refetch

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);

  const handleClaim = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 6) {
        showError('A senha deve ter pelo menos 6 caracteres.');
        setLoading(false);
        return;
    }

    try {
      // 1. Call the Edge Function to claim the restaurant and create the user
      const registrationResult = await claimRestaurant({
        accessCode,
        email,
        password,
      });

      // 2. Log the user in using the credentials returned by the Edge Function
      const { error: signInError } = await supabase.auth.signInWithPassword({ 
        email: registrationResult.email, 
        password: registrationResult.password 
      });

      if (signInError) {
        throw new Error(`Reivindicação concluída, mas falha ao fazer login: ${signInError.message}`);
      }
      
      // 3. Refetch profile data to ensure the restaurant link is recognized
      refetchProfile();
      refetchRestaurant();

      showSuccess("Restaurante reivindicado com sucesso! Redirecionando para o Dashboard.");
      
      setTimeout(() => {
        navigate(createPageUrl('restaurant-area/home'));
      }, 1000);

    } catch (error) {
      console.error("Claim error:", error);
      showError((error as Error).message || "Falha ao reivindicar o restaurante. Verifique o código e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col justify-center items-center p-4">
      
      {/* Header */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-soft-md w-full max-w-md absolute top-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('restaurant-area-hub'))}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-[#022D68] text-xl font-bold">Reivindicar</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-sm pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {/* Icon and Title */}
          <div className="flex flex-col items-center justify-center pb-6 w-full max-w-sm mx-auto text-center">
            <div className="flex items-center justify-center size-16 bg-[#E47948]/10 rounded-xl mx-auto mb-4">
              <Utensils className="w-8 h-8 text-[#E47948]" />
            </div>
            <h1 className="text-[#022D68] tracking-tight text-3xl font-bold leading-tight">
              Reivindicar Restaurante
            </h1>
            <p className="text-gray-600 text-base mt-1">
              Use o código de acesso fornecido pela FilterFood.
            </p>
          </div>

          <Card className="w-full shadow-soft-xl border-none rounded-2xl">
            <CardContent className="p-6 pt-4">
              <form onSubmit={handleClaim} className="space-y-4">
                
                {/* Código de Acesso */}
                <div>
                  <label htmlFor="access-code" className="text-[#022D68] text-base font-medium leading-normal pb-2 block">Código de Acesso (ID do Restaurante)</label>
                  <Input
                    id="access-code"
                    className="h-14 text-base rounded-xl border-gray-200 focus:border-[#E47948] focus:ring-[#E47948] shadow-soft-sm"
                    placeholder="Insira o código aqui (UUID)"
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <p className="text-gray-500 text-sm pt-1 pl-4">Este código é o ID único do seu estabelecimento.</p>
                </div>

                {/* E-mail */}
                <div>
                  <label htmlFor="email" className="text-[#022D68] text-base font-medium leading-normal pb-2 block">E-mail</label>
                  <Input
                    id="email"
                    className="h-14 text-base rounded-xl border-gray-200 focus:border-[#E47948] focus:ring-[#E47948] shadow-soft-sm"
                    placeholder="seuemail@exemplo.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                {/* Senha */}
                <div>
                  <label htmlFor="password" className="text-[#022D68] text-base font-medium leading-normal pb-2 block">Senha</label>
                  <div className="relative">
                    <Input
                      id="password"
                      className="h-14 text-base pr-12 rounded-xl border-gray-200 focus:border-[#E47948] focus:ring-[#E47948] shadow-soft-sm"
                      placeholder="Crie uma senha"
                      type={passwordVisible ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <button
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-[#022D68] transition-colors"
                      type="button"
                    >
                      {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Senha */}
                <div>
                  <label htmlFor="confirm-password" className="text-[#022D68] text-base font-medium leading-normal pb-2 block">Confirmar Senha</label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      className="h-14 text-base pr-12 rounded-xl border-gray-200 focus:border-[#E47948] focus:ring-[#E47948] shadow-soft-sm"
                      placeholder="Confirme sua senha"
                      type={passwordVisible ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <button
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-[#022D68] transition-colors"
                      type="button"
                    >
                      {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  variant="highlight"
                  className="w-full font-bold h-12 text-lg shadow-highlight-glow mt-6"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Reivindicar Restaurante"
                  )}
                </Button>
              </form>

              <p className="pt-6 text-center text-base text-gray-600">
                Já tem uma conta?
                <Link
                  to={createPageUrl('restaurant-login')}
                  className="font-bold text-[#E47948] hover:underline ml-1"
                >
                  Fazer login
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto py-6">
        <div className="flex justify-center items-center gap-6">
          <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Termos</Link>
          <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Privacidade (LGPD)</Link>
        </div>
      </footer>
    </div>
  );
}