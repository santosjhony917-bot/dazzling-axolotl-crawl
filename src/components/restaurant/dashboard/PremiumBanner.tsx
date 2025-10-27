import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Star, TrendingUp } from 'lucide-react';

const PremiumBanner = () => {
  const navigate = useNavigate();

  const banners = [
    {
      icon: Zap,
      title: 'Destaque-se com o Premium',
      description: 'Aumente sua visibilidade e alcance mais clientes.',
      actionText: 'Ver Planos',
      color: 'bg-yellow-500',
      action: () => navigate(createPageUrl('restaurant-area/upgrade')),
    },
    {
      icon: Star,
      title: 'Galeria de Fotos Exclusiva',
      description: 'Mostre seus pratos com fotos de alta qualidade.',
      actionText: 'Gerenciar Galeria',
      color: 'bg-blue-500',
      action: () => navigate(createPageUrl('restaurant-area/gallery')),
    },
    {
      icon: TrendingUp,
      title: 'Análise de Desempenho',
      description: 'Acompanhe métricas de visualização e favoritos.',
      actionText: 'Ver Estatísticas',
      color: 'bg-green-500',
      action: () => navigate(createPageUrl('restaurant-area/dashboard')),
    },
  ];

  return (
    <div className="w-full py-4">
      <Carousel className="w-full">
        <CarouselContent>
          {banners.map((banner, index) => (
            <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
              <Card className={`shadow-lg border-none ${banner.color} text-white`}>
                <CardContent className="flex flex-col aspect-square items-start justify-between p-6">
                  <div className="flex items-center mb-2">
                    <banner.icon className="w-6 h-6 mr-2" />
                    <h3 className="text-xl font-bold">{banner.title}</h3>
                  </div>
                  <p className="text-sm mb-4 opacity-90">{banner.description}</p>
                  <Button 
                    onClick={banner.action} 
                    variant="secondary" 
                    className="bg-white text-gray-800 hover:bg-gray-100 font-semibold rounded-full"
                  >
                    {banner.actionText}
                  </Button>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  );
};

export default PremiumBanner;