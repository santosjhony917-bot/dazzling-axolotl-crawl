"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link as LinkIcon, MessageCircle, UtensilsCrossed } from "lucide-react"; // Alterado Whatsapp para MessageCircle

// Assumindo que o tipo Restaurant já inclui 'other_url_label'
interface Restaurant {
  id: string;
  name: string;
  whatsapp_url?: string;
  ifood_url?: string;
  other_url?: string;
  other_url_label?: string; // Adicionado para permitir a personalização do label
  // ... outras propriedades do restaurante
}

interface OrderChannelsSectionProps {
  restaurant: Restaurant;
}

const OrderChannelsSection = ({ restaurant }: OrderChannelsSectionProps) => {
  const orderLinks = [
    {
      type: "whatsapp",
      label: "WhatsApp",
      url: restaurant.whatsapp_url,
      icon: <MessageCircle className="h-6 w-6" />, // Usando MessageCircle como ícone do WhatsApp
    },
    {
      type: "ifood",
      label: "iFood",
      url: restaurant.ifood_url,
      icon: <UtensilsCrossed className="h-6 w-6" />, // Usando UtensilsCrossed como ícone do iFood
    },
    {
      type: "other",
      label: restaurant.other_url_label || "Outro Link", // Usa o label personalizado ou "Outro Link" como padrão
      url: restaurant.other_url,
      icon: <LinkIcon className="h-6 w-6" />,
    },
  ].filter((link) => link.url); // Filtra links sem URL

  if (orderLinks.length === 0) {
    return null; // Não renderiza a seção se não houver links disponíveis
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Faça Seu Pedido</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {orderLinks.map((link) => {
            const isWhatsapp = link.type === "whatsapp";
            const isIfood = link.type === "ifood";

            return (
              <Button asChild key={link.type} variant="outline" className="flex-1 min-w-[100px] h-auto py-3">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center space-y-1">
                  {link.icon}
                  <p className={cn(
                    "text-xs font-semibold text-center",
                    // Texto na cor vermelha para iFood, verde para WhatsApp, e primária para outros
                    isIfood ? "text-red-600" : (isWhatsapp ? "text-green-600" : "text-primary")
                  )}>
                    {link.label}
                  </p>
                </a>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderChannelsSection;