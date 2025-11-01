import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import { RestaurantAreaHeader } from '@/components/restaurant/RestaurantAreaHeader';

export default function HelpCenter() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f5f7f8] max-w-md mx-auto">
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-sm w-full max-w-md mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-[#022D68]" />
          <h2 className="text-[#022D68] text-xl font-bold">Central de Ajuda</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="p-4 text-center">
        <div className="bg-white p-6 rounded-xl shadow-md mt-8">
          <HelpCircle className="w-12 h-12 text-highlight mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Em Construção</h3>
          <p className="text-gray-600 mb-6">
            Esta é a Central de Ajuda. Em breve, você encontrará tutoriais e respostas para as perguntas mais frequentes aqui.
          </p>
          <Button onClick={() => navigate(createPageUrl('restaurantAreaProfileMenu'))}>
            Voltar ao Perfil
          </Button>
        </div>
      </main>
    </div>
  );
}