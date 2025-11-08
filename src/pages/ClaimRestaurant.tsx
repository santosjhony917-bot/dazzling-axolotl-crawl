"use client";

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, KeyRound, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils/url';

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

  // Custom theme for Supabase Auth component to match app's highlight color and styles
  const customAuthTheme = {
    ...ThemeSupa,
    default: {
      ...ThemeSupa.default,
      colors: {
        ...ThemeSupa.default.colors,
        brand: '#E47948', // Primary button background (highlight)
        brandAccent: '#FFFFFF', // Primary button text (white)
        textLink: '#E47948', // Links (highlight)
        inputBackground: 'hsl(var(--background))', // White background for inputs
        inputBorder: 'hsl(var(--border))', // Border color for inputs (gray-200 equivalent)
        inputBorderHover: '#E47948', // Highlight on input hover
        inputBorderFocus: '#E47948', // Highlight on input focus
        inputPlaceholder: 'hsl(var(--muted-foreground))', // Placeholder text color
        
        // Social button styling to match variant="channel"
        socialButtonBackground: '#FFFFFF', // White background
        socialButtonText: 'hsl(var(--primary))', // text-primary
        socialButtonBorder: 'hsl(var(--border))', // border-gray-200
        socialButtonBorderHover: 'hsl(var(--border))', // border-gray-200 on hover
        socialButtonBackgroundHover: 'hsl(var(--secondary))', // bg-gray-50 equivalent
      },
      radii: {
        ...ThemeSupa.default.radii,
        borderRadiusButton: '1.25rem', // rounded-xl (20px)
        borderRadiusInput: '1.25rem', // rounded-xl (20px)
      },
      // Custom styles for specific elements to match shadcn/ui components
      variables: { // Accessing nested variables for styling
        ...ThemeSupa.default.variables,
        button: {
          ...ThemeSupa.default.variables.button,
          fontWeight: '700', // font-bold
          fontSize: '1rem', // text-base
          padding: '0.75rem 1.5rem', // Adjust padding to get closer to h-12 (48px)
          boxShadow: '0 8px 20px rgba(204, 102, 64, 0.4)', // shadow-highlight-glow (approximate)
        },
        input: {
          ...ThemeSupa.default.variables.input,
          fontSize: '1rem', // text-base
          padding: '1rem 1rem', // Adjust padding to get closer to h-14 (56px)
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.02)', // shadow-soft-sm (approximate)
        },
        anchor: {
          ...ThemeSupa.default.variables.anchor,
          fontWeight: '500', // font-medium
          fontSize: '0.875rem', // text-sm
        },
        label: {
          ...ThemeSupa.default.variables.label,
          fontWeight: '500', // font-medium
          fontSize: '0.875rem', // text-sm
          color: 'hsl(var(--primary))', // text-primary
        },
        message: { // For error messages
          ...ThemeSupa.default.variables.message,
          color: '#EF4444', // text-red-500
          fontSize: '0.875rem', // text-sm
        },
        divider: { // For the 'or' separator
          ...ThemeSupa.default.variables.divider,
          color: 'hsl(var(--border))', // border-gray-200
          background: 'hsl(var(--background))', // bg-white
          fontSize: '0.75rem', // text-xs
          textTransform: 'uppercase',
          fontWeight: 'normal',
          padding: '0 0.5rem', // px-2
        }
      }
    },
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-background-light p-4 font-sans antialiased">
      <header className="flex items-center bg-white p-4 pb-2 justify-start sticky top-0 z-20 shadow-soft-md w-full max-w-md absolute top-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-primary text-xl font-bold ml-4">Reivindicar Perfil</h2>
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-sm pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="flex flex-col items-center justify-center pb-6 w-full max-w-sm mx-auto text-center">
            <div className="flex items-center justify-center size-16 bg-primary/10 rounded-xl mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-primary tracking-tight text-3xl font-bold leading-tight">
              Reivindicar Restaurante
            </h1>
            <p className="text-text-secondary text-base mt-1">
              Use o código de acesso para liberar seu perfil.
            </p>
          </div>

          <Card className="w-full shadow-soft-xl border-none rounded-2xl">
            <CardContent className="p-6 pt-4">
              {!isCodeVerified ? (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <Label htmlFor="claim-code" className="font-medium text-primary">Código de Acesso</Label>
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
                  <Button 
                    type="submit" 
                    variant="highlight" 
                    className="flex w-full items-center justify-center rounded-xl h-12 gap-1 text-base font-bold shadow-highlight-glow transition-all hover:shadow-soft-xl" 
                    disabled={isLoading || !claimCode}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verificar Código'}
                    {!isLoading && <ArrowRight className="w-5 h-5" />}
                  </Button>
                </form>
              ) : (
                <div className="mt-6">
                  <p className="text-text-secondary mb-6">
                    Código verificado! Agora, crie sua conta ou faça login para continuar.
                  </p>
                  <Auth
                    supabaseClient={supabase}
                    appearance={{ theme: customAuthTheme }} // Using the custom theme
                    providers={['google', 'apple']}
                    theme="light"
                    socialLayout="vertical" // Ensure social buttons take full width
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
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <footer className="w-full max-w-md mx-auto py-6">
        <div className="flex justify-center items-center gap-6">
          <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Termos</Link>
          <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Privacidade (LGPD)</Link>
        </div>
      </footer>
    </div>
  );
};

export default ClaimRestaurant;