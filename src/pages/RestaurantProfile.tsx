import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Heart, Share2, Utensils, BadgeCheck, Star, MessageSquare, BookOpen, Receipt, Crown, MapPin, Clock, CreditCard, QrCode, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// --- Mock Data Structures ---

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isFavorite: boolean;
}

interface GalleryItem {
  imageUrl: string;
  caption: string;
  span: 'col-span-2 row-span-2' | 'col-span-1';
}

interface RestaurantProfileData {
  id: string;
  name: string;
  isVerified: boolean;
  rating: number;
  reviewsCount: number;
  followersCount: number;
  coverImageUrl: string;
  profileIcon: React.ElementType;
  address: string;
  mapLink: string;
  openingHours: string;
  isOpen: boolean;
  paymentMethods: { icon: React.ElementType; label: string }[];
  menuCategories: string[];
  menuItems: MenuItem[];
  gallery: GalleryItem[];
}

// --- Mock Data ---

const mockRestaurantData: RestaurantProfileData = {
  id: 'nau',
  name: 'NAU – Frutos do Mar',
  isVerified: true,
  rating: 4.7,
  reviewsCount: 1200,
  followersCount: 0,
  coverImageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBfY3prF-cry5ZdH1L60O3sdcAoSp5JnpOPJ8rHsRIdHfjJP0Rcuyfeit4j7rSPpjsxpFhJrizQVNSW6C02ke-UZ8p7UUmBRCkp5hDM8-eByVyxEhaU3rpWHnGOwikCqBmTVXfQc2t2P4RUke_Un1s_BKK6HFVmEC6dXQpl7TRMTl7GmUmt_rb8xoFjdks3Nqn6pLPFyrflQANLObV0XR6HgoDZS4wcK6qh9HqT69VnB7LEbuzG5JMQ3w678qXOCaFDQQhjd-ET5ZRs",
  profileIcon: Utensils,
  address: 'Av. Epitácio Pessoa, 1234 - Tambaú',
  mapLink: '#',
  openingHours: '18:00 - 23:00',
  isOpen: true,
  paymentMethods: [
    { icon: QrCode, label: 'PIX' },
    { icon: CreditCard, label: 'Crédito' },
    { icon: CreditCard, label: 'Débito' },
    { icon: DollarSign, label: 'Dinheiro' },
  ],
  menuCategories: ['Entradas', 'Principais', 'Sobremesas', 'Bebidas'],
  menuItems: [
    { id: '1', name: 'Salada Caprese', description: 'Tomate, mussarela de búfala, manjericão e azeite.', price: 35.00, imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsFkCXmRdJGX66v9qV0mbGHcuHBj9F2R68ZhrNQ8XNKXrz7KDAAIAQ3kb5MrumrFsYYiXzZ6mNXw3EJSBXBWcpfv6LllKv1M-RXdyCl4rWYCYX3TcEIeBPO8c6mlIp9ByQ9HnRG5DVey_mwOJZhFZ8N810mpURGdQZ9SnHyhBFQgO66tUBNOxpP2ZNfDz6j1NaWqHEpukxz_MginVhLZU_qLdpYokYO-Am5HzCsxGG2q6156Bz5Pm2Z7nnniK0lASBJ_csfs_S7Hvo', isFavorite: true },
    { id: '2', name: 'Ceviche Clássico', description: 'Peixe branco fresco, limão, coentro e pimenta.', price: 45.00, imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCE9Mk_amwYvhzaFWgZDiBaOdfGaF6dQL7Fo6z95X-I_kXVegMp-zpS-fiv_VyL0Z0IVQ2OmnwjuIGFH0Tko2STE2sXQs2cVxW0bJqqAylml0Rn0D34yp4ESdIp1343r2yhTqz7-MZ9yf64uZq3MJZ3947KTmIPx2GWTFD1VO8DxcWQNeLm6Majq3Fji090y7_2dCbcrLp2Crsbsi4uNUpPvP6jhTuq9_3ISCja6DeIC0ZHFVP644tAi6FsOiRaQExp5MpAQqnIsVOI', isFavorite: false },
  ],
  gallery: [
    { imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFzi7jkjCVqvS390zrinZt4xlLcNkzzYtSmIn_WrjOTg9v4U-RTohLX1PZlwzf9JEOBKdXuhZNaJsfIpv9ugJHlZ8WcmvvUfLI0bt0FemwNEnHJjXcMkTEx_AfvCj89oK7MJbDrndELjRqSN-liueYzp6zZmabkT1lcUw9UIfQHaV0CfX1F963ykUaKyc4GFC1MoE6T7wkA1nw5DufNH9MUzMQ1ahesC9x7hkMzgRbUVJtxZ6GGjMrWXxj7tzCJFG7czqFSZ8B5PWg', caption: 'Salão principal', span: 'col-span-2 row-span-2' },
    { imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6pQd8iMDEg7CRTey0LFIw_uRWBsYQkxVaNaZqO3eVbOKdhqbqYErl-p6bO_ubGCYQzK-S84G9NCi_854EllE59JyV9LV_D2njoKiM2EHp5-4nUhPHTdTQvEA-n4xJRye-IFv1eIqd6TK8hnyAhO-IZIKWfE6IgUbIY8LUOnVjvcuqPNkvqL3mazbhOQIPx2GWTFD1VO8DxcWQNeLm6Majq3Fji090y7_2dCbcrLp2Crsbsi4uNUpPvP6jhTuq9_3ISCja6DeIC0ZHFVP644tAi6FsOiRaQExp5MpAQqnIsVOI', caption: 'Prato exclusivo', span: 'col-span-1' },
    { imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0qIxZYzCVo2uUcI6pKYGrWI2KR_gTGgFwabxFdO9ue1wpphH6tmYRJRy0MHsIPhzxgjq-CfXq82OkJXjZRTV05SZwJzgoepbJwOOdeuX2nH-i7CrSwANsOD3XrqGgXUTp2cVboV3eZeI_qElrVYyyZkDRFxa6DY4-pzu5Jd1_R2X6DjJU5_d3pG1NMvh88FOfy_cwEuY6tTcuDeNr81xiWBosT45Gw-wZMX6-1I7tNhPCq6-hiYOg5n9_VcfdD2gDQz_0vpYJYlAn', caption: 'Culinária refinada', span: 'col-span-1' },
  ],
};

const RestaurantProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RestaurantProfileData>(mockRestaurantData);
  const [activeCategory, setActiveCategory] = useState(data.menuCategories[0]);

  // Placeholder for fetching data based on ID
  // useEffect(() => {
  //   // Fetch data based on ID
  // }, [id]);

  const ProfileIcon = data.profileIcon;

  const GalleryImage = ({ item }: { item: GalleryItem }) => (
    <div className={cn("relative h-full rounded-xl overflow-hidden", item.span)}>
      <img className="w-full h-full object-cover" alt={item.caption} src={item.imageUrl} />
      <div className="absolute bottom-0 left-0 p-2 bg-gradient-to-t from-black/50 to-transparent w-full">
        {/* Note: text-shadow utility is not defined in our tailwind config, using standard text-white */}
        <p className="text-white text-sm font-semibold">{item.caption}</p>
      </div>
    </div>
  );

  const MenuItemCard = ({ item }: { item: MenuItem }) => (
    <div className="flex items-center gap-4 rounded-xl bg-white p-3 shadow-sm">
      <img className="size-20 rounded-lg object-cover" alt={item.name} src={item.imageUrl} />
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-[#022D68]">{item.name}</h3>
          {item.isFavorite && (
            <Star className="w-4 h-4 text-[#E47948] fill-[#E47948]" />
          )}
        </div>
        <p className="text-sm text-gray-700 mt-1 line-clamp-2">{item.description}</p>
        <div className="flex justify-between items-center mt-2">
          <p className="font-bold text-[#022D68]">R$ {item.price.toFixed(2).replace('.', ',')}</p>
          <Button variant="outline" className="rounded-full px-4 py-1 h-7 text-xs font-semibold border-[#E47948] text-[#E47948] hover:bg-[#E47948]/5">Detalhes</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen w-full flex-col bg-[#f5f7f8]">
      {/* Cover Section */}
      <div className="relative w-full">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="flex size-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="flex size-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50">
              <Heart className="w-6 h-6" />
            </Button>
            <Button variant="ghost" size="icon" className="flex size-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50">
              <Share2 className="w-6 h-6" />
            </Button>
          </div>
        </div>
        
        <div className="relative w-full h-60">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <img className="w-full h-full object-cover" alt={`Capa do restaurante ${data.name}`} src={data.coverImageUrl} />
        </div>
        
        {/* Floating Info Card */}
        <div className="absolute -bottom-24 left-1/2 w-[90%] -translate-x-1/2 transform">
          <div className="flex flex-col items-center justify-start rounded-xl bg-white shadow-lg">
            <div className="relative -mt-10 mb-2">
              <div className="flex size-20 items-center justify-center rounded-full bg-[#022D68] ring-4 ring-white">
                <ProfileIcon className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="flex w-full flex-col items-center justify-center gap-1 p-4 pt-0 text-center">
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-[#022D68]">{data.name}</p>
                {data.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-[#E47948] fill-[#E47948]" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#E47948] fill-[#E47948]" />
                  <p className="text-sm text-gray-600">{data.rating.toFixed(1)} ({data.reviewsCount / 1000}k avaliações)</p>
                </div>
                <p className="text-sm text-gray-600">•</p>
                <p className="text-sm text-gray-600">{data.followersCount} seguidores</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-28 px-4 pb-8 max-w-md mx-auto w-full">
        
        {/* Action Buttons */}
        <div className="flex w-full gap-2 justify-center">
          <Button className="flex-1 rounded-full h-10 px-3 bg-[#022D68] text-white text-sm font-bold hover:bg-[#022D68]/90">Seguir</Button>
          <Button variant="outline" className="flex-1 rounded-full h-10 px-3 border border-[#022D68] text-[#022D68] text-sm font-bold hover:bg-[#022D68]/5">Contatos</Button>
          <Button variant="outline" className="flex-1 rounded-full h-10 px-3 border border-[#022D68] text-[#022D68] text-sm font-bold hover:bg-[#022D68]/5">Convidar</Button>
        </div>

        {/* Navigation Tabs (Menu, Promotions, Photos, Reviews) */}
        <div className="mt-6">
          <div className="flex border-b border-gray-200">
            <a className="flex flex-1 flex-col items-center justify-center border-b-2 border-[#022D68] pb-3" href="#">
              <p className="text-sm font-bold text-[#022D68]">Cardápio</p>
            </a>
            <a className="flex flex-1 flex-col items-center justify-center border-b-2 border-transparent pb-3 hover:border-gray-300 transition-colors" href="#">
              <p className="text-sm font-bold text-gray-500 hover:text-gray-700">Promoções</p>
            </a>
            <a className="flex flex-1 flex-col items-center justify-center border-b-2 border-transparent pb-3 hover:border-gray-300 transition-colors" href="#">
              <p className="text-sm font-bold text-gray-500 hover:text-gray-700">Fotos</p>
            </a>
            <a className="flex flex-1 flex-col items-center justify-center border-b-2 border-transparent pb-3 hover:border-gray-300 transition-colors" href="#">
              <p className="text-sm font-bold text-gray-500 hover:text-gray-700">Avaliações</p>
            </a>
          </div>
        </div>

        {/* Order Channels */}
        <div className="mt-6">
          <h2 className="text-lg font-bold text-[#022D68]">Peça agora pelo seu canal favorito</h2>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="flex flex-col items-center gap-2 rounded-lg bg-white p-4 shadow-sm border border-gray-200">
              <MessageSquare className="w-7 h-7 text-[#022D68]" />
              <p className="text-xs font-semibold text-gray-700">WhatsApp</p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg bg-white p-4 shadow-sm border border-gray-200">
              <BookOpen className="w-7 h-7 text-[#022D68]" />
              <p className="text-xs font-semibold text-gray-700">iFood</p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg bg-white p-4 shadow-sm border border-gray-200">
              <Receipt className="w-7 h-7 text-[#022D68]" />
              <p className="text-xs font-semibold text-gray-700">Anota aí</p>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-[#022D68]">Sinta o ambiente antes de chegar</h2>
          <div className="grid grid-cols-3 gap-2 mt-4 h-[320px]">
            {data.gallery.map((item, index) => (
              <GalleryImage key={index} item={item} />
            ))}
          </div>
        </div>

        {/* Menu Section */}
        <div className="mt-8">
          {/* Premium Banner */}
          <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 p-4 shadow-lg">
            <Crown className="w-7 h-7 text-white fill-white" />
            <p className="font-bold text-white">Cardápio Premium</p>
          </div>
          
          {/* Category Filters */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 whitespace-nowrap">
            {data.menuCategories.map((category) => (
              <Button
                key={category}
                onClick={() => setActiveCategory(category)}
                variant={activeCategory === category ? 'default' : 'outline'}
                className={cn(
                  "rounded-full px-4 py-2 h-9 text-sm font-semibold shrink-0",
                  activeCategory === category 
                    ? "bg-[#022D68] text-white hover:bg-[#022D68]/90" 
                    : "bg-transparent text-[#022D68] border-[#022D68] hover:bg-[#022D68]/5"
                )}
              >
                {category}
              </Button>
            ))}
          </div>
          
          {/* Menu Items List */}
          <div className="mt-4 flex flex-col gap-4">
            {data.menuItems.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
          
          <a className="mt-4 block text-center text-sm font-bold text-[#022D68] hover:underline" href="#">Ver cardápio completo</a>
        </div>

        {/* Information Section */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-[#022D68]">Informações</h2>
          <div className="mt-4 space-y-4">
            {/* Address */}
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-[#022D68] shrink-0" />
              <p className="text-sm text-gray-600">
                {data.address} - 
                <a className="font-bold text-[#022D68] hover:underline ml-1" href={data.mapLink}>Ver no mapa</a>
              </p>
            </div>
            
            {/* Hours */}
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#022D68] shrink-0" />
              <p className="text-sm text-gray-600">
                {data.openingHours} 
                <span className={cn("ml-2 font-bold", data.isOpen ? "text-green-600" : "text-red-600")}>
                  {data.isOpen ? "Aberto agora" : "Fechado"}
                </span>
              </p>
            </div>
            
            {/* Payment Methods */}
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-[#022D68] pt-1 shrink-0" />
              <div>
                <p className="text-sm font-bold text-[#022D68]">Formas de Pagamento</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {data.paymentMethods.map((method, index) => {
                    const Icon = method.icon;
                    return (
                      <div key={index} className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
                        <Icon className="w-4 h-4 text-[#022D68]" />
                        <span className="text-xs font-medium text-gray-700">{method.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantProfile;