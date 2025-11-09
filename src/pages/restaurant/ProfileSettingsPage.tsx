import { Loader2, Settings, Utensils, Crown, BarChart3, Image as ImageIcon } from 'lucide-react';
import { RestaurantAreaPageLayout } from '@/components/restaurant/RestaurantAreaPageLayout';
import MainProfileCard from '@/components/restaurant/profile/MainProfileCard';
import ProfileHeaderManagement from '@/components/restaurant/profile/ProfileHeaderManagement'; // Import as default
import { Separator } from '@/components/ui/separator';
import { useRestaurantData } from '@/context/RestaurantContext'; // Named import
import { useAuthData } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RestaurantForm from '@/components/restaurant/RestaurantForm'; // Import as default
import GalleryManagement from '@/components/restaurant/GalleryManagement'; // Import as default
import MenuManagement from '@/components/restaurant/MenuManagement'; // Import as default
import UpgradeCard from '@/components/upgrade/UpgradeCard'; // Import as default
import ScheduledMetricsManagement from '@/components/restaurant/ScheduledMetricsManagement'; // Import as default
import BannersManagement from '@/components/restaurant/BannersManagement'; // Import as default

const ProfileSettingsPage = () => {
  const { restaurant, isLoading, refreshRestaurantData } = useRestaurantData();
  const { session } = useAuthData(); // session is now directly available
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !restaurant && session) {
      toast.error("Nenhum restaurante encontrado para o usuário logado.");
    }
  }, [restaurant, isLoading, session]);

  if (isLoading) {
    return (
      <RestaurantAreaPageLayout title="Configurações do Perfil">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!restaurant) {
    return (
      <RestaurantAreaPageLayout title="Configurações do Perfil">
        <div className="text-center py-10">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Você ainda não tem um restaurante cadastrado.
          </p>
          {/* Adicionar um botão para criar restaurante se necessário */}
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout title="Configurações do Perfil">
      <div className="space-y-8 pb-20">
        {/* ProfileHeaderManagement is now part of MainProfileCard or used separately if needed */}
        {/* <ProfileHeaderManagement restaurant={restaurant} /> */}

        <MainProfileCard restaurant={restaurant} />

        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Informações do Restaurante
          </h2>
          <RestaurantForm restaurant={restaurant} onUpdate={refreshRestaurantData} />
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Utensils className="h-6 w-6 text-primary" />
            Gerenciar Cardápio
          </h2>
          <MenuManagement restaurantId={restaurant.id} />
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" /> {/* Using ImageIcon alias */}
            Gerenciar Galeria
          </h2>
          <GalleryManagement restaurantId={restaurant.id} />
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            Gerenciar Plano
          </h2>
          <UpgradeCard restaurant={restaurant} />
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> {/* BarChart3 imported */}
            Gerenciar Métricas Agendadas
          </h2>
          <ScheduledMetricsManagement restaurantId={restaurant.id} />
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" /> {/* Using ImageIcon alias */}
            Gerenciar Banners
          </h2>
          <BannersManagement restaurantId={restaurant.id} />
        </section>
      </div>
    </RestaurantAreaPageLayout>
  );
};

export default ProfileSettingsPage;