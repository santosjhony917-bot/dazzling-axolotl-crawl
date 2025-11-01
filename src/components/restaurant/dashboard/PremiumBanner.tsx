import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl, PathKey } from '@/utils/url';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAuthData } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getBanners } from '@/integrations/supabase/admin';
import { Tables, Enums } from '@/types/supabase';

interface BannerItem {
  title: string;
  subtitle: string;
  buttonText: string;
  imageUrl: string;
  actionPath: PathKey;
}

const PremiumBanner: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isPremium, restaurant } = useAuthData();

  const { data: banners, isLoading } = useQuery<Tables<'banners'>[]>({
    queryKey: ['banners'],
    queryFn: getBanners,
  });

  // Filtrar banners com base no público-alvo
  const filteredBanners = useMemo(() => {
    if (!banners) return [];

    let targetAudienceType: Enums<'banner_target_audience'> = 'user';

    if (isAuthenticated && restaurant) {
      if (isPremium) {
        targetAudienceType = 'premium_restaurant';
      } else {
        targetAudienceType = 'free_restaurant';
      }
    }

    return banners.filter(banner => banner.is_active && banner.target_audience === targetAudienceType)
                  .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }, [banners, isAuthenticated, isPremium, restaurant]);

  if (isLoading) {
    return <div className="h-40 w-full bg-gray-200 rounded-xl animate-pulse" />;
  }

  if (!filteredBanners || filteredBanners.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full">
      <Carousel className="w-full">
        <CarouselContent>
          {filteredBanners.map((banner, index) => (
            <CarouselItem key={banner.id}>
              <div 
                className="relative h-40 rounded-xl overflow-hidden bg-cover bg-center p-4 flex flex-col justify-end shadow-soft-xl"
                style={{ backgroundImage: `url(${banner.image_url})` }}
              >
                {/* Overlay Escuro para Contraste */}
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-white leading-tight">{banner.title}</h3>
                  <p className="text-sm text-gray-200 mt-1 mb-3">{banner.subtitle}</p>
                  {banner.has_button && banner.button_text && banner.button_link && (
                    <motion.div
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        onClick={() => navigate(banner.button_link!)}
                        className="bg-highlight hover:bg-highlight/90 text-white rounded-full font-bold shadow-highlight-glow animate-shine"
                      >
                        {banner.button_text}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* Indicadores de Posição (Dots) - Usando classes Tailwind para simular */}
        {filteredBanners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
            {filteredBanners.map((_, idx) => (
              <div key={idx} className={cn("w-2 h-2 bg-white rounded-full", {
                "opacity-80": idx === 0,
                "opacity-40": idx !== 0,
              })} />
            ))}
          </div>
        )}
      </Carousel>
    </div>
  );
};

export default PremiumBanner;