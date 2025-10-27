import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { Loader2, Utensils, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils/url';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function RestaurantLogin() {
  const navigate = useNavigate();
  const { session, isLoading: isAuthLoading, refetchProfile, userProfile } = useAuthContext();
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redireciona se já estiver logado E for um restaurante
  useEffect(() => {
    if (session && userProfile?.user_role === 'restaurant') {
      // CORRIGIDO: Redirecionar para a rota do Dashboard do restaurante
      navigate(createPageUrl("restaurant-area/dashboard"));
    }
  }, [session, navigate, userProfile]);

  // Lida com a mudança de estado de autenticação (para erros e sucesso)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        refetchProfile(); 
        // O redirecionamento final é tratado pelo useEffect acima, após o profile ser carregado
      }
    });

    return () => subscription.unsubscribe();
  }, [refetchProfile]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        showError(error.message);
      } else {
        showSuccess("Login realizado com sucesso! Carregando painel...");
        // Redirecionamento será tratado pelo useEffect
      }
    } catch (error) {
      showError("Ocorreu um erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 p-4">
      
      {/* Header de Navegação (Apenas botão de voltar) */}
      <header className="flex items-center bg-white p-4 pb-2 justify-start sticky top-0 z-20 shadow-soft-md w-full max-w-md absolute top-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('restaurantAreaHub'))}
          className="text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-primary text-xl font-bold ml-4">Acesso Restaurante</h2>
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-md pt-20">
        {/* Bloco de Conteúdo Superior (Ícone e Título) */}
        <div className="flex flex-col items-center justify-center pb-6 w-full max-w-sm mx-auto text-center">
          <div className="flex items-center justify-center size-16 bg-primary/10 rounded-xl mx-auto mb-4">
            <Utensils className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-primary tracking-tight text-3xl font-bold leading-tight">
            Acesso ao Painel
          </h1>
          <p className="text-gray-600 text-base mt-1">
            Entre com suas credenciais de restaurante.
          </p>
        </div>

        {/* Card Principal */}
        <Card className="bg-white rounded-2xl shadow-soft-xl p-6">
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@restaurante.com"
                required
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12 rounded-xl"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-highlight hover:bg-highlight/90 shadow-highlight-glow"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Entrar no Painel'
              )}
            </Button>
          </form>

          <Separator className="my-6" />

          <div className="text-center text-sm">
            <p className="text-gray-600">
              Não tem um restaurante cadastrado?
              <Link
                  to={createPageUrl('restaurant-signup')}
                  className="font-bold text-highlight hover:underline ml-1"
              >
                  Cadastre-se aqui
              </Link>
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}