"use client";

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../hooks/useAuth'; // Corrected import path
import { supabase } from '../integrations/supabase/client'; // Corrected import path
import { toast } from 'sonner';

const Profile: React.FC = () => {
  const { user, profile, isLoading, isLoggedIn } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error('Erro ao salvar perfil: ' + error.message);
      console.error('Error saving profile:', error);
    } else {
      toast.success('Perfil atualizado com sucesso!');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="container mx-auto p-4">Carregando perfil...</div>;
  }

  if (!isLoggedIn) {
    return <div className="container mx-auto p-4">Por favor, faça login para ver seu perfil.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-[#022D68]">Meu Perfil</h1>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
        <div className="mb-4">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={user?.email || ''} disabled className="bg-gray-100" />
        </div>
        <div className="mb-4">
          <Label htmlFor="firstName">Primeiro Nome</Label>
          <Input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="lastName">Sobrenome</Label>
          <Input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <div className="mb-6">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <Button variant="link" asChild>
          <Link to="/dashboard">Voltar para o Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default Profile;