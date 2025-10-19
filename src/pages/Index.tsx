import { MadeWithDyad } from "@/components/made-with-dyad";
import { PromoteToAdminButton } from "@/components/admin/PromoteToAdminButton";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { mockLoginWithRole, mockLogout } from "@/utils/auth-mock";
import { AppRole } from "@/hooks/useUserRole";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loadingMock, setLoadingMock] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  const handleSignOut = async () => {
    await mockLogout();
    navigate('/auth');
  };

  const handleMockLogin = async (role: AppRole) => {
    setLoadingMock(true);
    try {
      await mockLoginWithRole(role);
      showSuccess(`Login simulado como ${role} realizado com sucesso!`);
      // Força o refresh do estado do usuário
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      
      if (role === 'free_restaurant' || role === 'premium_restaurant') {
        navigate('/restaurant-dashboard');
      } else if (role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/search-restaurants');
      }
    } catch (error) {
      showError(`Falha no login mock: ${(error as Error).message}`);
    } finally {
      setLoadingMock(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="text-center max-w-md w-full">
        <h1 className="text-4xl font-bold mb-4 text-[#022D68]">Bem-vindo ao FilterFood</h1>
        <p className="text-xl text-gray-600 mb-8">
          Você está logado como: {user?.email || 'Convidado'}
        </p>
        
        {user ? (
          <div className="space-y-4">
            <Button 
              onClick={() => navigate('/search-restaurants')}
              className="w-full bg-[#E47948] hover:bg-[#E47948]/90 text-white font-bold h-12 text-lg rounded-full"
            >
              Buscar Restaurantes
            </Button>
            <Button 
              onClick={() => navigate('/admin/dashboard')}
              variant="outline"
              className="w-full border-2 border-[#022D68] text-[#022D68] hover:bg-[#022D68]/5 font-bold h-12 text-lg rounded-full"
            >
              Acessar Painel Admin
            </Button>
            <Button 
              onClick={handleSignOut}
              variant="ghost"
              className="w-full text-red-600 hover:bg-red-50 font-bold h-12 text-lg rounded-full"
            >
              Sair
            </Button>
            <PromoteToAdminButton />
          </div>
        ) : (
          <div className="space-y-4">
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full bg-[#E47948] hover:bg-[#E47948]/90 text-white font-bold h-12 text-lg rounded-full"
            >
              Fazer Login
            </Button>

            {/* Botões de Login Mock para Teste */}
            <div className="pt-4 border-t border-gray-200 mt-4 space-y-2">
              <p className="text-sm text-gray-500 font-semibold">Logins de Teste Rápido:</p>
              <Button 
                onClick={() => handleMockLogin('free_restaurant')}
                disabled={loadingMock}
                variant="secondary"
                className="w-full bg-blue-100 text-blue-800 hover:bg-blue-200"
              >
                {loadingMock ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login como Restaurante FREE"}
              </Button>
              <Button 
                onClick={() => handleMockLogin('premium_restaurant')}
                disabled={loadingMock}
                variant="secondary"
                className="w-full bg-green-100 text-green-800 hover:bg-green-200"
              >
                {loadingMock ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login como Restaurante PREMIUM"}
              </Button>
              <Button 
                onClick={() => handleMockLogin('admin')}
                disabled={loadingMock}
                variant="secondary"
                className="w-full bg-purple-100 text-purple-800 hover:bg-purple-200"
              >
                {loadingMock ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login como ADMIN"}
              </Button>
            </div>
          </div>
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;