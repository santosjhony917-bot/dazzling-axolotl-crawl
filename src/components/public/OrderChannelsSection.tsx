"use client";

import { Restaurant } from "@/types/supabase";
import { Button } from "../ui/button";
import { ExternalLink } from "lucide-react";

interface OrderChannelsSectionProps {
  restaurant: Restaurant;
}

const IFoodLogoUrl = "https://imagensfree.com.br/wp-content/uploads/2021/11/icone-ifood-sorriso-circulo-vermelho-png.png";

export function OrderChannelsSection({ restaurant }: OrderChannelsSectionProps) {
  const isWhatsapp = !!restaurant.whatsapp_url;
  const isIfood = !!restaurant.ifood_url;
  const isOther = !!restaurant.other_url;

  if (!isWhatsapp && !isIfood && !isOther) {
    return null;
  }

  return (
    <section className="p-4 border-t border-gray-100 bg-white">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">
        Canais de Pedido
      </h2>
      <div className="space-y-3">
        {isWhatsapp && (
          <Button
            asChild
            variant="outline"
            className="w-full justify-start h-12 text-base border-green-500 text-green-600 hover:bg-green-50"
          >
            <a href={restaurant.whatsapp_url!} target="_blank" rel="noopener noreferrer">
              <img
                src="/assets/whatsapp-logo.svg"
                alt="WhatsApp Logo"
                className="w-7 h-7 object-contain mr-3"
              />
              Pedir pelo WhatsApp
              <ExternalLink className="ml-auto h-4 w-4" />
            </a>
          </Button>
        )}

        {isIfood && (
          <Button
            asChild
            variant="outline"
            className="w-full justify-start h-12 text-base border-red-500 text-red-600 hover:bg-red-50"
          >
            <a href={restaurant.ifood_url!} target="_blank" rel="noopener noreferrer">
              <img
                src={IFoodLogoUrl}
                alt="iFood Logo"
                className="w-7 h-7 object-contain mr-3"
              />
              Pedir pelo iFood
              <ExternalLink className="ml-auto h-4 w-4" />
            </a>
          </Button>
        )}

        {isOther && (
          <Button
            asChild
            variant="outline"
            className="w-full justify-start h-12 text-base"
          >
            <a href={restaurant.other_url!} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-5 w-5 mr-3" />
              Outro Canal de Pedido
              <ExternalLink className="ml-auto h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </section>
  );
}