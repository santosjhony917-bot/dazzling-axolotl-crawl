"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Crown, Star, Zap } from 'lucide-react';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { mockRestaurants } from '@/data/mockRestaurants';

interface PublicRestaurantData {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  cover_image_url?: string;
  category?: string;
  phone?: string;
  email?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
  opening_hours?: Record<string, string>;
  whatsapp_url?: string;
  ifood_url?: string;
  other_url?: string;
  menu_categories?: Array<{
    id: string;
    name: string;
    menu_items: Array<{
      id: string;
      name: string;
      description?: string;
      price: number;
      image_url?: string;
    }>;
  }>;
  restaurant_gallery?: Array<{
    id: string;
    image_url: string;
    caption?: string;
    order_index?: number;
  }>;
}

const mockPremiumRestaurant = mockRestaurants.find(r => r.plan === 'premium') as PublicRestaurantData;

const Upgrade = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-orange-500 to-orange-600 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Leve seu Restaurante para o Próximo Nível
          </h1>
          <p className="mt-4 text-xl text-orange-100">
            Desbloqueie recursos exclusivos e atraia mais clientes com nossos planos premium.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild className="bg-white text-orange-600 hover:bg-orange-50 text-lg px-8 py-3 rounded-full shadow-lg">
              <Link to="#plans">Ver Planos</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            Por que fazer um Upgrade?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-lg shadow-sm">
              <Zap className="h-12 w-12 text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Mais Visibilidade</h3>
              <p className="text-gray-600">
                Destaque seu restaurante para milhares de novos clientes em potencial.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-lg shadow-sm">
              <Star className="h-12 w-12 text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Recursos Avançados</h3>
              <p className="text-gray-600">
                Gerencie seu cardápio, promoções e galeria de fotos com facilidade.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-lg shadow-sm">
              <Crown className="h-12 w-12 text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Suporte Prioritário</h3>
              <p className="text-gray-600">
                Tenha acesso a uma equipe de suporte dedicada para todas as suas necessidades.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Plans Section */}
      <div id="plans" className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            Escolha o Plano Ideal para Você
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Free Plan */}
            <Card className="flex flex-col justify-between border-2 border-gray-200 shadow-lg rounded-lg">
              <CardHeader className="text-center pb-0">
                <h3 className="text-2xl font-bold text-gray-900">Grátis</h3>
                <p className="mt-2 text-gray-600">Comece sem custo</p>
                <p className="mt-4 text-4xl font-extrabold text-gray-900">R$0<span className="text-xl font-medium text-gray-500">/mês</span></p>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Perfil Básico do Restaurante
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Listagem na Busca
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Informações de Contato
                  </li>
                </ul>
                <Button className="mt-8 w-full bg-gray-200 text-gray-800 hover:bg-gray-300">
                  Plano Atual
                </Button>
              </CardContent>
            </Card>

            {/* Basic Plan */}
            <Card className="flex flex-col justify-between border-2 border-orange-500 shadow-lg rounded-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                MAIS POPULAR
              </div>
              <CardHeader className="text-center pb-0">
                <h3 className="text-2xl font-bold text-orange-600">Básico</h3>
                <p className="mt-2 text-gray-600">Para restaurantes em crescimento</p>
                <p className="mt-4 text-4xl font-extrabold text-orange-600">R$49<span className="text-xl font-medium text-gray-500">/mês</span></p>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Tudo do Plano Grátis
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Cardápio Digital Completo
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Galeria de Fotos
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Integração com Redes Sociais
                  </li>
                </ul>
                <Button className="mt-8 w-full bg-orange-500 text-white hover:bg-orange-600">
                  Assinar Plano Básico
                </Button>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="flex flex-col justify-between border-2 border-gray-200 shadow-lg rounded-lg">
              <CardHeader className="text-center pb-0">
                <h3 className="text-2xl font-bold text-gray-900">Premium</h3>
                <p className="mt-2 text-gray-600">Para o máximo destaque</p>
                <p className="mt-4 text-4xl font-extrabold text-gray-900">R$99<span className="text-xl font-medium text-gray-500">/mês</span></p>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Tudo do Plano Básico
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Destaque na Busca
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Análises de Desempenho
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Suporte Prioritário 24/7
                  </li>
                </ul>
                <Button className="mt-8 w-full bg-primary text-white hover:bg-primary/90">
                  Assinar Plano Premium
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Live Preview Section */}
      {mockPremiumRestaurant && (
        <div className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
              Veja como seu perfil pode ficar
            </h2>
            <div className="border rounded-lg overflow-hidden shadow-xl">
              <PremiumProfileLayout
                restaurant={mockPremiumRestaurant}
                toggleFavorite={() => { /* no-op for mock */ }}
                isFavoriteMutating={false}
                isCompact={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            Perguntas Frequentes
          </h2>
          <div className="space-y-6">
            {/* Add FAQ items here */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Posso cancelar a qualquer momento?</CardTitle>
              </CardHeader>
              <CardContent>
                Sim, você pode cancelar sua assinatura a qualquer momento. Não há contratos de longo prazo.
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Como faço para fazer o upgrade?</CardTitle>
              </CardHeader>
              <CardContent>
                Após escolher seu plano, você será guiado por um processo simples de pagamento e configuração.
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;