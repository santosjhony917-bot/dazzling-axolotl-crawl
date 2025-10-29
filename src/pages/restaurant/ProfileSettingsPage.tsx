"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { useAuthData } from '@/hooks/useAuthData'; // Assuming this hook exists for premium status
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { Restaurant } from '@/types';
import { Loader2 } from 'lucide-react';

// Assuming EditFieldDialog and EditAddressDialog are imported or defined elsewhere
// Since they are not provided, I will implement a basic form structure for the fix.

const ProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  // Corrected destructuring based on the updated useRestaurantProfile hook
  const { restaurant, isLoading: profileLoading, updateRestaurant, refetchProfile } = useRestaurantProfile(); 
  // Assuming useAuthData exists and provides isPremium status
  const { isPremium, isLoading: authLoading } = useAuthData(); 

  const [formData, setFormData] = useState<Partial<Restaurant>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name,
        description: restaurant.description || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        category: restaurant.category || '',
        external_url: restaurant.external_url || '',
      });
    }
  }, [restaurant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    setIsSaving(true);
    const result = await updateRestaurant(formData);
    setIsSaving(false);

    if (result.success) {
      toast.success('Perfil atualizado com sucesso!');
      refetchProfile();
    } else {
      toast.error(`Falha ao salvar: ${result.error}`);
    }
  };

  if (profileLoading || authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!restaurant) {
    return <div className="p-4 text-red-500">Nenhum restaurante associado ao usuário.</div>;
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Configurações do Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>Atualize o nome, descrição e categoria do seu restaurante.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Restaurante</Label>
              <Input id="name" value={formData.name || ''} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={formData.description || ''} onChange={handleChange} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria (Ex: Italiana, Japonesa)</Label>
              <Input id="category" value={formData.category || ''} onChange={handleChange} />
            </div>
            
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Placeholder for other settings like Address, Contact, etc. */}
      <Card>
        <CardHeader>
          <CardTitle>Contatos e Links</CardTitle>
          <CardDescription>Gerencie informações de contato e links externos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" value={formData.phone || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="external_url">Link Externo (Site, Cardápio Digital)</Label>
            <Input id="external_url" value={formData.external_url || ''} onChange={handleChange} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettingsPage;