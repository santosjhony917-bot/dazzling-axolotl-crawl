import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface BannerProps {
  title: string;
  subtitle: string;
  imageUrl: string;
  linkTo: string;
  buttonText: string;
}

const PremiumBanner: React.FC = () => {
  const banners: BannerProps[] = [
    {
      title: 'Destaque seu Restaurante',
      subtitle: 'Alcance mais clientes com o plano Premium.',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      linkTo: '/restaurant-area/premium',
      buttonText: 'Saiba Mais',
    },
    {
      title: 'Gerencie seu Cardápio',
      subtitle: 'Adicione, edite e organize seus pratos facilmente.',
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ba0b6ee66?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      linkTo: '/restaurant-area/menu',
      buttonText: 'Ver Cardápio',
    },
    {
      title: 'Veja suas Estatísticas',
      subtitle: 'Acompanhe o desempenho do seu restaurante.',
      imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      linkTo: '/restaurant-area/analytics',
      buttonText: 'Ver Estatísticas',
    },
  ];

  return (
    <div className="space-y-4 p-4">
      {banners.map((banner, index) => (
        <div
          key={index}
          className="relative w-full h-48 rounded-lg overflow-hidden shadow-lg flex items-center justify-center"
        >
          <img
            src={banner.imageUrl}
            alt={banner.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Overlay Bege com 55% de Transparência */}
          <div className="absolute inset-0 bg-stone-200/55" />
          <div className="relative z-10 text-center p-4">
            <h3 className="text-xl font-bold text-gray-900 leading-tight">{banner.title}</h3>
            <p className="text-sm text-gray-700 mt-1 mb-3">{banner.subtitle}</p>
            <Link to={banner.linkTo}>
              <Button className="bg-[#E47948] hover:bg-[#D06A3F] text-white">
                {banner.buttonText}
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PremiumBanner;