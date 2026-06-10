"use client";

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { AppleIcon } from '@/components/icons/AppleIcon';
import { useAuthData } from '@/context/AuthContext';

interface FormProps {
  onSwitch: () => void;
}

const CustomSignUpForm = ({ onSwitch }: FormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);

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

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      toast({
        title: 'Verifique seu e-mail',
        description: 'Enviamos um link de confirmação para o seu e-mail.',
      });
    } catch (signUpError: any) {
      setError(signUpError.message);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar conta',
        description: signUpError.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + '/restaurant-area/claim',
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e.message);
      toast({
        variant: 'destructive',
        title: 'Erro no login social',
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4 text-left pt-4">
      <Button
        type="button"
        onClick={() => handleSocialLogin('google')}
        variant="channel"
        className="flex w-full items-center justify-center rounded-2xl h-12 gap-2 text-base font-bold shadow-soft"
        disabled={isLoading}
      >
        <GoogleIcon className="h-5 w-5 shrink-0" />
        <span className="truncate">Criar conta com Google</span>
      </Button>
      <Button
        type="button"
        onClick={() => handleSocialLogin('apple')}
        variant="channel"
        className="flex w-full items-center justify-center rounded-2xl h-12 gap-2 text-base font-bold shadow-soft"
        disabled={isLoading}
      >
        <AppleIcon className="h-6 w-6 text-black dark:text-white shrink-0" />
        <span className="truncate">Criar conta com Apple</span>
      </Button>

      <div className="relative flex items-center justify-center py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">ou</span>
        </div>
      </div>

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
          className="h-14 text-base shadow-none !rounded-2xl"
        />
      </div>
      <div>
        <Label htmlFor="password-signup" className="font-semibold text-primary text-left !mb-2">Crie uma senha</Label>
        <div className="relative">
          <Input
            id="password-signup"
            type={passwordVisible ? "text" : "password"}
            placeholder="Crie uma senha segura"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="h-14 text-base pr-12 shadow-none !rounded-2xl"
          />
          <button
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-primary transition-colors"
            type="button"
          >
            {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>
      <div>
        <Label htmlFor="confirm-password-signup" className="font-semibold text-primary text-left !mb-2">Confirme sua senha</Label>
        <div className="relative">
          <Input
            id="confirm-password-signup"
            type={passwordVisible ? "text" : "password"}
            placeholder="Digite sua senha novamente"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            className="h-14 text-base pr-12 shadow-none !rounded-2xl"
          />
          <button
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-primary transition-colors"
            type="button"
          >
            {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-500 text-center pt-2">{error}</p>}
      <Button type="submit" variant="highlight" className="w-full h-12 text-base font-bold" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Criar conta'}
      </Button>

      <p className="pt-6 text-center text-base text-gray-600">
        Já possui cadastro?
        <button
          type="button"
          onClick={onSwitch}
          className="font-bold text-highlight hover:underline ml-1"
          disabled={isLoading}
        >
          Fazer login
        </button>
      </p>
    </form>
  );
};

const CustomSignInForm = ({ onSwitch }: FormProps) => {
  const { signInWithMock } = useAuthData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === 'premium@restaurante.com' || cleanEmail === 'free@restaurante.com' || cleanEmail === 'admin@restaurante.com') {
      if (signInWithMock) {
        const success = signInWithMock(cleanEmail);
        if (success) {
          toast({
            title: 'Sucesso',
            description: 'Login de teste realizado com sucesso!',
          });
          setIsLoading(false);
          return;
        }
      }
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      
      toast({
        title: 'Sucesso',
        description: 'Login realizado com sucesso!',
      });
    } catch (e: any) {
      setError(e.message);
      toast({
        variant: 'destructive',
        title: 'Erro no login',
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + '/restaurant-area/claim',
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e.message);
      toast({
        variant: 'destructive',
        title: 'Erro no login social',
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-4 text-left pt-4">
      <Button
        type="button"
        onClick={() => handleSocialLogin('google')}
        variant="channel"
        className="flex w-full items-center justify-center rounded-2xl h-12 gap-2 text-base font-bold shadow-soft"
        disabled={isLoading}
      >
        <GoogleIcon className="h-5 w-5 shrink-0" />
        <span className="truncate">Entrar com Google</span>
      </Button>
      <Button
        type="button"
        onClick={() => handleSocialLogin('apple')}
        variant="channel"
        className="flex w-full items-center justify-center rounded-2xl h-12 gap-2 text-base font-bold shadow-soft"
        disabled={isLoading}
      >
        <AppleIcon className="h-6 w-6 text-black dark:text-white shrink-0" />
        <span className="truncate">Entrar com Apple</span>
      </Button>

      <div className="relative flex items-center justify-center py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">ou</span>
        </div>
      </div>

      <div>
        <Label htmlFor="email-signin" className="font-semibold text-primary text-left !mb-2">Seu e-mail</Label>
        <Input
          id="email-signin"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className="h-14 text-base shadow-none !rounded-2xl"
        />
      </div>
      <div>
        <Label htmlFor="password-signin" className="font-semibold text-primary text-left !mb-2">Sua senha</Label>
        <div className="relative">
          <Input
            id="password-signin"
            type={passwordVisible ? "text" : "password"}
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="h-14 text-base pr-12 shadow-none !rounded-2xl"
          />
          <button
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-primary transition-colors"
            type="button"
          >
            {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-500 text-center pt-2">{error}</p>}
      <Button type="submit" variant="highlight" className="w-full h-12 text-base font-bold" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
      </Button>

      <p className="pt-6 text-center text-base text-gray-600">
        Não tem uma conta?
        <button
          type="button"
          onClick={onSwitch}
          className="font-bold text-highlight hover:underline ml-1"
          disabled={isLoading}
        >
          Crie uma agora
        </button>
      </p>
    </form>
  );
};

const CustomAuth = () => {
  const [mode, setMode] = useState<'sign_up' | 'sign_in'>('sign_up');

  return (
    <div className="w-full">
      {mode === 'sign_up' ? (
        <CustomSignUpForm onSwitch={() => setMode('sign_in')} />
      ) : (
        <CustomSignInForm onSwitch={() => setMode('sign_up')} />
      )}
    </div>
  );
};

export default CustomAuth;