import React from 'react';
import { Restaurant } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Phone, MessageCircle, MapPin, Clock, Utensils, ArrowLeft, CreditCard, Globe } from 'lucide-react';
import RestaurantPublicHeader from '@/components/restaurant/RestaurantPublicHeader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import PublicMenuSection from '@/components/public/PublicMenuSection';
import { MenuCategory, MenuItem } from '@/types'; // Importando tipos de menu

interface FreeProfileLayoutProps {
  restaurant?: Restaurant; // Tornando opcional
  children?: React.ReactNode; // Tornando opcional
  menuCategories?: (MenuCategory & { items: MenuItem[] })[]; // Novo: Dados do menu
}

export default function FreeProfileLayout({ restaurant, children, menuCategories = [] }: FreeProfileLayoutProps) {
  const navigate = useNavigate();
  
  // Se não houver restaurante, renderiza um layout básico
  if (!restaurant) {
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
            Perfil do Restaurante
          </h1>
          <div className="w-10"></div>
        </header>
        <main className="p-4">
          {children}
        </main>
      </div>
    );
  }

  const { name, description, image_url, address, phone, whatsapp_url, city, state, ifood_url, other_url } = restaurant;

  // Mock de dados para o Header Público
  const headerData = {
    name: name || "Restaurante",
    followersCount: 0,
    logoUrl: image_url || '',
    isFollowing: false,
    onFollowToggle: () => alert("Funcionalidade em desenvolvimento"),
  };
  
  const mockHours = "Seg-Sex: 09:00 - 18:00";
  const mockPaymentMethods = ["Dinheiro", "Cartão de Débito", "PIX"];

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
          {name || "Perfil do Restaurante"}
        </h1>
        <div className="w-10"></div>
      </header>

      <div className="bg-white shadow-md rounded-b-xl">
        <RestaurantPublicHeader restaurant={headerData} />
      </div>

      <main className="p-4 space-y-6">
        <Card className="shadow-md border-none rounded-xl p-4 space-y-4">
          <h2 className="text-xl font-bold text-[#022D68]">Informações</h2>
          
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#E47948] mt-1 shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#022D68]">Localização</p>
              <p className="text-sm text-gray-700">{address}, {city} - {state}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#E47948] mt-1 shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#022D68]">Horários</p>
              <p className="text-sm text-gray-700">{mockHours}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-[#E47948] mt-1 shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#022D68]">Formas de Pagamento</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {mockPaymentMethods.map((method) => (
                  <span key={method} className="text-xs px-2 py-1 bg-gray-200 text-gray-800 rounded-full">
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {description && (
          <Card className="shadow-md border-none rounded-xl p-4">
            <h2 className="text-xl font-bold text-[#022D68] mb-3">Sobre Nós</h2>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{description}</p>
          </Card>
        )}
        
        {/* Seção do Cardápio Público */}
        <Card className="shadow-md border-none rounded-xl p-4">
          <PublicMenuSection categories={menuCategories} />
        </Card>
        
        {/* NOVA SEÇÃO: Links e Redes Sociais */}
        <Card className="shadow-md border-none rounded-xl p-4 space-y-4">
          <h2 className="text-xl font-bold text-[#022D68]">Links e Pedidos</h2>
          
          {whatsapp_url ? (
            <a href={whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <MessageCircle size={20} className="text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-700">WhatsApp</p>
                <p className="text-xs text-green-600 truncate">{whatsapp_url}</p>
              </div>
            </a>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <MessageCircle size={20} className="text-gray-400 shrink-0" />
              <p className="text-sm text-gray-500">WhatsApp não configurado.</p>
            </div>
          )}
          
          {/* Links Premium (iFood e Outros) */}
          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-300 opacity-70">
            <Globe size={20} className="text-yellow-700 shrink-0" />
            <div>
              <p className="text-sm font-bold text-yellow-800">Links Adicionais (Premium)</p>
              <p className="text-xs text-yellow-700">iFood, Site Próprio, etc.</p>
            </div>
          </div>
        </Card>
        
        {/* Alerta de Recurso Premium */}
        <Card className="shadow-md border-none rounded-xl p-4 text-center bg-yellow-50 border-yellow-300">
          <Utensils className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
          <h3 className="font-bold text-lg text-yellow-700">Cardápio Básico</h3>
          <p className="text-sm text-yellow-800 mt-1">
            A galeria de fotos e recursos de destaque são exclusivos do Plano Premium.
          </p>
          <Button 
            variant="default" 
            className="mt-4 bg-[#022D68] hover:bg-[#022D68]/90 text-white rounded-full h-10 text-sm"
            onClick={() => alert("Redirecionar para a página de Upgrade")}
          >
            Saiba mais sobre o Premium
          </Button>
        </Card>

        <Alert className="mt-6 text-left">
          <Info className="h-4 w-4" />
          <AlertTitle>Perfil Gratuito</AlertTitle>
          <AlertDescription>
            Este restaurante utiliza o plano Free. Para mais visibilidade e recursos, o proprietário pode fazer upgrade.
          </AlertDescription>
        </Alert>
        
        {children}
      </main>
    </div>
  );
}