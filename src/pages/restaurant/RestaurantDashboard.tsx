import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Camera, Building2, MapPin, Clock, Phone, Mail, CreditCard, Bell, Package, HelpCircle, MessageSquare, FileCheck, LogOut, Crown, Sparkles, ChevronRight, FileText, UtensilsCrossed, Eye, Check, Lock, Edit, Store, Badge as BadgeIcon, BarChart3, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurantProfile } from "@/hooks/useRestaurantProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useImageUpload } from "@/hooks/useImageUpload";
import RestaurantBottomNav from "@/components/restaurant/RestaurantBottomNav";
import EditFieldDialog from "@/components/EditFieldDialog";
import { EditHoursDialog } from "@/components/EditHoursDialog";
import { EditAddressDialog } from "@/components/EditAddressDialog";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import restaurantLogo from "@/assets/restaurant-logo.png";
import { z } from "zod";
import { WeekSchedule, DaySchedule } from "@/types/schedule";
import { geocodeAddress } from "@/services/geocoding";
import { supabase } from "@/integrations/supabase/client";
import { createPageUrl } from "@/utils/url";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import HighlightCard from "@/components/restaurant/HighlightCard";
import NearbyRestaurantCard from "@/components/restaurant/NearbyRestaurantCard";
import useEmblaCarousel from 'embla-carousel-react';

// Mock Data para o novo dashboard
const mockHighlights = [
  { id: 'h1', name: 'Hambúrguer Gourmet', restaurantName: 'Burger Joint', price: 35.00, imageUrl: 'https://images.unsplash.com/photo-1568901346537-21b8284b7423?q=80&w=2070&auto=format&fit=crop' },
  { id: 'h2', name: 'Moqueca de Camarão', restaurantName: 'Restaurante do Mar', price: 75.00, imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2070&auto=format&fit=crop' },
  { id: 'h3', name: 'Sushi Variado', restaurantName: 'Sushi House', price: 90.00, imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=2074&auto=format&fit=crop' },
];

const mockNearbyRestaurants = [
  { id: 'r1', name: 'Trattoria del Ponte', cuisine: 'Italiana', distance: 1.2, rating: 4.7, imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=2074&auto=format&fit=crop' },
  { id: 'r2', name: 'Sakura Sushi', cuisine: 'Japonesa', distance: 2.5, rating: 4.9, imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop' },
  { id: 'r3', name: 'Le Petit Bistrot', cuisine: 'Francesa', distance: 3.1, rating: 4.6, imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop' },
];

// Dados do Carrossel de Upgrade
const upgradeSlides = [
  {
    title: "Torne-se Premium!",
    subtitle: "Apareça para mais clientes e aumente suas vendas.",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2070&auto=format&fit=crop",
    overlayColor: "bg-primary/70"
  },
  {
    title: "Posição #1 Garantida",
    subtitle: "Seu restaurante sempre no topo dos resultados de busca.",
    imageUrl: "https://images.unsplash.com/photo-1551782450-a2132b4ba213d?q=80&w=2069&auto=format&fit=crop",
    overlayColor: "bg-accent/70"
  },
  {
    title: "Estatísticas de Lucro",
    subtitle: "Acompanhe o desempenho e otimize seus ganhos.",
    imageUrl: "https://images.unsplash.com/photo-1554224155-6726b1ff8582?q=80&w=2070&auto=format&fit=crop",
    overlayColor: "bg-primary/70"
  },
];


const RestaurantDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // --- Embla Carousel Setup ---
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Mock restaurant ID for development until proper auth flow is implemented
  const MOCK_RESTAURANT_ID = "a1b2c3d4-e5f6-7890-1234-567890abcdef"; 
  const { restaurant, loading: restaurantLoading, updateRestaurant, refetch } = useRestaurantProfile(MOCK_RESTAURANT_ID);
  
  const { isPremium } = useUserRole(); // Using mock hook

  // Lógica de transição automática
  useEffect(() => {
    if (!emblaApi) return;

    const autoplay = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000); // Troca a cada 5 segundos

    emblaApi.on('select', () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    });

    return () => clearInterval(autoplay);
  }, [emblaApi]);

  // Lógica de clique nos indicadores
  const scrollTo = useCallback((index: number) => {
    emblaApi?.scrollTo(index);
  }, [emblaApi]);


  // --- Funções de Navegação ---
  const handleGoToMenu = () => navigate(createPageUrl('restaurant-area/menu'));
  const handleGoToStats = () => navigate(createPageUrl('restaurant-area/stats'));
  const handleGoToUpgrade = () => navigate(createPageUrl('restaurant-area/upgrade'));
  const handleGoToRestaurantProfile = (id: string) => navigate(createPageUrl(`restaurant-profile/${id}`));
  
  // --- Dados do Restaurante (Simplificados para o Dashboard) ---
  const restaurantName = restaurant?.name || "Seu Restaurante";
  const locationLabel = restaurant?.city || "Localização Não Definida";

  if (restaurantLoading) {
    return (
      <div className="min-h-screen bg-background-light p-4 pb-20 max-w-md mx-auto">
        <Skeleton className="h-16 w-full mb-4" />
        <Skeleton className="h-20 w-full mb-6" />
        <Skeleton className="h-40 w-full rounded-xl mb-6" />
        <Skeleton className="h-6 w-3/4 mb-4" />
        <div className="flex gap-4 overflow-x-auto">
          <Skeleton className="h-64 min-w-[280px] rounded-xl" />
          <Skeleton className="h-64 min-w-[280px] rounded-xl" />
        </div>
        <RestaurantBottomNav selectedTab="home" isFree={!isPremium} />
      </div>
    );
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-light dark:bg-background-dark">
      <div className="flex-1 pb-24">
        
        {/* Header de Localização */}
        <div className="flex items-center p-4 justify-between bg-background-light dark:bg-background-dark">
          <div className="flex items-center gap-2">
            <MapPin className="text-primary w-7 h-7" />
            <div>
              <p className="text-text-light/60 dark:text-text-dark/60 text-xs font-medium">
                Sua Localização
              </p>
              <h2 className="text-primary dark:text-text-dark text-base font-bold leading-tight">
                {locationLabel}
              </h2>
            </div>
          </div>
          <Button 
            onClick={() => navigate(createPageUrl('restaurant-area/profile-menu'))}
            className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 w-12 bg-primary/10"
            variant="ghost"
            size="icon"
          >
            <Store className="text-primary w-7 h-7" />
          </Button>
        </div>

        {/* Botões de Ação Rápida */}
        <div className="px-4 pt-3 pb-5 bg-background-light dark:bg-background-dark">
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={handleGoToMenu}
              className="flex items-center justify-center w-full h-16 px-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm text-center hover:bg-gray-50 dark:hover:bg-zinc-700"
              variant="ghost"
            >
              <Edit className="text-primary w-5 h-5 mr-2" />
              <div className="text-text-light dark:text-text-dark text-sm font-medium leading-tight text-center">
                <span>Editar</span><br/><span>Cardápio</span>
              </div>
            </Button>
            <Button 
              onClick={handleGoToStats}
              className="flex items-center justify-center w-full h-16 px-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm text-center hover:bg-gray-50 dark:hover:bg-zinc-700"
              variant="ghost"
            >
              <BarChart3 className="text-accent w-5 h-5 mr-2" />
              <div className="text-text-light dark:text-text-dark text-sm font-medium leading-tight text-center">
                <span>Ver</span><br/><span>Estatísticas</span>
              </div>
            </Button>
          </div>
        </div>

        {/* Banner de Upgrade (Carrossel) */}
        <div className="px-4 pb-5">
          <div className="relative rounded-xl overflow-hidden bg-primary text-white">
            <div className="embla" ref={emblaRef}>
              <div className="embla__container flex">
                {upgradeSlides.map((slide, index) => (
                  <div key={index} className="embla__slide flex-shrink-0 w-full">
                    <div 
                      className="w-full bg-center bg-no-repeat aspect-[2.5/1] bg-cover flex flex-col p-6 items-start justify-center transition-opacity duration-1000" 
                      style={{ backgroundImage: `url("${slide.imageUrl}")` }}
                    >
                      <div className={cn("absolute inset-0", slide.overlayColor)}></div>
                      <div className="relative z-10">
                        <h3 className="text-xl font-bold">{slide.title}</h3>
                        <p className="text-sm mt-1 max-w-xs">{slide.subtitle}</p>
                        <Button 
                          onClick={handleGoToUpgrade}
                          className="bg-highlight text-white font-semibold py-2 px-4 rounded-full text-sm mt-4 hover:bg-highlight/90"
                        >
                          Saiba Mais
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Indicadores do Carrossel */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {upgradeSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollTo(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors duration-300",
                    selectedIndex === index ? "bg-white" : "bg-white/50"
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Destaques do Dia */}
        <div className="bg-background-light dark:bg-background-dark">
          <div className="flex justify-between items-center px-4 pb-3 pt-0">
            <h2 className="text-text-light dark:text-text-dark text-xl font-bold leading-tight">
              Destaques do Dia
            </h2>
            <a className="text-accent text-sm font-semibold hover:underline" href="#">
              Ver todos
            </a>
          </div>
          <div className="flex overflow-x-auto pb-4 hide-scrollbar">
            <div className="flex items-stretch px-4 pt-0 gap-4">
              {mockHighlights.map(item => (
                <HighlightCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>

        {/* Restaurantes Próximos */}
        <div className="bg-background-light dark:bg-background-dark px-4 py-5">
          <div className="flex justify-between items-center pb-3">
            <h2 className="text-text-light dark:text-text-dark text-xl font-bold leading-tight">
              Restaurantes Próximos
            </h2>
            <a className="text-accent text-sm font-semibold hover:underline" href="#">
              Ver todos
            </a>
          </div>
          <div className="flex flex-col gap-4">
            {mockNearbyRestaurants.map(item => (
              <NearbyRestaurantCard 
                key={item.id} 
                item={item} 
                onClick={() => handleGoToRestaurantProfile(item.id)} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full max-w-md mx-auto z-30">
        <RestaurantBottomNav selectedTab="home" isFree={!isPremium} />
      </div>
    </div>
  );
};

export default RestaurantDashboard;