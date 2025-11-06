import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Location, Mail, Lock, ArrowRight, Chrome, Apple } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Card, CardContent, CardFooter, CardHeader } from '../components/ui/card';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast'; // Assuming react-hot-toast is installed

function RestaurantLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/restaurant-area/dashboard'); // Redirect authenticated users
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error.message);
      toast.error(error.message);
    } else {
      toast.success('Login successful!');
      // Redirect handled by useEffect
    }
    setLoading(false);
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + '/restaurant-area/dashboard', // Or a specific redirect for restaurant owners
      },
    });
    if (error) {
      console.error('Social login error:', error.message);
      toast.error(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="flex flex-col items-center">
          <div className="inline-block rounded-full bg-white p-3 shadow-sm mb-4">
            <Location className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-center text-3xl font-bold text-gray-800">Acesse sua conta</h1>
          <p className="mt-2 text-center text-sm text-gray-600">Gerencie seu restaurante!</p>
        </div>

        <Card className="mx-auto max-w-sm rounded-lg shadow-lg">
          <CardHeader className="space-y-4 p-6">
            <div className="grid gap-4">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => handleSocialLogin('google')}
                disabled={loading}
              >
                <Chrome className="h-5 w-5" />
                Continuar com Google
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => handleSocialLogin('apple')}
                disabled={loading}
              >
                <Apple className="h-5 w-5" />
                Continuar com Apple
              </Button>
            </div>

            <div className="relative flex items-center py-5">
              <Separator className="flex-grow" />
              <span className="mx-4 text-sm text-gray-400">OU</span>
              <Separator className="flex-grow" />
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 p-6 pt-0">
            <form onSubmit={handleLogin}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2 mt-4">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full mt-6 bg-[#E47948] hover:bg-[#D46938] text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2"
                disabled={loading}
              >
                Entrar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 p-6 pt-0">
            <a href="#" className="text-sm text-[#E47948] hover:underline">
              Esqueceu sua senha?
            </a>
            <div className="text-center text-sm text-gray-600">
              Não tem uma conta?{' '}
              <a href="#" className="text-[#E47948] hover:underline">
                Crie uma agora
              </a>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

export default RestaurantLogin;