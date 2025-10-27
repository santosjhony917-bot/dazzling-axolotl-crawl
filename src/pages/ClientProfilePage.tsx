"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, User, ChevronRight, Phone, Mail, Heart, MapPin, Settings, HelpCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useProfile } from '@/hooks/useProfile';
import EditClientFieldDialog from '@/components/EditClientFieldDialog';
import { toast } from 'react-hot-toast';

interface NavCardItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
}

const NavCardItem: React.FC<NavCardItemProps> = ({ icon, title, description, to }) => (
  <Link to={to} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
    <div className="flex items-center space-x-4">
      <div className="text-primary">{icon}</div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
    <ChevronRight className="w-4 h-4 text-gray-400" />
  </Link>
);

const ClientProfilePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { profile, isLoading, updateProfileField } = useProfile();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editField, setEditField] = useState<'first_name' | 'phone' | null>(null);
  const [initialValue, setInitialValue] = useState('');

  const handleSignOut = async () => {
    await signOut();
    toast.success('Você saiu da sua conta.');
    navigate('/');
  };

  const handleEditClick = (field: 'first_name' | 'phone') => {
    setEditField(field);
    setInitialValue(field === 'first_name' ? profile?.first_name || '' : profile?.phone || '');
    setIsEditing(true);
  };

  const handleSave = async (value: string) => {
    if (!editField) return;

    try {
      await updateProfileField(editField, value);
      toast.success(`${editField === 'first_name' ? 'Nome' : 'Telefone'} atualizado com sucesso!`);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Falha ao atualizar. Tente novamente.');
    } finally {
      setIsEditing(false);
      setEditField(null);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Carregando perfil...</div>;
  }

  const displayName = profile?.first_name || user?.email || 'Usuário';
  const displayEmail = user?.email || 'N/A';
  const displayPhone = profile?.phone || 'Adicionar telefone';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Meu Perfil</h1>

      {/* Seção de Informações do Usuário */}
      <Card className="shadow-lg border-none rounded-xl bg-white p-6 mb-6">
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16 border-2 border-primary">
            <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="bg-primary text-white text-xl">{displayName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-xl font-extrabold text-gray-800">{displayName}</CardTitle>
            <p className="text-sm text-gray-500">{displayEmail}</p>
          </div>
        </div>
        <Separator className="my-4" />
        
        <div className="space-y-3">
          {/* Nome */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-600" />
              <p className="text-sm text-gray-700">Nome: {profile?.first_name || 'Não definido'}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleEditClick('first_name')}>
              Editar
            </Button>
          </div>

          {/* Telefone */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-gray-600" />
              <p className="text-sm text-gray-700">Telefone: {displayPhone}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleEditClick('phone')}>
              Editar
            </Button>
          </div>
        </div>
      </Card>

      {/* Seção de Navegação Geral */}
      <Card className="shadow-lg border-none rounded-xl bg-white p-4 space-y-3 mb-6">
        <h2 className="text-lg font-bold text-primary mb-2">Geral</h2>
        
        <NavCardItem 
          icon={<Heart className="w-5 h-5" />}
          title="Meus Favoritos"
          description="Veja seus restaurantes e pratos salvos"
          to="/favorites"
        />
        
        <NavCardItem 
          icon={<MapPin className="w-5 h-5" />}
          title="Endereços de Busca"
          description="Gerencie seus locais de pesquisa"
          to="/search-locations"
        />
        
        <NavCardItem 
          icon={<Settings className="w-5 h-5" />}
          title="Configurações da Conta"
          description="Mude sua senha e preferências"
          to="/account-settings"
        />
        
      </Card>

      {/* Seção de Ações */}
      <Card className="shadow-lg border-none rounded-xl bg-white p-4 space-y-3">
        <h2 className="text-lg font-bold text-red-600 mb-2">Ações</h2>
        
        <button 
          onClick={handleSignOut}
          className="flex items-center justify-between w-full p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <div className="flex items-center space-x-4">
            <LogOut className="w-5 h-5" />
            <p className="font-medium text-sm">Sair da Conta</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </Card>

      {/* Diálogo de Edição */}
      <EditClientFieldDialog
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSave={handleSave}
        field={editField}
        initialValue={initialValue}
      />
    </div>
  );
};

export default ClientProfilePage;