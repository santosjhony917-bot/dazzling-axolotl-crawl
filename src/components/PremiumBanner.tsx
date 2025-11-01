"use client";

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

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
  text_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  text_size: 'sm' | 'md' | 'lg';
}

const PremiumBanner: React.FC = () => {
  const { restaurant, isRestaurantOwner, isPremium, isLoading: isLoadingAuth } = useAuth();
  const [audienceFilter, setAudienceFilter] = useState<'user' | 'restaurant_free' | 'restaurant_premium'>('user');

  useEffect(() => {
    if (!isLoadingAuth) {
      if (isRestaurantOwner) {
        setAudienceFilter(isPremium ? 'restaurant_premium' : 'restaurant_free');
      } else {
        setAudienceFilter('user');
      }
    }
  }, [isRestaurantOwner, isPremium, isLoadingAuth]);

  const { data: banners, isLoading: isLoadingBanners, isError } = useQuery<Banner[]>({
    queryKey: ['banners', audienceFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .eq('target_audience', audienceFilter)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching banners:', error);
        throw error;
      }
      return data;
    },
    enabled: !isLoadingAuth, // Only fetch banners once auth data is loaded
  });

  if (isLoadingAuth || isLoadingBanners) {
    return <div className="w-full h-40 bg-gray-200 rounded-lg animate-pulse" />;
  }

  if (isError || !banners || banners.length === 0) {
    // Fallback banner if no specific banner is found or an error occurs
    return (
      <div className="relative w-full h-40 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center p-4 text-white text-center">
        <h2 className="text-2xl font-bold">Torne-se Premium!</h2>
        <p className="mt-2">Desbloqueie recursos exclusivos para seu restaurante.</p>
        <Button asChild className="mt-4 bg-white text-orange-500 hover:bg-gray-100">
          <Link to="/premium">Saiba Mais</Link>
        </Button>
      </div>
    );
  }

  const banner = banners[0]; // Display the first active banner for the audience

  const getTextPositionClasses = (position: Banner['text_position']) => {
    switch (position) {
      case 'top-left': return 'top-4 left-4 items-start text-left';
      case 'top-right': return 'top-4 right-4 items-end text-right';
      case 'bottom-left': return 'bottom-4 left-4 items-start text-left';
      case 'bottom-right': return 'bottom-4 right-4 items-end text-right';
      case 'center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center text-center';
      default: return 'bottom-4 left-4 items-start text-left';
    }
  };

  const getTextSizeClasses = (size: Banner['text_size']) => {
    switch (size) {
      case 'sm': return 'text-sm';
      case 'md': return 'text-base';
      case 'lg': return 'text-lg';
      default: return 'text-base';
    }
  };

  return (
    <div className="relative w-full h-40 rounded-lg overflow-hidden shadow-md">
      <img
        src={banner.image_url}
        alt={banner.title}
        className="w-full h-full object-cover"
      />
      <div className={`absolute inset-0 flex flex-col justify-end p-4 ${getTextPositionClasses(banner.text_position)}`} style={{ color: banner.text_color || '#FFFFFF' }}>
        <h2 className={`font-bold ${getTextSizeClasses(banner.text_size)}`}>{banner.title}</h2>
        {banner.subtitle && <p className={`mt-1 ${getTextSizeClasses(banner.text_size)}`}>{banner.subtitle}</p>}
        {banner.has_button && banner.button_text && banner.button_link && (
          <Button asChild className="mt-3" style={{ backgroundColor: banner.button_color || '#E47948' }}>
            <Link to={banner.button_link}>{banner.button_text}</Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default PremiumBanner;