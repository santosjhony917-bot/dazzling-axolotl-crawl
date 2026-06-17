import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import Header from '@/components/Header';

export default function HelpCenter() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f1f5f9] w-full flex flex-col">
      <div className="min-h-screen bg-background-light max-w-md mx-auto border-x border-slate-200/60 overflow-x-hidden flex flex-col">
        <Header
          title={
            <div className="flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              <span className="text-primary">Central de Ajuda</span>
            </div>
          }
          leftAction={{ icon: ArrowLeft, onClick: () => navigate(-1) }}
        />

      <main className="p-4 text-center">
        <div className="bg-white p-6 rounded-2xl shadow-none mt-8">
          <HelpCircle className="w-12 h-12 text-highlight mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Em Construção</h3>
          <p className="text-gray-600 mb-6">
            Esta é a Central de Ajuda. Em breve, você encontrará tutoriais e respostas para as perguntas mais frequentes aqui.
          </p>
          <Button onClick={() => navigate(createPageUrl('restaurant-area/profile-menu'))}>
            Voltar ao Perfil
          </Button>
        </div>
      </main>
      </div>
    </div>
  );
}