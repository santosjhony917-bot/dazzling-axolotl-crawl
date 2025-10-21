import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin, Phone, Mail, CreditCard, Info, LogOut, User, Utensils, Crown } from 'lucide-react';
import { useAuth } from '@/integrations/supabase/auth';
import { useRestaurant } from '@/hooks/useRestaurant';
import { cn } from '@/lib/utils';

const RestaurantProfileMenu: React.FC = () => {
  const { signOut } = useAuth();
  const { restaurant, isLoading } = useRestaurant();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-gray-600">Carregando perfil...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 p-4 text-center">
        <p className="text-lg font-semibold mb-4">Restaurante não encontrado.</p>
        <Link to="/restaurant/signup">
          <Button>Cadastrar Restaurante</Button>
        </Link>
      </div>
    );
  }

  const menuItems = [
    { 
      title: 'Informações Básicas', 
      description: 'Nome, descrição e imagem de capa.', 
      icon: <Utensils className="w-5 h-5 text-primary" />, 
      link: '/restaurant/profile/basic' 
    },
    { 
      title: 'Endereço e Localização', 
      description: 'Rua, número, CEP e coordenadas.', 
      icon: <MapPin className="w-5 h-5 text-primary" />, 
      link: '/restaurant/profile/address' 
    },
    { 
      title: 'Contato e Redes', 
      description: 'Telefone, email e links externos.', 
      icon: <Phone className="w-5 h-5 text-primary" />, 
      link: '/restaurant/profile/contact' 
    },
  ];

  const accountItems = [
    { 
      title: 'Meu Plano', 
      description: `Plano atual: ${restaurant.plan === 'premium' ? 'Premium' : 'Free'}`, 
      icon: <Crown className={cn("w-5 h-5", restaurant.plan === 'premium' ? 'text-highlight fill-highlight/20' : 'text-gray-500')} />, 
      link: '/upgrade' 
    },
    { 
      title: 'Minha Conta', 
      description: 'Gerenciar dados de login e segurança.', 
      icon: <User className="w-5 h-5 text-gray-600" />, 
      link: '/account' 
    },
  ];

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-xl mx-auto p-4 sm:p-6">
        
        {/* Header */}
        <header className="mb-8 pt-4">
          <h1 className="text-3xl font-extrabold text-primary dark:text-white">
            Área do Restaurante
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
            Gerencie o perfil público de <span className="font-semibold">{restaurant.name}</span>.
          </p>
        </header>

        {/* Seção de Perfil do Restaurante */}
        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">Configurações do Perfil</h2>
          
          <Card className="p-0 rounded-xl shadow-lg overflow-hidden">
            {menuItems.map((item) => (
              <Link key={item.title} to={item.link} className="block">
                <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
                  <div className="flex items-center">
                    <div className="p-2 bg-primary/10 rounded-lg mr-4">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </Card>
        </section>

        {/* Seção de Conta e Assinatura */}
        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">Conta e Assinatura</h2>
          
          <Card className="p-0 rounded-xl shadow-lg overflow-hidden">
            {accountItems.map((item) => (
              <Link key={item.title} to={item.link} className="block">
                <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
                  <div className="flex items-center">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mr-4">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </Card>
        </section>

        {/* Botão de Sair */}
        <div className="mt-8">
          <Button 
            variant="outline" 
            className="w-full text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sair da Conta
          </Button>
        </div>
        
      </div>
    </div>
  );
};

export default RestaurantProfileMenu;