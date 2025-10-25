import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl, PathKey } from '@/utils/url';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

interface BannerItem {
  title: string;
  subtitle: string;
  buttonText: string;
  imageUrl: string;
  actionPath: PathKey;
}

const mockBanners: BannerItem[] = [
  {
    title: "Torne-se Premium!",
    subtitle: "Apareça para mais clientes e aumente suas vendas.",
    buttonText: "Saiba Mais",
    imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=2074&auto=format&fit=crop",
    actionPath: 'restaurant-area/upgrade',
  },
  {
    title: "Estatísticas Avançadas",
    subtitle: "Veja quem são seus concorrentes e como se destacar.",
    buttonText: "Ver Recursos",
    imageUrl: "https://images.unsplash.com/photo-1556742111-a301076d9d18?q=80&w=2070&auto=format&fit=crop",
    actionPath: 'restaurant-area/upgrade',
  },
];

const PremiumBanner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative w-full">
      <Carousel className="w-full">
        <CarouselContent>
          {mockBanners.map((banner, index) => (
            <CarouselItem key={index}>
              <div 
                className="relative h-40 rounded-xl overflow-hidden bg-cover bg-center p-4 flex flex-col justify-end"
                style={{ backgroundImage: `url(${banner.imageUrl})` }}
              >
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-white leading-tight">{banner.title}</h3>
                  <p className="text-sm text-gray-200 mt-1 mb-3">{banner.subtitle}</p>
                  <Button 
                    onClick={() => navigate(createPageUrl(banner.actionPath))}
                    className="bg-highlight hover:bg-highlight/90 text-white rounded-full font-bold"
                  >
                    {banner.buttonText}
                  </Button>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* Indicadores de Posição (Dots) - Usando classes Tailwind para simular */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
          {/* Note: Implementação real de dots requer estado do Carousel, mas simulamos a estrutura */}
          <div className="w-2 h-2 bg-white rounded-full opacity-80" />
          <div className="w-2 h-2 bg-white rounded-full opacity-40" />
        </div>
      </Carousel>
    </div>
  );
};

export default PremiumBanner;