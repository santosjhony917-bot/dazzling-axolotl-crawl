"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext'; // Importando useAuthData
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  has_button: boolean;
  button_text: string | null;
  button_link: string | null;
  button_color: string | null;
  text_color: string | null;
  text_position: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right' | 'center';
  text_size: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  target_audience: 'user' | 'restaurant_free' | 'restaurant_premium';
}

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-md',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

const textPositionClasses = {
  'bottom-left': 'bottom-4 left-4 text-left',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 text-center',
  'bottom-right': 'bottom-4 right-4 text-right',
  'top-left': 'top-4 left-4 text-left',
  'top-center': 'top-4 left-1/2 -translate-x-1/2 text-center',
  'top-right': 'top-4 right-4 text-right',
  'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center',
};

const PremiumBanner: React.FC = () => {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);
  const { restaurant, isProfileLoading } = useAuthData(); // Usando useAuthData e isProfileLoading

  useEffect(() => {
    const fetchBanner = async () => {
      if (isProfileLoading) { // Usando isProfileLoading
        console.log("PremiumBanner: Dados do restaurante ainda estão carregando...");
        return;
      }

      console.log("PremiumBanner: Dados do restaurante carregados:", restaurant);

      let audienceFilter: 'restaurant_free' | 'restaurant_premium' | 'user' | null = null;

      if (restaurant) {
        if (restaurant.plan === 'free') {
          audienceFilter = 'restaurant_free';
          console.log("PremiumBanner: Plano do restaurante é FREE, definindo audienceFilter para 'restaurant_free'");
        } else if (restaurant.plan === 'premium') {
          audienceFilter = 'restaurant_premium';
          console.log("PremiumBanner: Plano do restaurante é PREMIUM, definindo audienceFilter para 'restaurant_premium'");
        } else {
          console.log("PremiumBanner: Plano do restaurante não é 'free' nem 'premium':", restaurant.plan);
        }
      } else {
        console.log("PremiumBanner: Nenhum contexto de restaurante encontrado (usuário não é dono de restaurante ou não logado).");
        setLoading(false);
        return;
      }

      if (!audienceFilter) {
        console.log("PremiumBanner: Nenhum filtro de audiência determinado, pulando busca de banner.");
        setLoading(false);
        return;
      }

      console.log(`PremiumBanner: Buscando banner para target_audience: ${audienceFilter}`);

      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .eq('target_audience', audienceFilter)
        .order('order_index', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error('PremiumBanner: Erro ao buscar banner:', error);
        setBanner(null);
      } else {
        console.log('PremiumBanner: Banner buscado com sucesso:', data);
        setBanner(data);
      }
      setLoading(false);
    };

    fetchBanner();
  }, [restaurant, isProfileLoading]);

  if (loading || isProfileLoading) { // Usando isProfileLoading
    return (
      <div className="w-full h-48 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Carregando banner...</p>
      </div>
    );
  }

  if (!banner) {
    console.log("PremiumBanner: Nenhum banner para exibir.");
    return null; // No banner to display
  }

  const buttonStyle = banner.button_color ? { backgroundColor: banner.button_color } : {};
  const textStyle = banner.text_color ? { color: banner.text_color } : {};

  return (
    <div className="relative w-full h-48 rounded-lg overflow-hidden shadow-lg mb-6">
      <img
        src={banner.image_url}
        alt={banner.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Overlay Escuro para Contraste */}
      <div className="absolute inset-0 bg-black/50" />
      <div className={cn("absolute z-10 p-4", textPositionClasses[banner.text_position])}>
        <h3 className={cn("font-bold leading-tight", textSizeClasses[banner.text_size])} style={textStyle}>{banner.title}</h3>
        {banner.subtitle && <p className="text-sm mt-1 mb-3" style={textStyle}>{banner.subtitle}</p>}
        {banner.has_button && banner.button_text && banner.button_link && (
          <Button asChild className="mt-2 px-4 py-2 rounded-md text-sm font-semibold" style={buttonStyle}>
            <Link to={banner.button_link}>{banner.button_text}</Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default PremiumBanner;