import React, { useEffect, useState } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  order_index: number;
  is_active: boolean;
}

const PremiumBanner: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true) // Fetch only active banners
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching banners:', error.message);
        // Optionally show a toast error here
      } else {
        setBanners(data || []);
      }
      setLoading(false);
    };

    fetchBanners();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48 bg-gray-100 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (banners.length === 0) {
    return null; // Don't render if no active banners
  }

  return (
    <Carousel className="w-full max-w-md mx-auto">
      <CarouselContent>
        {banners.map((banner) => (
          <CarouselItem key={banner.id}>
            <div className="relative w-full h-48 rounded-lg overflow-hidden shadow-lg">
              <img
                src={banner.image_url}
                alt={banner.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Overlay Escuro para Contraste */}
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative z-10 flex flex-col justify-end h-full p-4">
                <h3 className="text-xl font-bold text-white leading-tight">{banner.title}</h3>
                <p className="text-sm text-gray-200 mt-1 mb-3">{banner.subtitle}</p>
                {banner.link_url && (
                  <a
                    href={banner.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-[#E47948] text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#D06A3F] transition-colors duration-200"
                  >
                    Saiba Mais
                  </a>
                )}
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
};

export default PremiumBanner;