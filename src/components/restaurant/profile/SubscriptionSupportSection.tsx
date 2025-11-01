"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthData } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

interface SubscriptionSupportSectionProps {
  isPremium: boolean;
}

const SubscriptionSupportSection: React.FC<SubscriptionSupportSectionProps> = ({ isPremium }) => {
  const { signOut } = useAuthData(); // Adicionado signOut
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assinatura e Suporte</CardTitle>
        <CardDescription>Gerencie sua assinatura e acesse o suporte.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">Status da Assinatura:</p>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isPremium ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
            {isPremium ? 'Premium' : 'Grátis'}
          </span>
        </div>
        {!isPremium && (
          <Button className="w-full bg-[#E47948] hover:bg-[#C2653B]" onClick={() => navigate('/restaurant/upgrade')}>
            Fazer Upgrade para Premium
          </Button>
        )}
        <Button variant="outline" className="w-full" onClick={() => alert('Funcionalidade de suporte em breve!')}>
          Contatar Suporte
        </Button>
        <Button variant="destructive" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubscriptionSupportSection;