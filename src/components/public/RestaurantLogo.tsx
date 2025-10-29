import React from 'react';
import { Utensils } from 'lucide-react';

interface RestaurantLogoProps {
  logoUrl: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-32 h-32',
};

const RestaurantLogo: React.FC<RestaurantLogoProps> = ({ logoUrl, size = 'md' }) => {
  const classes = sizeClasses[size];

  return (
    <div className={`${classes} rounded-full border-4 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-lg overflow-hidden`}>
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt="Logo do Restaurante" 
          className="w-full h-full object-cover"
        />
      ) : (
        <Utensils className={`${size === 'lg' ? 'w-16 h-16' : 'w-8 h-8'} text-gray-500 dark:text-gray-400`} />
      )}
    </div>
  );
};

export default RestaurantLogo;