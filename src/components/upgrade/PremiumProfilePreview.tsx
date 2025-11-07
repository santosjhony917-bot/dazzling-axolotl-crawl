import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Clock, Star, Image, UtensilsCrossed, Share2, Heart, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const PremiumProfilePreview: React.FC = () => {
  return (
    <Card className="relative w-full max-w-md mx-auto rounded-xl overflow-hidden shadow-2xl border-2 border-highlight bg-white">
      {/* Cover Image */}
      <div className="relative h-40 bg-gradient-to-r from-highlight to-orange-400 flex items-center justify-center">
        <img 
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
          alt="Capa do Restaurante Premium" 
          className="absolute inset-0 w-full h-full object-cover opacity-80" 
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 w-24 h-24 rounded-full bg-white flex items-center justify-center border-4 border-highlight -mb-12">
          <img 
            src="https://images.unsplash.com/photo-1555396273-367ba0447a47?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
            alt="Logo do Restaurante Premium" 
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      </div>

      {/* Action Buttons (simulated) */}
      <div className="absolute top-4 right-4 flex gap-2 z-20">
        <Button size="icon" variant="ghost" className="bg-white/80 hover:bg-white text-gray-700 rounded-full shadow-md">
          <Share2 className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="bg-white/80 hover:bg-white text-red-500 rounded-full shadow-md">
          <Heart className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Content */}
      <CardContent className="pt-16 pb-6 px-4 text-center">
        <h2 className="text-2xl font-bold text-highlight mb-2">Restaurante Premium</h2>
        <p className="text-sm text-gray-700 mb-4">
          Descubra uma experiência gastronômica inesquecível com nosso cardápio exclusivo e ambiente acolhedor.
        </p>

        <div className="flex justify-center gap-2 mb-4">
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            <UtensilsCrossed className="w-3 h-3 mr-1" /> Culinária Moderna
          </span>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            <Star className="w-3 h-3 mr-1" /> Destaque
          </span>
        </div>

        <div className="space-y-3 text-left text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-highlight shrink-0" />
            <span>Avenida Principal, 123, Centro, Cidade - UF</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-highlight shrink-0" />
            <span>Horário: Seg-Sex: 11:00-23:00 | Sáb-Dom: 12:00-00:00</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-highlight shrink-0" />
            <span>(XX) 9XXXX-XXXX (WhatsApp)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button variant="highlight" className="w-full">
            <MessageSquare className="w-4 h-4 mr-2" /> Pedir no WhatsApp
          </Button>
          <Button variant="outline" className="w-full border-highlight text-highlight hover:bg-highlight/10">
            <UtensilsCrossed className="w-4 h-4 mr-2" /> Ver Cardápio Completo
          </Button>
        </div>

        <div className="mt-6 text-center">
          <h3 className="text-md font-semibold text-gray-800 mb-3">Galeria de Fotos</h3>
          <div className="grid grid-cols-3 gap-2">
            <img 
              src="https://images.unsplash.com/photo-1552508744-147e54ca889d?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
              alt="Prato 1" 
              className="w-full h-20 object-cover rounded-md" 
            />
            <img 
              src="https://images.unsplash.com/photo-1504674590-e25294500898?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
              alt="Prato 2" 
              className="w-full h-20 object-cover rounded-md" 
            />
            <img 
              src="https://images.unsplash.com/photo-1506354666786-959d6d497f07?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
              alt="Ambiente" 
              className="w-full h-20 object-cover rounded-md" 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PremiumProfilePreview;