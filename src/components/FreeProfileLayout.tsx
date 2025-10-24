import React from 'react';
import { Restaurant } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Phone, MessageCircle, MapPin, Clock, Utensils, ArrowLeft } from 'lucide-react';
import RestaurantPublicHeader from '@/components/restaurant/RestaurantPublicHeader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom'; // Importando useNavigate

interface FreeProfileLayoutProps {
  restaurant: Restaurant;
}

export default function FreeProfileLayout({ restaurant }: FreeProfileLayoutProps) {
  const navigate = useNavigate(); // Inicializando useNavigate
  const { name, description, image_url, address, phone, whatsapp_url, city, state } = restaurant;

  // Mock de dados para o Header Público (o plano será 'Free' por padrão aqui)
  const headerData = {
    name: name || "Restaurante Free",
    followersCount: 0, // Não exibido no Free, mas necessário para a interface
    logoUrl: image_url || '',
    isFollowing: false,
    onFollowToggle: () => alert("Funcionalidade de seguir em desenvolvimento."),
  };
  
  // Mock de Horários (para exibição simples)
  const mockHours = "Seg-Sex: 09:00 - 18:00";

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      
      {/* Header Fixo com Botão Voltar */}
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
          {name || "Perfil do Restaurante"}
        </h1>
        <div className="w-10"></div> {/* Placeholder para alinhamento */}
      </header>

      {/* Header Público (Logo, Nome, Botões) - Abaixo do Header Fixo */}
      <div className="bg-white shadow-md rounded-b-xl">
        <RestaurantPublicHeader restaurant={headerData} />
      </div>

      <main className="p-4 space-y-6">
        
        {/* Informações Essenciais */}
        <Card className="shadow-md border-none rounded-xl p-4 space-y-4">
          <h2 className="text-xl font-bold text-[#022D68]">Informações</h2>
          
          {/* Endereço */}
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#E47948] mt-1 shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#022D68]">Localização</p>
              <p className="text-sm text-gray-700">{address}, {city} - {state}</p>
            </div>
          </div>
          
          {/* Horários */}
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#E47948] mt-1 shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#022D68]">Horários</p>
              <p className="text-sm text-gray-700">{mockHours}</p>
            </div>
          </div>
          
          {/* Contato */}
          {(phone || whatsapp_url) && (
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#E47948] mt-1 shrink-0" />
              <div>
                <p className="text-sm font-bold text-[#022D68]">Contato</p>
                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  {phone && (
                    <a href={`tel:${phone}`} className="text-sm text-gray-700 hover:text-[#E47948] transition-colors flex items-center gap-1">
                      <Phone size={14} /> {phone}
                    </a>
                  )}
                  {whatsapp_url && (
                    <a href={whatsapp_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 hover:text-[#E47948] transition-colors flex items-center gap-1">
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Descrição / Sobre Nós */}
        {description && (
          <Card className="shadow-md border-none rounded-xl p-4">
            <h2 className="text-xl font-bold text-[#022D68] mb-3">Sobre Nós</h2>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{description}</p>
          </Card>
        )}
        
        {/* Cardápio Limitado (Aviso) */}
        <Card className="shadow-md border-none rounded-xl p-4 text-center bg-yellow-50 border-yellow-300">
          <Utensils className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
          <h3 className="font-bold text-lg text-yellow-700">Cardápio Básico</h3>
          <p className="text-sm text-yellow-800 mt-1">
            O cardápio detalhado e a galeria de fotos são recursos exclusivos do Plano Premium.
          </p>
          <Button 
            variant="default" 
            className="mt-4 bg-[#022D68] hover:bg-[#022D68]/90 text-white rounded-full h-10 text-sm"
            onClick={() => alert("Redirecionar para a página de Upgrade")}
          >
            Saiba mais sobre o Premium
          </Button>
        </Card>

        {/* Aviso Geral (Mantido) */}
        <Alert className="mt-6 text-left">
          <Info className="h-4 w-4" />
          <AlertTitle>Perfil Gratuito</AlertTitle>
          <AlertDescription>
            Este restaurante utiliza o plano Free. Para mais visibilidade e recursos, o proprietário pode fazer upgrade.
          </AlertDescription>
        </Alert>
      </main>
    </div>
  );
}