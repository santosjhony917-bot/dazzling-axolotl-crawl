import { MadeWithDyad } from "@/components/made-with-dyad";
import { PromoteToAdminButton } from "@/components/admin/PromoteToAdminButton";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="text-center max-w-md w-full">
        <h1 className="text-4xl font-bold mb-4 text-[#022D68]">Bem-vindo ao FilterFood</h1>
        <p className="text-xl text-gray-600 mb-8">
          Você está logado como: {user?.email || 'Convidado'}
        </p>
        
        {user && (
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
        )}
        
        {!user && (
          <Button 
            onClick={() => navigate('/auth')}
            className="w-full bg-[#E47948] hover:bg-[#E47948]/90 text-white font-bold h-12 text-lg rounded-full"
          >
            Fazer Login
          </Button>
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;