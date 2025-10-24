import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Utensils, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createPageUrl } from '@/utils/url';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import { Separator } from '@/components/ui/separator';
import MenuCategoryList from '@/components/restaurant/MenuCategoryList';

export default function RestaurantProfileMenu() {
  const navigate = useNavigate();
  const { restaurant, loading, error } = useRestaurantProfile();

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={`Erro ao carregar o perfil: ${error}`} />;
  }
  
  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto p-4">
        <header className="sticky top-0 z-20 bg-white shadow-sm p-4 flex items-center justify-between mb-6 rounded-xl">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('restaurant-area/home'))}
            className="text-[#022D68] hover:bg-[#022D68]/5"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-bold text-[#022D68] flex-1 text-center pr-10 truncate">
            Gerenciar Cardápio
          </h1>
          <div className="w-10"></div>
        </header>
        <Card className="shadow-xl border-none rounded-xl p-6 text-center">
          <Utensils className="w-12 h-12 text-highlight mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#022D68]">Restaurante Não Encontrado</h2>
          <p className="text-gray-600 mt-2">
            Parece que sua conta de usuário não está vinculada a um restaurante.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Se você acabou de se cadastrar, verifique se o processo foi concluído corretamente.
          </p>
          <Button
            onClick={() => navigate(createPageUrl('restaurant-signup'))}
            className="mt-6 bg-highlight hover:bg-highlight/90"
          >
            Tentar Cadastrar Novamente
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <header className="sticky top-0 z-20 bg-white shadow-sm p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold text-[#022D68] flex-1 text-center pr-10 truncate">
          Gerenciar Cardápio
        </h1>
        <div className="w-10"></div>
      </header>

      <main className="p-4 space-y-6">
        <Card className="shadow-md border-none rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#022D68] rounded-full">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#022D68]">Cardápio</h2>
              <p className="text-sm text-gray-600">Gerencie categorias e itens do seu menu.</p>
            </div>
          </div>
          
          <Separator />

          <div className="flex flex-col gap-3">
            {/* Botão para adicionar nova categoria */}
            <Button
              onClick={() => navigate(createPageUrl('restaurant-area/categories/new'))}
              className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-full h-12 px-4 bg-highlight hover:bg-highlight/90 text-white text-base font-bold leading-normal tracking-[0.015em]"
            >
              <Plus className="w-5 h-5" />
              Adicionar Nova Categoria
            </Button>
            
            {/* O botão que navegava para a listagem de categorias foi removido aqui. */}
          </div>
        </Card>

        <MenuCategoryList restaurantId={restaurant.id} />
      </main>
    </div>
  );
}