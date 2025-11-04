import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/integrations/supabase/client";
import { Github, Mail } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppleIcon from "@/components/icons/AppleIcon";

const Auth = () => {
  const supabase = createClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate("/");
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Bem-vindo</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Faça login para continuar</p>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <Button
            type="button"
            onClick={() => handleSocialLogin('google')}
            variant="outline"
            className="w-full"
          >
            <Mail className="w-5 h-5 mr-2" /> Google
          </Button>
          <Button
            type="button"
            onClick={() => handleSocialLogin('github')}
            variant="outline"
            className="w-full"
          >
            <Github className="w-5 h-5 mr-2" /> GitHub
          </Button>
          <Button
            type="button"
            onClick={() => handleSocialLogin('apple')}
            variant="outline"
            className="w-full"
          >
            <AppleIcon className="w-5 h-5 mr-2" /> Apple
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 bg-white text-muted-foreground dark:bg-gray-800">
              Ou continue com
            </span>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full">Entrar</Button>
        </form>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          Não tem uma conta?{' '}
          <Button variant="link" className="p-0" onClick={() => navigate('/signup')}>
            Cadastre-se
          </Button>
        </p>
      </div>
    </div>
  );
};

export default Auth;