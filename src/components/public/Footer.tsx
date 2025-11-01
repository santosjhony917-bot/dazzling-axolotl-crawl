"use client";

import { PublicRestaurantData } from "@/types/supabase";
import React from "react";
import { Heart } from "lucide-react";

interface FooterProps {
  restaurant: PublicRestaurantData;
}

const Footer: React.FC<FooterProps> = ({ restaurant }) => {
  return (
    <footer className="bg-gray-800 text-white p-6 mt-8">
      <div className="container mx-auto text-center text-sm">
        <p className="mb-2">
          &copy; {new Date().getFullYear()} {restaurant.name}. Todos os direitos reservados.
        </p>
        <p className="flex items-center justify-center space-x-1">
          <span>Feito com</span>
          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
          <span>por Dyad.</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;