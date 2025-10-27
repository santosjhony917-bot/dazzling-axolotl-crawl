import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';
import { Utensils, PlusCircle, LogOut, ArrowLeft } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Página Hub para usuários que se identificaram como 'restaurante' mas ainda não têm um restaurante associado.
 * Permite criar um novo restaurante ou fazer logout.
 */
export default function RestaurantAreaHub() {
  const navigate = useNavigate();
  const { refetchProfile } = useAuthContext();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      refetchProfile();
      navigate(createPageUrl('welcome'));
    } catch (error) {
      console.error('Logout error:', error);
      showError('Falha ao sair. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 p-4">
      
      {/* Header de Navegação */}
      <header className="flex items-center bg-white p-4 pb-2 justify-start sticky top-0 z-20 shadow-soft-md w-full max-w-md absolute top-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('welcome'))}
          className="text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-primary text-xl font-bold ml-4">Área do Restaurante</h2>
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-md pt-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Bem-vindo(a)!</h1>
          <p className="text-gray-600">Gerencie seu restaurante ou crie um novo perfil.</p>
        </div>

        <div className="space-y-4">
          
          {/* Opção 1: Cadastrar Novo Restaurante */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-primary/10"
            onClick={() => navigate(createPageUrl('restaurant-signup'))}
          >
            <CardContent className="p-6 flex items-center">
              <PlusCircle className="w-8 h-8 text-highlight mr-4" />
              <div>
                <h2 className="text-lg font-semibold text-primary">Cadastrar Novo Restaurante</h2>
                <p className="text-sm text-gray-500">Comece a gerenciar seu negócio no FilterFood.</p>
              </div>
            </CardContent>
          </Card>

          {/* Opção 2: Fazer Login (se já tiver conta) */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-primary/10"
            onClick={() => navigate(createPageUrl('restaurant-login'))}
          >
            <CardContent className="p-6 flex items-center">
              <Utensils className="w-8 h-8 text-primary mr-4" />
              <div>
                <h2 className="text-lg font-semibold text-primary">Acessar Painel Existente</h2>
                <p className="text-sm text-gray-500">Já tem um restaurante cadastrado? Faça login.</p>
              </div>
            </CardContent>
          </Card>

          {/* Opção 3: Logout */}
          <Button
            variant="outline"
            className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50 mt-6"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sair da Conta
          </Button>
        </div>
      </main>
    </div>
  );
}