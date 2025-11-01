"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User as UserIcon, Phone, Mail } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import ClientBasicInfoSection from '@/components/ClientBasicInfoSection';

const ClientProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isProfileLoading, refetchProfile } = useAuthData(); // Corrigido: usando 'isProfileLoading' e 'refetchProfile'
  const { updateProfile } = useProfile(user);

  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) {
      showError('Usuário não autenticado.');
      return;
    }

    const updatedFields = {
      first_name: firstName,
      last_name: lastName,
      phone: phone,
    };

    try {
      await updateProfile(updatedFields);
      await refetchProfile(); // Refetch para atualizar o contexto
      showSuccess('Perfil atualizado com sucesso!');
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      showError('Erro ao atualizar perfil. Tente novamente.');
    }
  };

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="p-4 space-y-8 max-w-md mx-auto">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <UserIcon className="h-8 w-8 text-[#022D68]" />
        <h1 className="text-3xl font-bold text-[#022D68]">Meu Perfil</h1>
      </div>

      {/* Basic Info Section */}
      <ClientBasicInfoSection profile={profile} isLoading={isProfileLoading} />

      {/* Profile Edit Form */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-[#022D68] mb-4">Informações Pessoais</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="firstName">Nome</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="lastName">Sobrenome</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email || ''}
              disabled
              className="bg-gray-100"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                // Reset fields if canceling edit
                setFirstName(profile?.first_name || '');
                setLastName(profile?.last_name || '');
                setPhone(profile?.phone || '');
              }}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Salvar</Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Editar</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientProfilePage;