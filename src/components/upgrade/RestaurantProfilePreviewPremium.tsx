import React from 'react';
import { MapPin, Star, Clock, Utensils, MessageSquare, Phone, Globe, Heart, Home, Search, User, Crown, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Mock data for Premium view
const mockRestaurantPremium = {
  name: "cachorro quente (PREMIUM)",
  followers: 890, // Mais seguidores para simular popularidade
  plan: "Premium",
  logoUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB4LqCxWioSiDV6orE_or-LbJYB4S_zj7OwISyeW543nNV9Mp6sDJpk2cs3C00Hk5Q-75RM0O72rfJMdCBl4F7BBsD9hU3lFLW9rVwF9_pCBd0PWl81dDZOm1MvvuWXV6NvsGHwde-sSyM7cAdM_QzrDl33EheFRHM2xg9firpJkAbmJ99-HGGYEGfSXmpgBF9-43U1uicV5G9a9onDPa9TlMnvgP_-GTrn6a-h_Znps16XVLtzN2X2A-x67AOQZF1ZFBlRensx75b0",
  menu: [
    { category: "Pizzas", active: true, items: [
      { name: "Pizza Calabresa", price: "39,90", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBSD8cB_Qdd9Gs_SqLpu6-DRKCpRYC03aurMJZY-cBTu6yXF_Nq6wN0Jl_I0FaYcW1sr03JX3pdubc0TD28i_dm90ZWqfZTyXKLBYrYGt6euWiqXqVf_ujsajrs9K487TE--E38ndnwkg9Ar0HBqElBfNAryptkTZw1H-VmX2i1jNsk5knoKZuvB2rXkO1nkJqdk7GUesWBKSKJAGvYhKTTBcuV4PTg1sywZSfiGECFSzlI2mZbBhcIBM694Ep_LWG1i__eBB6IIZlb" },
      { name: "Pizza Pepperoni", price: "42,50", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZ6tFpUEY_4SIpJAMupZ8Br7wTTMzZZ5nemQgryS9KxGCwh4B5rilvpSC3KNsKFqgz238U4vEjHuKmYT8BXKsZejbGvHaiwKKt-cJtAft0s3o2DK9wO7iy6uoFsyTWhqmTjilVGsSnwkF2vtMoaLrhBwf6-NvXO9Tpzi_L6GZKFvA6Q-6GLNDH-qbBwD5g-PZqNJ49t2phPubOjiBdayTeueSjhIvsmMzET4CtfZU--S2yNiJiflxuOVU3O7c2RZXAiy2qLs0xVj7j" },
      { name: "Frango c/ Catupiry", price: "41,00", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAiiSNte71rILe5O6Dk91VnUSK3GgX1F15lH1lyiPsgkO5KjnpUaRlPO3nq-DFzef6vOI9YyV5O74x6IV4RdG4nvQ2mbn7YjX93ax8_GUo-GPKYoftEoSwtNUFuDIPXU44RM-vZtb5odKduArfN5sC3lN8bPLJd1NgY1WOjYDThTIBe1uMBkZaQuro05-G_T_4ISgWThymlV2AdLUeg8KnMpms3O-6OVcHSIV2i4uApxCEIjnnGDV52jQSBuBXIS1lPtVD0603rns2J" },
    ]},
    { category: "Sobremesas", active: false, items: [
      { name: "Pudim de Leite", price: "12,00", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCxdGAT6ZSUP-J4oX7ClkqtxjAztDAkhK6BdLcOlyMcJSWYDTwgTC44Hdr0Z_X93v8bT07uYgUN0hlPJaWhjWcw3jkYzZDLPhJaLMoT48xbEapdMqKavCn26UGO8OQ9P4oLQoBe01ajvmq5Mp0Ue_6DnwSTl0cCFMRpnrYGhBortR75hrysNIbEK4tccWhO4VhpvP0glopvnNeTJ6g28uujflXYEXnKaybV6BbXlmm7c3GM_R6yrKa-XUbGZEtwWrBFwDQrL9MqGVQ3" },
      { name: "Mousse de Maracujá", price: "10,50", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCjTG2Ht4lA5WODaD5_ul94WhYDurQCZ54BvnONWjDynNH_5gNn7TY01L5DJPAvY1Jqw7BwTI1_st5kTcgZlhEVV172sRIwqqemDHntfpZ4LCuH5KVBmhF2CsiWrMbJVTcOp9fh5ZNQOfiir9v4_q8aiLE8eAa8EmuyWnhHiFm2rxWdnEOWgTdfVHCEbG58M1AIoQHk8sCytemZxwJ1OnqcR84obdzRb47s7KVtF9-S1dyVFLysiZnpeyLO2Q3AEFRXP8NynZBUWC9k" },
    ]},
    { category: "Bebidas", active: false, items: [
      { name: "Refrigerante Lata", price: "5,00", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCBDF_Eqeb2x9QSF7se_3r0oNgYj6PRyyrVouN9Gk2s5nZOscrLjNhHFbHR-rwghsVdpbXl0TfkByUxEY4AmLNzPkyXorpw0A8aJpFI6SxsMdNhoqRFFgNbOfQ3aC9MeiYK8WA6SYQ4XgPJ2nyyZ6SMEL1vyg4g8aAhnxp8RVaJIFxXZyIPPVusth8tshNZMGZywNPamoSA-UTpC-CUrI5ukE5Wo4PwfPQzBW31A_RgxJkx8To3JWRTjwuKlrHaz5E4XUUfW2UJOjrT" },
      { name: "Suco Natural 500ml", price: "8,00", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB0yg2epMcKgmqWTUFIlNi9Km2KBXE5wEQmo0Cq2EaFd524-m8qLpAIWhDsYr8I2TTJGCAA04_bfTO__uEX3YHmsA3tTItnzuBKp0YFmquixCZANeLYApUiwxShNpeU16EFFM9Zm05e3tsJdA2zmbqZSfAhI3eNyJqidpugcY4ZTyLHHH9DyeIzHGHRRn_92JrE4-bZEBJ89QDgW_91H8ttH8yIaZpbSGdmh1u4UyUzwYXG59Se8AOdbQ1DrXGbb0uIBuvbixIqORy6" },
    ]},
  ],
  info: {
    address: "Rua das Flores, 123 Centro, João Pessoa/PB",
    hours: "Qua-Dom: 11h às 23h",
    payment: "Dinheiro, Pix, Cartão de Crédito",
  }
};

const RestaurantProfilePreviewPremium: React.FC = () => {
  const activeCategory = mockRestaurantPremium.menu.find(cat => cat.active);

  return (
    <Card className="w-full max-w-md mx-auto border-4 border-highlight shadow-2xl overflow-hidden bg-background-light dark:bg-background-dark relative">
      
      {/* Selo Premium */}
      <div className="absolute top-0 right-0 bg-highlight text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center z-10">
        <Crown className="w-3 h-3 mr-1 fill-white" /> PREMIUM
      </div>

      <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden">
        
        {/* Header do Restaurante */}
        <div className="flex p-4 @container mt-4">
          <div className="flex w-full flex-col gap-4">
            <div className="flex gap-4">
              <div 
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-24 w-24 border-4 border-highlight" 
                data-alt="restaurant logo" 
                style={{ backgroundImage: `url("${mockRestaurantPremium.logoUrl}")` }}
              />
              <div className="flex flex-col justify-center">
                <p className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] text-highlight">{mockRestaurantPremium.name}</p>
                <p className="text-[#5f728c] dark:text-gray-400 text-base font-normal leading-normal">{mockRestaurantPremium.followers} seguidores</p>
                <Badge className="mt-1 inline-flex items-center rounded-md bg-highlight text-white px-2 py-1 text-xs font-medium ring-1 ring-inset ring-highlight/50 w-fit">
                  <Zap className="w-3 h-3 mr-1 fill-white" /> {mockRestaurantPremium.plan}
                </Badge>
              </div>
            </div>
            
            {/* Botões de Ação (Premium pode ter mais destaque ou links) */}
            <div className="flex w-full max-w-[480px] gap-3">
              <Button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] flex-1">
                <span className="truncate">Seguir</span>
              </Button>
              <Button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-highlight text-white text-sm font-bold leading-normal tracking-[0.015em] flex-1 hover:bg-highlight/90">
                <span className="truncate">Fazer Pedido (iFood/Site)</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Cardápio */}
        <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Cardápio</h2>
        <div className="pb-3">
          <div className="flex border-b border-[#dbe0e6] dark:border-gray-700 px-4 gap-8 overflow-x-auto hide-scrollbar">
            {mockRestaurantPremium.menu.map((category, index) => (
              <a 
                key={index} 
                className={cn(
                  "flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 shrink-0",
                  category.active 
                    ? "border-b-highlight text-highlight" // Destaque Premium
                    : "border-b-transparent text-[#5f728c] dark:text-gray-400"
                )} 
                href="#"
                onClick={(e) => e.preventDefault()} // Prevent navigation in preview
              >
                <p className="text-sm font-bold leading-normal tracking-[0.015em]">{category.category}</p>
              </a>
            ))}
          </div>
        </div>
        
        {/* Itens do Cardápio */}
        <div className="flex flex-col gap-4 p-4">
          {activeCategory?.items.map((item, index) => (
            <div key={index} className="flex items-center gap-4 bg-white dark:bg-background-dark rounded-lg p-2 shadow-md border-l-4 border-highlight">
              <div 
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-16 shrink-0" 
                data-alt={item.name} 
                style={{ backgroundImage: `url("${item.imageUrl}")` }}
              />
              <div className="flex-1">
                <p className="text-[#111418] dark:text-white text-base font-bold leading-normal">{item.name}</p>
                <p className="text-highlight dark:text-highlight text-sm font-bold leading-normal">R$ {item.price}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Informações */}
        <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Informações</h2>
        <div className="flex flex-col gap-4 px-4 pb-24">
          <div className="flex items-start gap-4">
            <div className="text-highlight flex size-7 items-center justify-center mt-1">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <p className="text-[#111418] dark:text-white text-base font-bold">Endereço</p>
              <p className="text-[#5f728c] dark:text-gray-400 text-base">{mockRestaurantPremium.info.address}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="text-highlight flex size-7 items-center justify-center mt-1">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <p className="text-[#111418] dark:text-white text-base font-bold">Horários</p>
              <p className="text-[#5f728c] dark:text-gray-400 text-base">{mockRestaurantPremium.info.hours}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="text-highlight flex size-7 items-center justify-center mt-1">
              <Utensils className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <p className="text-[#111418] dark:text-white text-base font-bold">Formas de pagamento</p>
              <p className="text-[#5f728c] dark:text-gray-400 text-base">{mockRestaurantPremium.info.payment}</p>
            </div>
          </div>
        </div>

        {/* Footer de Navegação (Simulado) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t border-highlight/50 max-w-md mx-auto">
          <div className="flex justify-around items-center h-16">
            <div className="flex flex-col items-center justify-center text-primary">
              <Home className="w-6 h-6" />
              <span className="text-xs font-medium">Home</span>
            </div>
            <div className="flex flex-col items-center justify-center text-[#5f728c] dark:text-gray-400">
              <Search className="w-6 h-6" />
              <span className="text-xs font-medium">Buscar</span>
            </div>
            <div className="flex flex-col items-center justify-center text-highlight">
              <Heart className="w-6 h-6 fill-highlight" />
              <span className="text-xs font-medium">Favoritos</span>
            </div>
            <div className="flex flex-col items-center justify-center text-[#5f728c] dark:text-gray-400">
              <User className="w-6 h-6" />
              <span className="text-xs font-medium">Perfil</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RestaurantProfilePreviewPremium;