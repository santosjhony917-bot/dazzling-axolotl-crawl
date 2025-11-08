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
import { ArrowLeft, Loader2, KeyRound } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col bg-background-light">
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-soft-md w-full max-w-md mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-primary text-xl font-bold">Reivindicar Perfil</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto p-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full bg-white p-6 md:p-8 rounded-2xl shadow-soft-xl border-none"
        >
          <div className="flex items-center justify-center size-16 bg-highlight/10 rounded-xl mx-auto mb-6">
            <KeyRound className="w-8 h-8 text-highlight" />
          </div>
          <h2 className="text-2xl font-bold text-primary mb-2">
            Reivindicar Restaurante
          </h2>
          
          {!isCodeVerified ? (
            <>
              <p className="text-text-secondary mb-6">
                Use o código de acesso de 8 caracteres para liberar seu perfil.
              </p>
              <form onSubmit={handleVerifyCode} className="space-y-4 text-left">
                <div>
                  <Label htmlFor="claim-code" className="font-semibold text-primary">Código de Acesso</Label>
                  <Input
                    id="claim-code"
                    placeholder="INSIRA O CÓDIGO"
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                    required
                    disabled={isLoading}
                    maxLength={8}
                    className="uppercase h-14 text-base rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight shadow-soft-sm tracking-widest text-center"
                  />
                  <p className="text-xs text-gray-500 mt-1">O código de 8 caracteres fornecido a você.</p>
                </div>
                {error && <p className="text-sm text-red-500 text-center pt-2">{error}</p>}
                <Button type="submit" variant="highlight" className="w-full h-12 text-base" disabled={isLoading || !claimCode}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verificar Código'}
                </Button>
              </form>
            </>
          ) : (
            <div className="mt-6">
              <p className="text-text-secondary mb-6">
                Código verificado! Agora, crie sua conta ou faça login para continuar.
              </p>
              <Auth
                supabaseClient={supabase}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: '#E47948',
                        brandAccent: '#E47948',
                        brandButtonText: 'white',
                        defaultButtonBackground: 'white',
                        defaultButtonBackgroundHover: '#f2f2f2',
                        defaultButtonBorder: '#e5e7eb',
                        defaultButtonText: '#1f2937',
                        inputBorder: '#e5e7eb',
                        inputBorderHover: '#E47948',
                        inputBorderFocus: '#E47948',
                        anchorTextColor: '#022D68',
                        anchorTextHoverColor: '#E47948',
                      },
                      radii: {
                        borderRadiusButton: '12px',
                        inputBorderRadius: '12px',
                      },
                    },
                  },
                  className: {
                    button: 'h-12 text-base shadow-soft-sm',
                    input: 'h-14 text-base shadow-soft-sm',
                    label: 'font-semibold text-primary text-left !mb-2',
                    divider: '!bg-gray-200',
                  },
                }}
                providers={['google', 'apple']}
                theme="light"
                localization={{
                  variables: {
                    sign_up: {
                      email_label: 'Seu e-mail',
                      password_label: 'Crie uma senha',
                      email_input_placeholder: 'seu@email.com',
                      password_input_placeholder: 'Crie uma senha segura',
                      button_label: 'Criar conta',
                      social_provider_text: 'Entrar com {{provider}}',
                      link_text: 'Já tem uma conta? Faça login',
                    },
                    sign_in: {
                        email_label: 'Seu e-mail',
                        password_label: 'Sua senha',
                        email_input_placeholder: 'seu@email.com',
                        password_input_placeholder: 'Digite sua senha',
                        button_label: 'Entrar',
                        social_provider_text: 'Entrar com {{provider}}',
                        link_text: 'Não tem uma conta? Crie uma',
                    },
                    forgotten_password: {
                      link_text: 'Esqueceu sua senha?',
                      email_label: 'Seu e-mail',
                      email_input_placeholder: 'seu@email.com',
                      button_label: 'Enviar instruções de recuperação',
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