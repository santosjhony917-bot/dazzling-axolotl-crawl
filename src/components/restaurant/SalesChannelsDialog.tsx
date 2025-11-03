"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  whatsapp_url: z.string().url("URL inválida").optional().or(z.literal("")),
  ifood_url: z.string().url("URL inválida").optional().or(z.literal("")),
  other_url: z.string().url("URL inválida").optional().or(z.literal("")),
  other_url_label: z.string().max(50, "Máximo de 50 caracteres").optional(),
});

type SalesChannelsFormValues = z.infer<typeof formSchema>;

interface SalesChannelsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
}

export const SalesChannelsDialog = ({
  isOpen,
  onClose,
  restaurantId,
}: SalesChannelsDialogProps) => {
  const form = useForm<SalesChannelsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      whatsapp_url: "",
      ifood_url: "",
      other_url: "",
      other_url_label: "",
    },
  });

  useEffect(() => {
    if (isOpen && restaurantId) {
      const fetchSalesChannels = async () => {
        const { data, error } = await supabase
          .from("restaurants")
          .select("whatsapp_url, ifood_url, other_url, other_url_label")
          .eq("id", restaurantId)
          .single();

        if (error) {
          toast.error("Erro ao carregar canais de venda.");
          console.error(error);
        } else if (data) {
          form.reset(data);
        }
      };
      fetchSalesChannels();
    }
  }, [isOpen, restaurantId, form]);

  const onSubmit = async (values: SalesChannelsFormValues) => {
    const { error } = await supabase
      .from("restaurants")
      .update({
        whatsapp_url: values.whatsapp_url || null,
        ifood_url: values.ifood_url || null,
        other_url: values.other_url || null,
        other_url_label: values.other_url_label || null,
      })
      .eq("id", restaurantId);

    if (error) {
      toast.error("Erro ao atualizar canais de venda.");
      console.error(error);
    } else {
      toast.success("Canais de venda atualizados com sucesso!");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Canais de Venda e Links</DialogTitle>
          <DialogDescription>
            Gerencie os links para seus canais de venda e outros links importantes.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="whatsapp_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link do WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="https://wa.me/seunumerodetelefone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ifood_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link do iFood</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.ifood.com.br/delivery/sua-loja" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="other_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outro Link (URL)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://seusite.com.br" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="other_url_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rótulo do Outro Link (ex: Anota Aí)</FormLabel>
                  <FormControl>
                    <Input placeholder="Anota Aí" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Salvar alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};