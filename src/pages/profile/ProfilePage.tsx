"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

const ProfilePage: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [session, navigate]);

  const fetchProfile = async () => {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching profile:', error);
      toast.error('Erro ao carregar perfil.');
    } else if (data) {
      setProfile(data);
    }
    setLoading(false);
  };

  const handleAvatarUploadComplete = async (url: string) => {
    setUploading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq('id', profile?.id);

    if (error) {
      console.error('Error updating avatar URL:', error);
      toast.error('Erro ao atualizar o avatar.');
    } else {
      setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
      toast.success('Avatar atualizado com sucesso!');
    }
    setUploading(false);
  };

  if (loading || !profile) {
    return <div className="p-4 text-center">Carregando perfil...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Meu Perfil</h1>
      
      <ProfileHeader 
        profile={profile} 
        onAvatarUploadComplete={handleAvatarUploadComplete} 
        uploading={uploading}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Primeiro Nome</Label>
              <Input id="firstName" value={profile.first_name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input id="lastName" value={profile.last_name || ''} disabled />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={session?.user.email || ''} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" value={profile.phone || ''} disabled />
          </div>
          <Button disabled>Editar Informações (Em breve)</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;