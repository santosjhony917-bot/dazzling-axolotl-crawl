import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const AuthPage = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Redirect if user is already logged in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/find-restaurants');
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuthAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const authFunction = isSignUp ? supabase.auth.signUp : supabase.auth.signInWithPassword;
    
    const { error } = await authFunction({ email, password });

    if (error) {
      showError(error.message);
    } else if (isSignUp) {
      showSuccess('Cadastro realizado! Verifique seu e-mail para confirmar sua conta.');
      setIsSignUp(false); // Switch back to login view
    }
    // On successful login, the onAuthStateChange listener will handle the redirect.
    
    setLoading(false);
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) {
      showError(error.message);
    }
    setLoading(false);
  };

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);

  return (
    <div className="bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col justify-center items-center p-4">
      <header className="flex flex-col items-center justify-center pt-16 pb-6 w-full max-w-sm">
        <img 
          alt="FilterFood logo" 
          className="w-36 h-auto drop-shadow-md" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaPbXmzvKkbF2Pc_SLWOOR5kIgogIIMYMAkCwUoWS563947iWScJV79Q3cKk8gIMBuOGqZE9gcpBUNkNYytQ5Q3ARQT1kbsJfGWFRoqFSxAvBuKWkqm3K8uEV6RJY8dPeGlpFDNsD4CAPfS-uV-nqQiWsPY3u4TqjuIYxlkPjUDvFsn5mFz5TVbtCvE6YyyE_0cJqXduk10h9zn6AAv-Sgvp20z2iyDCrnk-1ExzxOaSt1WUI0EDvNLnI9kW-JylHQYF6UBMiVaCDf"
        />
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-sm">
        <h1 className="text-[#022D68] tracking-tight text-4xl font-extrabold leading-tight text-center pb-2">
          {isSignUp ? 'Crie sua conta' : 'Acesse rápido'}
        </h1>
        <p className="text-gray-600 text-lg font-medium leading-normal pb-8 text-center">
          {isSignUp ? 'Junte-se a nós!' : 'Seu acesso aos melhores pratos!'}
        </p>

        <form onSubmit={handleAuthAction} className="space-y-4 p-6 bg-white rounded-xl shadow-xl">
          <div className="relative">
            <Input 
              className="w-full rounded-lg text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#E47948]/50 border-2 border-gray-200 bg-white h-14 placeholder:text-gray-400 p-4 text-base font-normal" 
              placeholder="E-mail" 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="relative">
            <Input 
              className="w-full rounded-lg text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#E47948]/50 border-2 border-gray-200 bg-white h-14 placeholder:text-gray-400 p-4 text-base font-normal pr-12" 
              placeholder="Senha" 
              type={passwordVisible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button 
              type="button" 
              className="text-gray-500 absolute inset-y-0 right-0 flex items-center justify-center pr-4 hover:text-[#E47948] transition-colors" 
              onClick={togglePasswordVisibility}
            >
              {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          
          <div className="mt-6 space-y-4">
            <Button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#E47948] text-white font-bold py-3.5 h-auto rounded-lg shadow-lg shadow-[#E47948]/50 hover:bg-[#E47948]/90 transition-colors text-lg"
            >
              {loading ? 'Aguarde...' : (isSignUp ? 'Cadastrar' : 'Entrar')}
            </Button>

            <div className="flex flex-col gap-3 pt-2">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-full border-t border-gray-300"></div>
                <span className="bg-white px-3 text-sm text-gray-500 z-10">ou</span>
              </div>
              
              <Button type="button" onClick={() => handleOAuthLogin('google')} variant="outline" className="w-full h-auto py-3.5 text-base font-semibold shadow-sm" disabled={loading}>
                <img alt="Google logo" className="w-5 h-5 mr-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHCwDd1qyknEolrO2aZiuyydN8N4wurGMGDy8v6xoXGLQ22jYf9FQQUMZk-5853NzvK3Kw_3ETaqGsE3AN2ebGniXdw-9nXGctNa9H-qjeLzlMqi7Nq7vY590IvUWRZTkmKfkncfU43c-Srn-ZMWFZhyNw9OCkHGuHTId5iziQyDmTuBSUEXOQaTn6eko8u6E_Jv617JSWhjGnu1cElM-AtVNDmhK87f2h6SexYYavDOOtmCwbtx1hcguIBVIuyDOO-uYggeLEADrV"/>
                Continuar com Google
              </Button>
              <Button type="button" onClick={() => handleOAuthLogin('apple')} variant="outline" className="w-full h-auto py-3.5 text-base font-semibold shadow-sm" disabled={loading}>
                <img alt="Apple logo" className="w-5 h-5 mr-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAa9zdce7JX7qyLE7MHZRDCLDEypMrIjmncBj3OiT_MdRjRrxVaNINNOOOcQnSDTCqggqCs6eCt52KyasKj78zJmXWjH5oLdXhuWtgPh4uvovHvjmHIaQu_LHNxvbkiE-hxUsRupgVQ5swPjWl27wJ4vADpyS2L7Pq_IKi8ld7dcR_Es1mW2d5-U8IQD5hAhQJPdwVY2_QAzh9QvDDWa-TN7Xa4Y8Umm0KGS7Fvmr2RAdvFtvB9Zp8QgiL5O5a15v_c6CjzH7ldm9_H"/>
                Continuar com Apple
              </Button>
            </div>
            
            <p className="pt-4 text-center text-base text-gray-600">
              {isSignUp ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-bold text-[#E47948] hover:underline ml-1"
              >
                {isSignUp ? 'Fazer login' : 'Cadastrar-se'}
              </button>
            </p>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AuthPage;