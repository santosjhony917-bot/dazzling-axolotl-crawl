"use client";

import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { Heart } from 'lucide-react';

interface FooterProps {
  restaurant: PublicRestaurantData;
}

const Footer: React.FC<FooterProps> = ({ restaurant }) => {
  return (
    <footer className="bg-gray-800 text-white py-6 mt-8">
      <div className="container mx-auto px-4 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} {restaurant.name}. Todos os direitos reservados.</p>
        <p className="mt-2 flex items-center justify-center">
          Feito com <Heart className="w-4 h-4 mx-1 text-red-500 fill-current" /> por FilterFood
        </p>
      </div>
    </footer>
  );
};

export default Footer;