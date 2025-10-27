import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Utensils, ArrowRight, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import { createPageUrl } from '@/utils/url';
import { Separator } from '@/components/ui/separator';

/**
 * Página de Central de Ajuda para a Área do Restaurante
 */
export default function RestaurantHelpCenter() {
  const navigate = useNavigate();

  const supportItems = [
    { title: 'Tutoriais de Cardápio', description: 'Aprenda a gerenciar seus itens e categorias.', action: () => navigate(createPageUrl('helpCenter')) },
    { title: 'Configurações de Pagamento', description: 'Como configurar sua conta para receber pagamentos.', action: () => navigate(createPageUrl('helpCenter')) },
    { title: 'Dicas de Marketing Premium', description: 'Maximize sua visibilidade com o plano Premium.', action: () => navigate(createPageUrl('helpCenter')) },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-4 max-w-md mx-auto">
      {/* Header */}
      <RestaurantAreaHeader title="Central de Ajuda" backPath="restaurant-area/profile-menu" />
      
      <div className="p-4 space-y-6">
        <div className="text-center">
          <HelpCircle className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-primary">Central de Ajuda</h1>
          <p className="text-gray-600 mt-1">Encontre respostas rápidas e entre em contato com o suporte.</p>
        </div>

        <Card className="shadow-soft-md border-none">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Artigos Populares</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {supportItems.map((item, index) => (
              <div key={index} className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg" onClick={item.action}>
                <div>
                  <p className="font-medium text-gray-800">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-soft-md border-none">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Fale Conosco</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-highlight" />
              <div>
                <p className="font-medium text-gray-800">E-mail de Suporte</p>
                <a href="mailto:suporte@filterfood.com" className="text-sm text-primary hover:underline">suporte@filterfood.com</a>
              </div>
            </div>
            <Separator />
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-highlight" />
              <div>
                <p className="font-medium text-gray-800">Telefone</p>
                <a href="tel:+5511999999999" className="text-sm text-primary hover:underline">(11) 99999-9999</a>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="pt-4 text-center">
          <Button 
            variant="outline" 
            className="w-full h-12 text-primary border-primary/20 hover:bg-primary/5"
            onClick={() => navigate(createPageUrl('restaurant-area/profile-menu'))}
          >
            Voltar ao Perfil
          </Button>
        </div>
      </div>
    </div>
  );
}