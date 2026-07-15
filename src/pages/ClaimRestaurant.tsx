"use client";

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import CustomAuth from '@/components/CustomAuth';
import { useAuthData } from '@/context/AuthContext';
import Header from '@/components/Header';
import PhoneShell from '@/components/layout/PhoneShell';

const ClaimRestaurant = () => {
  const [claimCode, setClaimCode] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { restaurant, isAuthenticated } = useAuthData();

  useEffect(() => {
    // Redirect if user is authenticated and has a restaurant
    if (isAuthenticated && restaurant) {
      toast({
        title: 'Restaurante reivindicado com sucesso!',
        description: 'Você agora gerencia este perfil.',
      });
      navigate('/home');
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
      const normalizedCode = claimCode.trim().toUpperCase();
      if (!/^[A-Z0-9]{8}$/.test(normalizedCode)) {
        throw new Error('O código deve ter exatamente 8 letras ou números.');
      }

      // A validade e a disponibilidade do código são verificadas somente pelo Edge
      // Function autenticado `claim-restaurant`. Consultar `restaurants.claim_code`
      // no navegador exporia um segredo operacional e deixa de funcionar com o RLS.
      localStorage.setItem('claimCode', normalizedCode);
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
    <PhoneShell shellClassName="relative font-sans antialiased flex flex-col bg-[#FAFAFA]">
      <Header 
        title={<span className="text-lg font-semibold tracking-tight text-[#3C2F2F]">Reivindicar perfil</span>} 
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(-1) }} 
        sticky={false}
      />

      <main className="flex-grow flex flex-col justify-center w-full px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="w-full rounded-[24px] border border-slate-100/80 bg-white p-5 text-center shadow-soft">
            <div className="flex items-center justify-center size-12 bg-highlight/10 rounded-2xl mx-auto mb-4">
              <KeyRound className="w-6 h-6 text-highlight" />
            </div>
            <h2 className="text-[22px] font-semibold text-[#3C2F2F] mb-2 leading-tight">
              Reivindicar Restaurante
            </h2>
            
            {!isCodeVerified ? (
              <>
                <p className="text-text-secondary mb-5 text-center text-sm leading-relaxed">
                  Use o código de acesso de 8 caracteres para liberar seu perfil.
                </p>
                <form onSubmit={handleVerifyCode} className="space-y-4 text-left">
                  <div>
                    <Label htmlFor="claim-code" className="font-semibold text-primary">Código de Acesso</Label>
                    <Input
                      id="claim-code"
                      aria-describedby="claim-code-help"
                      placeholder="INSIRA O CÓDIGO"
                      value={claimCode}
                      onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                      required
                      disabled={isLoading}
                      maxLength={8}
                      className="uppercase h-12 text-[15px] rounded-2xl border-slate-200/80 focus:border-highlight focus:ring-highlight shadow-none tracking-widest text-center mt-2"
                    />
                    <p id="claim-code-help" className="text-xs text-gray-500 mt-2">O código de 8 caracteres fornecido a você.</p>
                  </div>
                  {error && <p className="text-sm text-red-500 text-center pt-2">{error}</p>}
                  <Button type="submit" variant="highlight" className="w-full h-12 rounded-2xl text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2" disabled={isLoading || !claimCode}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verificar Código'}
                  </Button>
                </form>
              </>
            ) : (
              <div className="mt-5">
                <p className="text-text-secondary mb-5 text-center text-sm leading-relaxed">
                  Código recebido. Crie sua conta ou faça login para validá-lo com segurança e assumir o perfil.
                </p>
                <CustomAuth />
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </PhoneShell>
  );
}

export default ClaimRestaurant;
