import React from 'react';
import CustomerBottomNav from '@/components/CustomerBottomNav';

export default function Favorites() {
  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold text-[#022D68] mb-4">Meus Favoritos</h1>
      <div className="text-center p-8 bg-white rounded-xl shadow-sm">
        <p className="text-gray-600">Seus restaurantes e pratos favoritos aparecerão aqui.</p>
      </div>
      <CustomerBottomNav selectedTab="favorites" />
    </div>
  );
}