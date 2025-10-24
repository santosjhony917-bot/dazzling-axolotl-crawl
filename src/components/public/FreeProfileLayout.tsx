import React from 'react';
import { Restaurant } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Phone, MessageCircle } from 'lucide-react';

interface FreeProfileLayoutProps {
  restaurant: Restaurant;
}

export default function FreeProfileLayout({ restaurant }: FreeProfileLayoutProps) {
  const { name, description, image_url, cover_image_url, address, phone, whatsapp_url } = restaurant;

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-4xl">
      <Card className="w-full shadow-xl border-none rounded-2xl overflow-hidden">
        {/* Header com Capa e Logo */}
        <div className="relative">
          <div className="h-48 bg-gray-200">
            {cover_image_url ? (
              <img src={cover_image_url} alt={`Capa de ${name}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-gray-300 to-gray-400" />
            )}
          </div>
          <div className="absolute top-24 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center">
            {image_url ? (
              <img src={image_url} alt={`Logo de ${name}`} className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-gray-500 text-sm">Sem Logo</span>
            )}
          </div>
        </div>

        {/* Conteúdo do Perfil */}
        <CardContent className="p-6 pt-20 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#022D68]">{name}</h1>
          {address && <p className="text-gray-500 mt-2">{address}</p>}

          {description && (
            <div className="mt-8 text-left border-t pt-6">
              <h3 className="font-semibold text-xl text-[#022D68] mb-3">Sobre Nós</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{description}</p>
            </div>
          )}

          {(phone || whatsapp_url) && (
            <div className="mt-6 text-left border-t pt-6">
              <h3 className="font-semibold text-xl text-[#022D68] mb-4">Contato</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                {phone && (
                  <a href={`tel:${phone}`} className="flex items-center gap-3 text-gray-700 hover:text-[#E47948] transition-colors">
                    <Phone size={18} />
                    <span>{phone}</span>
                  </a>
                )}
                {whatsapp_url && (
                  <a href={whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-700 hover:text-[#E47948] transition-colors">
                    <MessageCircle size={18} />
                    <span>Chamar no WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          )}

          <Alert className="mt-10 text-left">
            <Info className="h-4 w-4" />
            <AlertTitle>Este é um Perfil Gratuito</AlertTitle>
            <AlertDescription>
              Recursos como galeria de fotos, cardápio e promoções estão disponíveis para assinantes dos planos premium.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}