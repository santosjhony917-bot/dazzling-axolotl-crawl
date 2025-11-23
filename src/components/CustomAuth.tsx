"use client";

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { AppleIcon } from '@/components/icons/AppleIcon';

const CustomSignUpForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + '/restaurant-area/dashboard',
        },
      });
      if (error) throw error;
    } catch (error) {
      const msg = (error as Error).message || "Ocorreu um erro ao fazer login com o provedor social.";
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'As senhas não coincidem.',
      });
      return;
    }
    setError(null);
    setIsLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar conta',
        description: signUpError.message,
      });
    } else {
      toast({
        title: 'Verifique seu e-mail',
        description: 'Enviamos um link de confirmação para o seu e-mail.',
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialLogin('google')}
          className="w-full h-12 rounded-xl border-gray-200 shadow-soft-sm hover:bg-gray-50"
          disabled={isLoading}
        >
          <GoogleIcon className="h-5 w-5 mr-2" />
          Google
        </Button>
        <Button
          type="button"
          onClick={() => handleSocialLogin('apple')}
          className="w-full h-12 rounded-xl shadow-soft-sm bg-black text-white hover:bg-black/90"
          disabled={isLoading}
        >
          <AppleIcon className="h-5 w-5 mr-2 fill-current" />
          Apple
        </Button>
      </div>

      <div className="relative flex items-center justify-center py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">
            ou continue com email
          </span>
        </div>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4 text-left">
        <div>
          <Label htmlFor="email-signup" className="font-semibold text-primary text-left !mb-2">Seu e-mail</Label>
          <Input
            id="email-signup"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="h-14 text-base shadow-soft-sm !rounded-xl"
          />
        </div>
        <div>
          <Label htmlFor="password-signup" className="font-semibold text-primary text-left !mb-2">Crie uma senha</Label>
          <Input
            id="password-signup"
            type="password"
            placeholder="Crie uma senha segura"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="h-14 text-base shadow-soft-sm !rounded-xl"
          />
        </div>
        <div>
          <Label htmlFor="confirm-password-signup" className="font-semibold text-primary text-left !mb-2">Confirme sua senha</Label>
          <Input
            id="confirm-password-signup"
            type="password"
            placeholder="Digite sua senha novamente"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            className="h-14 text-base shadow-soft-sm !rounded-xl"
          />
        </div>
        {error && <p className="text-sm text-red-500 text-center pt-2">{error}</p>}
        <Button type="submit" variant="highlight" className="w-full h-12 text-base" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Criar conta'}
        </Button>
      </form>
    </div>
  );
};

interface CustomAuthProps {
  defaultTab?: string;
  hideLogin?: boolean;
}

const CustomAuth = ({ defaultTab = "signup", hideLogin = false }: CustomAuthProps) => {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      {!hideLogin && (
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signup">Criar Conta</TabsTrigger>
          <TabsTrigger value="signin">Entrar</TabsTrigger>
        </TabsList>
      )}
      <TabsContent value="signup">
        <CustomSignUpForm />
      </TabsContent>
      <TabsContent value="signin">
        <div className="pt-4">
          <Auth
            supabaseClient={supabase}
            view="sign_in"
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#E47948', brandAccent: '#E47948', brandButtonText: 'white',
                    defaultButtonBackground: 'white', defaultButtonBackgroundHover: '#f2f2f2',
                    defaultButtonBorder: '#e5e7eb', defaultButtonText: '#1f2937',
                    inputBorder: '#e5e7eb', inputBorderHover: '#E47948', inputBorderFocus: '#E47948',
                    anchorTextColor: '#022D68', anchorTextHoverColor: '#E47948',
                  },
                  radii: { borderRadiusButton: '12px', inputBorderRadius: '12px' },
                },
              },
              className: {
                button: 'h-12 text-base shadow-soft-sm !rounded-xl',
                input: 'h-14 text-base shadow-soft-sm !rounded-xl',
                label: 'font-semibold text-primary text-left !mb-2',
                divider: '!bg-gray-200',
                message: 'hidden',
                container: '!pt-0 !pb-0'
              },
            }}
            providers={['google', 'apple']}
            theme="light"
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Seu e-mail', password_label: 'Sua senha',
                  email_input_placeholder: 'seu@email.com', password_input_placeholder: 'Digite sua senha',
                  button_label: 'Entrar', social_provider_text: 'Entrar com {{provider}}',
                },
                forgotten_password: {
                  link_text: 'Esqueceu sua senha?', email_label: 'Seu e-mail',
                  email_input_placeholder: 'seu@email.com', button_label: 'Enviar instruções',
                }
              },
            }}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default CustomAuth;