import React from 'react';
import { MapPin, Star, Clock, Utensils, MessageSquare, Phone, Globe, Heart, Home, Search, User, Crown, Zap, ArrowLeft, Share2, Check, X, CreditCard, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Mock data for Premium view based on the new HTML structure
const mockRestaurantPremium = {
  name: "NAU – Frutos do Mar",
  rating: 4.7,
  reviews: "1.2k",
  followers: 0,
  coverImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuBfY3prF-cry5ZdH1L60O3sdcAoSp5JnpOPJ8rHsRIdHfjJP0Rcuyfeit4j7rSPpjsxpFhJrizQVNSW6C02ke-UZ8p7UUmBRCkp5hDM8-eByVyxEhaU3rpWHnGOwikCqBmTVXfQc2t2P4RUke_Un1s_BKK6HFVmEC6dXQpl7TRMTl7GmUmt_rb8xoFjdks3Nqn6pLPFyrflQANLObV0XR6HgoDZS4wcK6qh9HqT69VnB7LEbuzG5JMQ3w678qXOCaFDQQhjd-ET5ZRs",
  logoIcon: "ac_unit", // Usando um ícone placeholder
  address: "Av. Epitácio Pessoa, 1234 - Tambaú",
  hours: "18:00 - 23:00",
  status: "Aberto agora",
  links: [
    { icon: MessageSquare, name: "WhatsApp" },
    { icon: Utensils, name: "iFood" },
    { icon: Globe, name: "Anota aí" },
  ],
  gallery: [
    { src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCFzi7jkjCVqvS390zrinZt4xlLcNkzzYtSmIn_WrjOTg9v4U-RTohLX1PZlwzf9JEOBKdXuhZNaJsfIpv9ugJHlZ8WcmvvUfLI0bt0FemwNEnHJjXcMkTEx_AfvCj89oK7MJbDrndELjRqSN-liueYzp6zZmabkT1lcUw9UIfQHaV0CfX1F963ykUaKyc4GFC1MoE6T7wkA1nw5DufNH9MUzMQ1ahesC9x7hkMzgRbUVJtxZ6GGjMrWXxj7tzCJFG7czqFSZ8B5PWg", title: "Salão principal", span: "col-span-2 row-span-2" },
    { src: "https://lh3.googleusercontent.com/aida-public/AB6AXuD6pQd8iMDEg7CRTey0LFIw_uRWBsYQkxVaNaZqO3eVbOKdhqbqYErl-p6bO_ubGCYQzK-S84G9NCi_854EllE59JyV9LV_D2njoKiM2EHp5-4nUhPHTdTQvEA-n4xJRye-IFv1eIqd6TK8hnyAhO-IZIKWfE6IgUbIY8LUOnVjvcuvP6jhTuq9_3ISCja6DeIC0ZHFVP644tAi6FsOiRaQExp5MpAQqnIsVOI", title: "Prato exclusivo", span: "col-span-1" },
    { src: "https://lh3.googleusercontent.com/aida-public/AB6AXuD0qIxZYzCVo2uUcI6pKYGrWI2KR_gTGgFwabxFdO9ue1wpphH6tmYRJRy0MHsIPhzxgjq-CfXq82OkJXjZRTV05SZwJzgoepbJwOOdeuX2nH-i7CrSwANsOD3XrqGgXUTp2cVboV3eZeI_qElrVYyyZkDRFxa6DY4-pzu5Jd1_R2X6DjJU5_d3pG1NMvh88FOfy_cwEuY6tTcuDeNr81xiWBosT45Gw-wZMX6-1I7tNhPCq6-hiYOg5n9_VcfdD2gDQz_0vpYJYlAn", title: "Culinária refinada", span: "col-span-1" },
  ],
  premiumMenu: [
    { name: "Salada Caprese", description: "Tomate, mussarela de búfala, manjericão e azeite.", price: "35,00", isFeatured: true, imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAsFkCXmRdJGX66v9qV0mbGHcuHBj9F2R68ZhrNQ8XNKXrz7KDAAIAQ3kb5MrumrFsYYiXzZ6mNXw3EJSBXBWcpfv6LllKv1M-RXdyCl4rWYCYX3TcEIeBPO8c66mlIp9ByQ9HnRG5DVey_mwOJZhFZ8N810mpURGdQZ9SnHyhBFQgO66tUBNOxpP2ZNfDz6j1NaWqHEpukxz_MginVhLZU_qLdpYokYO-Am5HzCsxGG2q6156Bz5Pm2Z7nnniK0lASBJ_csfs_S7Hvo" },
    { name: "Ceviche Clássico", description: "Peixe branco fresco, limão, coentro e pimenta.", price: "45,00", isFeatured: false, imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCE9Mk_amwYvhzaFWgZDiBaOdfGaF6dQL7Fo6z95X-I_kXVegMp-zpS-fiv_VyL0Z0IVQ2OmnwjuIGFH0Tko2STE2sXQs2cVxW0bJqqAylml0Rn0D34yp4ESdIp1343r2yhTqz7-MZ9yf64uZq3MJZ3947KTmIPx2GWTFD1VO8DxcWQNeLm6Majq3Fji090y7_2dCbcrLp2Crsbsi4uNUpPvP6jhTuq9_3ISCja6DeIC0ZHFVP644tAi6FsOiRaQExp5MpAQqnIsVOI" },
  ],
};

const RestaurantProfilePreviewPremium: React.FC = () => {
  return (
    <Card className="w-full max-w-md mx-auto border-4 border-highlight shadow-2xl overflow-hidden bg-background-light relative">
      
      {/* Selo Premium (Mantendo o destaque visual) */}
      <div className="absolute top-0 right-0 bg-highlight text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center z-20">
        <Crown className="w-3 h-3 mr-1 fill-white" /> PREMIUM
      </div>

      <div className="relative min-h-screen w-full flex-col">
        
        {/* Seção de Capa e Header */}
        <div className="relative w-full">
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
            <Button variant="ghost" className="flex size-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="flex size-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50">
                <Heart className="w-6 h-6" />
              </Button>
              <Button variant="ghost" className="flex size-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50">
                <Share2 className="w-6 h-6" />
              </Button>
            </div>
          </div>
          <div className="relative w-full h-60">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <img className="w-full h-full object-cover" alt="Imagem de capa noturna do restaurante NAU." src={mockRestaurantPremium.coverImage} />
          </div>
          
          {/* Card de Informações Centrais */}
          <div className="absolute -bottom-24 left-1/2 w-[90%] -translate-x-1/2 transform z-10">
            <div className="flex flex-col items-center justify-start rounded-xl bg-white shadow-lg">
              <div className="relative -mt-10 mb-2">
                <div className="flex size-20 items-center justify-center rounded-full bg-primary ring-4 ring-white border-4 border-highlight">
                  {/* Usando Crown para simbolizar o Premium no logo, já que o ícone original 'ac_unit' não é relevante */}
                  <Crown className="w-10 h-10 text-white fill-highlight" /> 
                </div>
              </div>
              <div className="flex w-full flex-col items-center justify-center gap-1 p-4 pt-0 text-center">
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-primary">{mockRestaurantPremium.name}</p>
                  <Check className="w-4 h-4 text-secondary fill-secondary" /> {/* Ícone de verificado */}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-secondary fill-secondary" />
                    <p className="text-sm text-gray-600">{mockRestaurantPremium.rating} ({mockRestaurantPremium.reviews} avaliações)</p>
                  </div>
                  <p className="text-sm text-gray-600">•</p>
                  <p className="text-sm text-gray-600">{mockRestaurantPremium.followers} seguidores</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Conteúdo Principal */}
        <div className="pt-28 px-4 pb-4">
          
          {/* Botões de Ação */}
          <div className="flex w-full gap-2 justify-center">
            <Button className="flex-1 rounded-lg h-10 px-3 bg-primary text-white text-sm font-bold">Seguir</Button>
            <Button variant="outline" className="flex-1 rounded-lg h-10 px-3 border border-primary text-primary text-sm font-bold">Contatos</Button>
            <Button variant="outline" className="flex-1 rounded-lg h-10 px-3 border border-primary text-primary text-sm font-bold">Convidar</Button>
          </div>

          {/* Navegação de Seções */}
          <div className="mt-6">
            <div className="flex border-b border-gray-200">
              <a className="flex flex-1 flex-col items-center justify-center border-b-2 border-highlight pb-3" href="#" onClick={(e) => e.preventDefault()}>
                <p className="text-sm font-bold text-highlight">Cardápio</p>
              </a>
              <a className="flex flex-1 flex-col items-center justify-center border-b-2 border-transparent pb-3" href="#" onClick={(e) => e.preventDefault()}>
                <p className="text-sm font-bold text-gray-500">Promoções</p>
              </a>
              <a className="flex flex-1 flex-col items-center justify-center border-b-2 border-transparent pb-3" href="#" onClick={(e) => e.preventDefault()}>
                <p className="text-sm font-bold text-gray-500">Fotos</p>
              </a>
              <a className="flex flex-1 flex-col items-center justify-center border-b-2 border-transparent pb-3" href="#" onClick={(e) => e.preventDefault()}>
                <p className="text-sm font-bold text-gray-500">Avaliações</p>
              </a>
            </div>
          </div>

          {/* Canais de Pedido */}
          <div className="mt-6">
            <h2 className="text-lg font-bold text-gray-800">Peça agora pelo seu canal favorito</h2>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {mockRestaurantPremium.links.map((link, index) => (
                <div key={index} className="flex flex-col items-center gap-2 rounded-lg bg-white p-4 shadow-sm border border-highlight/50">
                  <link.icon className="w-8 h-8 text-highlight" />
                  <p className="text-xs font-semibold text-gray-700">{link.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Galeria de Fotos */}
          <div className="mt-8">
            <h2 className="text-lg font-bold text-gray-800">Sinta o ambiente antes de chegar</h2>
            <div className="grid grid-cols-3 gap-2 mt-4 h-64">
              {mockRestaurantPremium.gallery.map((item, index) => (
                <div key={index} className={cn(item.span, "relative rounded-xl overflow-hidden")}>
                  <img className="w-full h-full object-cover" alt={item.title} src={item.src} />
                  <div className="absolute bottom-0 left-0 p-2 bg-gradient-to-t from-black/50 to-transparent w-full">
                    <p className="text-white text-sm font-semibold drop-shadow-md">{item.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cardápio Premium (Destaque) */}
          <div className="mt-8">
            <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 p-4 shadow-lg">
              <Crown className="w-8 h-8 text-white fill-white" />
              <p className="font-bold text-white text-xl drop-shadow-md">Cardápio Premium</p>
            </div>
            
            {/* Navegação do Cardápio */}
            <div className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar">
              <Button className="rounded-full px-4 py-2 bg-primary text-white text-sm font-semibold shrink-0">Entradas</Button>
              <Button variant="outline" className="rounded-full px-4 py-2 bg-transparent text-primary text-sm font-semibold shrink-0">Principais</Button>
              <Button variant="outline" className="rounded-full px-4 py-2 bg-transparent text-primary text-sm font-semibold shrink-0">Sobremesas</Button>
              <Button variant="outline" className="rounded-full px-4 py-2 bg-transparent text-primary text-sm font-semibold shrink-0">Bebidas</Button>
            </div>
            
            {/* Itens do Cardápio */}
            <div className="mt-4 flex flex-col gap-4">
              {mockRestaurantPremium.premiumMenu.map((item, index) => (
                <div key={index} className="flex items-center gap-4 rounded-xl bg-white p-3 shadow-md border-l-4 border-secondary">
                  <img className="size-20 rounded-lg object-cover shrink-0" alt={item.name} src={item.imageUrl} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-primary">{item.name}</h3>
                      {item.isFeatured && <Star className="w-4 h-4 text-secondary fill-secondary" />}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{item.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="font-bold text-primary">R$ {item.price}</p>
                      <Button size="sm" variant="outline" className="rounded-full px-4 py-1 text-xs font-semibold border border-secondary text-secondary hover:bg-secondary/10">Detalhes</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <a className="mt-4 block text-center text-sm font-bold text-primary" href="#" onClick={(e) => e.preventDefault()}>Ver cardápio completo</a>
          </div>

          {/* Informações */}
          <div className="mt-8">
            <h2 className="text-lg font-bold text-primary">Informações</h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <p className="text-sm text-gray-600">{mockRestaurantPremium.address} - <a className="font-bold text-primary" href="#" onClick={(e) => e.preventDefault()}>Ver no mapa</a></p>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <p className="text-sm text-gray-600">{mockRestaurantPremium.hours} <span className="ml-2 font-bold text-green-600">{mockRestaurantPremium.status}</span></p>
              </div>
              <div className="flex items-start gap-3">
                <Utensils className="w-5 h-5 text-primary pt-1" />
                <div>
                  <p className="text-sm font-bold text-primary">Formas de Pagamento</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {/* Simulação de Badges de Pagamento */}
                    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
                      <Zap className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium text-gray-700">PIX</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
                      <CreditCard className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium text-gray-700">Crédito</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
                      <CreditCard className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium text-gray-700">Débito</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
                      <DollarSign className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium text-gray-700">Dinheiro</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RestaurantProfilePreviewPremium;