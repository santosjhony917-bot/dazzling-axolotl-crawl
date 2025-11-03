"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

interface SalesChannelsDialogProps {
  restaurant: Restaurant;
  onSave: (data: Partial<Restaurant>) => void;
  onClose: () => void;
  isOpen: boolean; // Adicionado para controlar o estado de abertura
}

const SalesChannelsDialog = ({ restaurant, onSave, onClose, isOpen }: SalesChannelsDialogProps) => {
  const { register, handleSubmit, reset } = useForm<Partial<Restaurant>>({
    defaultValues: {
      whatsapp_url: restaurant.whatsapp_url || "",
      ifood_url: restaurant.ifood_url || "",
      other_url: restaurant.other_url || "",
      other_url_label: restaurant.other_url_label || "", // Inicializa o novo campo
    },
  });

  useEffect(() => {
    reset({
      whatsapp_url: restaurant.whatsapp_url || "",
      ifood_url: restaurant.ifood_url || "",
      other_url: restaurant.other_url || "",
      other_url_label: restaurant.other_url_label || "", // Reseta o novo campo
    });
  }, [restaurant, reset]);

  const onSubmit = (data: Partial<Restaurant>) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}> {/* Usa isOpen aqui */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Canais de Venda e Links</DialogTitle>
          <DialogDescription>
            Gerencie os links para seus canais de venda e outras redes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* WhatsApp Link */}
          <div>
            <Label htmlFor="whatsapp_url">Link do WhatsApp</Label>
            <Input
              id="whatsapp_url"
              {...register("whatsapp_url")}
              placeholder="https://wa.me/5511999999999"
            />
          </div>

          {/* iFood Link */}
          <div>
            <Label htmlFor="ifood_url">Link do iFood</Label>
            <Input
              id="ifood_url"
              {...register("ifood_url")}
              placeholder="https://www.ifood.com.br/restaurantes/..."
            />
          </div>

          {/* Other Link URL */}
          <div>
            <Label htmlFor="other_url">Outro Link (Site, Cardápio Online, etc.)</Label>
            <Input
              id="other_url"
              {...register("other_url")}
              placeholder="https://linkgeral.com"
            />
          </div>

          {/* Novo campo: Nome do "Outro Link" */}
          <div>
            <Label htmlFor="other_url_label">Nome do "Outro Link" (Ex: Anotaaí, Meu Cardápio)</Label>
            <Input
              id="other_url_label"
              {...register("other_url_label")}
              placeholder="Anota aí"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SalesChannelsDialog;