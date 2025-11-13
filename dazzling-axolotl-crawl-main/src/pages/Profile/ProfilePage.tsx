"use client";

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { PROFILES_BUCKET } from '@/integrations/supabase/storage';
import { Settings, LogOut, ArrowLeft, Edit, FileText, MapPin, Clock, Utensils, ImageIcon as GalleryIcon, Globe, CreditCard, Briefcase, Phone } from 'lucide-react';
import { Restaurant } from '@/types/supabase';

const SettingsCard = ({ title, description, link, icon: Icon }) => (
  <Link to={link} className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200">
    <div className="flex items-center">
      <Icon className="w-6 h-6 mr-4 text-primary" />
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <Edit className="w-5 h-5 ml-auto text-gray-400" />
    </div>
  </Link>
);

const ProfilePage = () => {
  const { user, profile, setProfile } = useAuth();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchRestaurantData = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: "exact one row not found"
        toast.error('Erro ao buscar dados do restaurante.');
        console.error(error);
      }
      setRestaurant(data);
      setIsLoading(false);
    };

    fetchRestaurantData();
  }, [user, navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao fazer logout.');
    } else {
      navigate('/login');
    }
  };

  const handleAvatarUpload = async (url: string) => {
    if (!user || !profile) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, avatar_url: url });
      toast.success('Avatar atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
      toast.error('Não foi possível atualizar o avatar.');
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-32 w-32 rounded-full mx-auto mb-6" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Meu Perfil</title>
      </Helmet>
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-50 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="p-2 -ml-2">
              <ArrowLeft />
            </Link>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações do Perfil
            </h1>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center mb-8">
          <div className="relative z-0 w-32 h-32 mb-4">
            <img
              src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.first_name}+${profile.last_name}`}
              alt="Avatar"
              className="w-full h-full rounded-full object-cover border-4 border-white shadow-md"
            />
            <ImageUploadButton
              onUploadComplete={handleAvatarUpload}
              bucketName={PROFILES_BUCKET}
              folderPath={`${user?.id}`}
            />
          </div>
          <h2 className="text-2xl font-bold">{profile.first_name} {profile.last_name}</h2>
          <p className="text-gray-600">{user?.email}</p>
        </div>

        {restaurant ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-3">Meu Restaurante: {restaurant.name}</h3>
              <div className="space-y-3">
                <SettingsCard title="Informações Básicas" description="Nome, categoria e CNPJ" link={`/restaurant/${restaurant.id}/settings`} icon={FileText} />
                <SettingsCard title="Contatos" description="E-mail e Telefone" link={`/restaurant/${restaurant.id}/edit/contact`} icon={Phone} />
                <SettingsCard title="Endereço e Horários" description="Localização e funcionamento" link={`/restaurant/${restaurant.id}/settings`} icon={MapPin} />
                <SettingsCard title="Cardápio e Galeria" description="Itens, categorias e fotos" link={`/restaurant/${restaurant.id}/settings`} icon={Utensils} />
                <SettingsCard title="Pedidos e Pagamentos" description="Canais de venda e métodos" link={`/restaurant/${restaurant.id}/settings`} icon={Globe} />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 px-4 bg-white rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">Você ainda não tem um restaurante.</h3>
            <p className="text-gray-600 mb-4">Crie a página do seu restaurante e comece a divulgar seu cardápio agora mesmo.</p>
            <Button asChild>
              <Link to="/restaurant/new">Criar meu Restaurante</Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default ProfilePage;