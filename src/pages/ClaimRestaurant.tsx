import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Utensils, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createPageUrl } from '@/utils/url';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

export default function ClaimRestaurant() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);

  const handleClaim = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (password !== confirmPassword) {
      showError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      // 1. Attempt to sign up/register the user with the provided email/password
      // We use signUp here because claiming usually involves setting a password for an existing entry.
      // In a real scenario, this would be an RPC call to verify the code and update the user/restaurant ownership.
      
      // Mocking the claim process:
      // 1. Check if the access code is valid (RPC call to Supabase)
      // 2. If valid, create/update the user account (using email/password)
      // 3. Assign the user_id to the restaurant linked to the access code.
      
      // Since we don't have the RPC for claiming, we simulate a successful registration/claim.
      
      // For now, we'll just sign up the user and show a success message.
      const { data, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
      });

      if (signUpError) {
        // If user already exists, try to sign them in
        if (signUpError.message.includes('already exists')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
        } else {
          throw signUpError;
        }
      }

      // Simulate successful claim and role assignment
      showSuccess("Restaurante reivindicado com sucesso! Redirecionando para o Dashboard.");
      
      // In a real app, the backend would handle the role assignment (e.g., 'premium_restaurant')
      // For now, we redirect to the dashboard.
      setTimeout(() => {
        navigate(createPageUrl('restaurant-dashboard'));
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
      
      {/* Botão Voltar */}
      <div className="absolute top-4 left-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(createPageUrl('restaurant-area'))}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </div>

      <header className="flex flex-col items-center justify-center pt-16 pb-6 w-full max-w-sm">
        <div className="w-36 h-auto drop-shadow-md">
          <Utensils className="w-12 h-12 text-[#022D68] mx-auto" />
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-sm">
        <Card className="w-full shadow-xl border-none rounded-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-[#022D68] tracking-tight text-4xl font-bold leading-tight">
              Reivindicar Restaurante
            </CardTitle>
            <CardDescription className="text-gray-600 text-lg font-medium leading-normal pt-2">
              Use o código de acesso fornecido pela FilterFood.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleClaim} className="space-y-4">
              
              {/* Código de Acesso */}
              <div>
                <label htmlFor="access-code" className="text-[#022D68] text-base font-medium leading-normal pb-2 block">Código de Acesso</label>
                <Input
                  id="access-code"
                  className="h-14 text-base rounded-full"
                  placeholder="Insira o código aqui"
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  disabled={loading}
                  required
                />
                <p className="text-gray-500 text-sm pt-1 pl-4">Este código é único para o seu estabelecimento.</p>
              </div>

              {/* E-mail */}
              <div>
                <label htmlFor="email" className="text-[#022D68] text-base font-medium leading-normal pb-2 block">E-mail</label>
                <Input
                  id="email"
                  className="h-14 text-base rounded-full"
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
                    className="h-14 text-base pr-12 rounded-full"
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
                    className="h-14 text-base pr-12 rounded-full"
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
                className="w-full bg-[#E47948] text-white font-bold h-12 text-lg hover:bg-[#E47948]/90 rounded-full shadow-lg shadow-[#E47948]/50 mt-6"
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
                className="font-bold text-[#022D68] hover:underline ml-1"
              >
                Fazer login
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto py-6">
        <div className="flex justify-center items-center gap-6">
          <p className="text-gray-500 text-sm font-medium">Termos</p>
          <p className="text-gray-500 text-sm font-medium">Privacidade (LGPD)</p>
        </div>
      </footer>
    </div>
  );
}