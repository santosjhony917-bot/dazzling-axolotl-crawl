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
import CustomAuth from '@/components/CustomAuth';
import { useAuth } from '@/hooks/useAuth';

const ClaimRestaurant = () => {
  const [claimCode, setClaimCode] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { restaurant, isAuthenticated } = useAuth();

  useEffect(() => {
    // Redirect if user is authenticated and has a restaurant
    if (isAuthenticated && restaurant) {
      toast({
        title: 'Restaurante reivindicado com sucesso!',
        description: 'Você agora gerencia este perfil.',
      });
      navigate('/restaurant-area/dashboard');
    }
  }, [isAuthenticated, restaurant, navigate, toast]);

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
              <CustomAuth />
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default ClaimRestaurant;