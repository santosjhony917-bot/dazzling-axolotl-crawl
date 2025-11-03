"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Phone, Utensils, Link as LinkIcon } from "lucide-react";
import { Restaurant } from "@/types"; // Importando o tipo Restaurant

interface OrderChannelsSectionProps {
  restaurant: Restaurant;
}

const OrderChannelsSection = ({ restaurant }: OrderChannelsSectionProps) => {
  const orderLinks = [
    {
      type: "whatsapp",
      label: "WhatsApp",
      url: restaurant.whatsapp_url,
      icon: "/whatsapp-logo.svg",
    },
    {
      type: "ifood",
      label: "iFood",
      url: restaurant.ifood_url,
      icon: "/ifood-logo.svg",
    },
    {
      type: "other",
      label: restaurant.other_url_label || "Outro Link", // Usando o rótulo personalizado
      url: restaurant.other_url,
      icon: null, // Sem ícone específico para 'other'
    },
  ].filter((link) => link.url); // Apenas mostra links que possuem URL

  if (orderLinks.length === 0) {
    return null; // Não renderiza a seção se não houver links
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Canais de Pedido</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {orderLinks.map((link) => {
            const isWhatsapp = link.type === "whatsapp";
            const isIfood = link.type === "ifood";
            const isOther = link.type === "other";

            return (
              <Button asChild key={link.type} variant="outline" className="h-auto p-0">
                <a
                  href={link.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 w-full"
                >
                  {link.icon ? (
                    <img // Usando tag <img> padrão
                      src={link.icon}
                      alt={link.label}
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                  ) : (
                    isOther && <LinkIcon className="w-6 h-6 text-primary" />
                  )}
                  <p className={cn(
                    "text-xs font-semibold text-center",
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