import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, LogOut, MapPin, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { mockLogout } from '@/utils/auth-mock';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';
import CustomerBottomNav from '@/components/restaurant/CustomerBottomNav'; // Importando o componente correto

export default function Profile() {
  const navigate = useNavigate();
  const { role, isLoading, userId, isPremiumRestaurant, isFreeRestaurant } = useUserRole();

  useEffect(() => {
    if (!isLoading) {
      if (isPremiumRestaurant || isFreeRestaurant) {
        navigate('/restaurant-area/profile-menu', { replace: true });
      }
    }
  }, [isLoading, isPremiumRestaurant, isFreeRestaurant, navigate]);

  const handleSignOut = async () => {
    await mockLogout();
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
        <Skeleton className="h-10 w-full mb-8" />
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  // Mock data for display
  const mockProfile = {
    name: "Usuário FilterFood",
    email: userId ? `user-${userId.substring(0, 4)}@example.com` : "email@exemplo.com",
    location: "João Pessoa, PB",
    phone: "(83) 99999-9999",
    currentRole: role,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24 max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#022D68]">Meu Perfil</h1>
          <Button onClick={handleSignOut} variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-red-100 hover:bg-red-200">
            <LogOut className="w-5 h-5 text-red-600" />
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Profile Card */}
          <Card className="shadow-lg border-none rounded-2xl">
            <CardHeader className="flex flex-col items-center pt-6 pb-4">
              <div className="size-20 rounded-full bg-[#E47948]/20 flex items-center justify-center mb-3">
                <User className="w-10 h-10 text-[#E47948]" />
              </div>
              <CardTitle className="text-xl text-[#022D68]">{mockProfile.name}</CardTitle>
              <p className="text-sm text-gray-500">Role: {mockProfile.currentRole}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Mail className="w-5 h-5 text-[#022D68]" />
                <p className="text-sm text-gray-700">{mockProfile.email}</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <MapPin className="w-5 h-5 text-[#022D68]" />
                <p className="text-sm text-gray-700">{mockProfile.location}</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Phone className="w-5 h-5 text-[#022D68]" />
                <p className="text-sm text-gray-700">{mockProfile.phone}</p>
              </div>
            </CardContent>
          </Card>

          {/* Settings/Actions */}
          <div className="mt-8 space-y-3">
            <Button variant="outline" className="w-full justify-start h-12 rounded-xl border-gray-200 text-[#022D68] hover:bg-gray-100">
              Editar Informações Pessoais
            </Button>
            <Button variant="outline" className="w-full justify-start h-12 rounded-xl border-gray-200 text-[#022D68] hover:bg-gray-100">
              Configurações de Notificação
            </Button>
            <Button 
              onClick={handleSignOut} 
              variant="destructive" 
              className="w-full justify-center h-12 rounded-xl mt-6"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sair da Conta
            </Button>
          </div>
        </motion.div>
      </main>
      <CustomerBottomNav />
    </div>
  );
}