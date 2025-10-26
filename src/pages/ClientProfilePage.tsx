import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, LogOut, Utensils, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils/url';
import ClientLayout from '@/components/ClientLayout';
import CustomerBottomNav from '@/components/CustomerBottomNav'; // Importado
import { useAuth } from '@/hooks/useAuth'; // Importando useAuth

export default function ClientProfilePage() {
  // Simplificando para usar useAuth para todos os estados derivados
  const { user, isLoading, signOut, restaurant } = useAuth(); 
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-center">
        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Você não está logado</h2>
        <p className="text-gray-600 mb-6">Faça login para ver seu perfil.</p>
        <Button onClick={() => navigate(createPageUrl('login'))}>
          Fazer Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <ClientLayout title="Meu Perfil" selectedTab="perfil" showBackButton={false}>
        <div className="p-4 space-y-6">
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <User className="w-7 h-7" /> Minha Conta
          </h1>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">Email: <span className="font-medium text-gray-800">{user.email}</span></p>
              <p className="text-sm text-gray-600">ID do Usuário: <span className="font-medium text-gray-800 break-all">{user.id}</span></p>
            </CardContent>
          </Card>

          {restaurant && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2 text-primary">
                  <Utensils className="w-5 h-5" /> Área do Restaurante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 mb-4">Você está registrado como proprietário do restaurante: <span className="font-semibold">{restaurant.name}</span></p>
                <Button onClick={() => navigate(createPageUrl('restaurant-area/home'))} className="w-full">
                  Ir para o Painel do Restaurante
                </Button>
              </CardContent>
            </Card>
          )}

          <Button 
            variant="destructive" 
            onClick={handleLogout} 
            className="w-full"
            disabled={isLoading}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </ClientLayout>
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md z-30">
        <CustomerBottomNav selectedTab="perfil" />
      </div>
    </div>
  );
}