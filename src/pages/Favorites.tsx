import React from 'react';
import { Heart } from 'lucide-react';

const Favorites: React.FC = () => {
  return (
    <div className="p-4 max-w-md mx-auto text-center">
      <Heart className="w-12 h-12 text-red-500 mx-auto mt-10 mb-4 fill-red-100" />
      <h1 className="text-2xl font-bold text-[#022D68] mb-2">Meus Favoritos</h1>
      <p className="text-gray-600">Você ainda não adicionou nenhum restaurante ou item de menu aos seus favoritos.</p>
    </div>
  );
};

export default Favorites;