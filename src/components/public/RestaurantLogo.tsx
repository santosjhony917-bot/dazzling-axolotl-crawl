import React from 'react';
import { cn } from '@/lib/utils';
import { Building2 } from 'lucide-react';

type RestaurantPlan = 'free' | 'basic' | 'premium' | 'premium_gift';

interface RestaurantLogoProps {
  src: string | null;
  alt: string;
  sizeClass?: string;
  plan: RestaurantPlan;
}

const RestaurantLogo: React.FC<RestaurantLogoProps> = ({
  src,
  alt,
  sizeClass = 'w-24 h-24',
  plan,
}) => {
  const showLogo = (plan === 'premium' || plan === 'premium_gift') && src;

  return (
    <div
      className={cn(
        'rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden border-4 border-white',
        sizeClass
      )}
    >
      {showLogo ? (
        <img src={src!} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <Building2 className="w-1/2 h-1/2 text-gray-400" />
        </div>
      )}
    </div>
  );
};

export default RestaurantLogo;