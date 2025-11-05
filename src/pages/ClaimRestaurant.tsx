"use client";

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';

const ClaimRestaurant = () => {
  const [claimCode, setClaimCode] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthChange = async (event: string, session: any) => {
      if (event === 'SIGNED_IN') {
        const storedClaimCode = localStorage.getItem('claimCode');
        if (storedClaimCode && session?.user) {
          setIsLoading(true);
          try {
            const { error: functionError } = await supabase.functions.invoke('claim-restaurant', {
              body: { claimCode: storedClaimCode },
            });

            if (functionError) {
              throw functionError;
            }

            toast({
              title: 'Restaurante reivindicado com sucesso!',
              description: 'Você agora gerencia este perfil.',
            });
            localStorage.removeItem('claimCode');
            navigate('/restaurant-area/dashboard');
          } catch (e: any) {
            toast({
              variant: 'destructive',
              title: 'Erro ao reivindicar restaurante',
              description: e.message || 'Por favor, tente novamente.',
            });
          } finally {
            setIsLoading(false);
          }
        }
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthChange(event, session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimCode) {
        setError('Por favor, insira um código de acesso.');
        return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const { data: restaurant, error: dbError } = await supabase
        .from('restaurants')
        .select('id, user_id')
        .eq('claim_code', claimCode.toUpperCase())
        .single();

      if (dbError || !restaurant) {
        throw new Error('Código de acesso inválido ou não encontrado.');
      }

      if (restaurant.user_id) {
        throw new Error('Este restaurante já foi reivindicado.');
      }

      localStorage.setItem('claimCode', claimCode.toUpperCase());
      setIsCodeVerified(true);
    } catch (e: any) {
      setError(e.message);
      toast({
        variant: 'destructive',
        title: 'Erro na verificação',
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="p-4 border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Reivindicar</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto p-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full bg-white p-6 md:p-8 rounded-xl shadow-lg"
        >
          <div className="mx-auto mb-6 flex justify-center">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Reivindicar Restaurante
          </h2>
          
          {!isCodeVerified ? (
            <>
              <p className="text-gray-600 mb-6">
                Use o código de acesso de 8 caracteres para liberar seu perfil.
              </p>
              <form onSubmit={handleVerifyCode} className="space-y-4 text-left">
                <div>
                  <Label htmlFor="claim-code">Código de Acesso</Label>
                  <Input
                    id="claim-code"
                    placeholder="Insira o código aqui"
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value)}
                    required
                    disabled={isLoading}
                    maxLength={8}
                    className="uppercase"
                  />
                  <p className="text-xs text-gray-500 mt-1">O código de 8 caracteres fornecido a você.</p>
                </div>
                {error && <p className="text-sm text-red-500 text-center pt-2">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading || !claimCode}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verificar Código'}
                </Button>
              </form>
            </>
          ) : (
            <div className="mt-6">
              <p className="text-gray-600 mb-6">
                Código verificado! Agora, crie sua conta ou faça login para continuar.
              </p>
              <Auth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }}
                providers={['google', 'apple']}
                theme="light"
                localization={{
                  variables: {
                    sign_up: {
                      email_label: 'Seu e-mail',
                      password_label: 'Crie uma senha',
                      button_label: 'Criar conta',
                      social_provider_text: 'Entrar com {{provider}}',
                      link_text: 'Já tem uma conta? Faça login',
                    },
                    sign_in: {
                        email_label: 'Seu e-mail',
                        password_label: 'Sua senha',
                        button_label: 'Entrar',
                        social_provider_text: 'Entrar com {{provider}}',
                        link_text: 'Não tem uma conta? Crie uma',
                    }
                  },
                }}
              />
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default ClaimRestaurant;