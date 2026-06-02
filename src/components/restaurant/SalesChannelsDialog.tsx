"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface SalesChannelsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialWhatsappUrl: string | null;
  initialIfoodUrl: string | null;
  initialOtherUrl: string | null;
  initialExternalUrl: string | null; // NOVO: Adicionado initialExternalUrl
  onSave: (data: { whatsapp_url: string | null; ifood_url: string | null; other_url: string | null; external_url: string | null }) => void; // NOVO: onSave agora aceita external_url
  isLoading: boolean;
}

const formSchema = z.object({
  whatsapp_url: z.string().url("Insira uma URL válida para o WhatsApp (deve começar com http:// ou https://).").or(z.literal('')).nullable().optional(),
  ifood_url: z.string().url("Insira uma URL válida para o iFood (deve começar com http:// ou https://).").or(z.literal('')).nullable().optional(),
  other_url: z.string().url("Insira uma URL válida para o Outro Link (deve começar com http:// ou https://).").or(z.literal('')).nullable().optional(),
  external_url: z.string().url("Insira uma URL válida para o Link Externo (deve começar com http:// ou https://).").or(z.literal('')).nullable().optional(), // NOVO: Adicionado external_url ao schema
});

type FormValues = z.infer<typeof formSchema>;

const SalesChannelsDialog: React.FC<SalesChannelsDialogProps> = ({
  isOpen,
  onClose,
  initialWhatsappUrl,
  initialIfoodUrl,
  initialOtherUrl,
  initialExternalUrl, // NOVO: Recebendo initialExternalUrl
  onSave,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      whatsapp_url: initialWhatsappUrl || '',
      ifood_url: initialIfoodUrl || '',
      other_url: initialOtherUrl || '',
      external_url: initialExternalUrl || '', // NOVO: Default value para external_url
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        whatsapp_url: initialWhatsappUrl || '',
        ifood_url: initialIfoodUrl || '',
        other_url: initialOtherUrl || '',
        external_url: initialExternalUrl || '', // NOVO: Reset para external_url
      });
    }
  }, [isOpen, initialWhatsappUrl, initialIfoodUrl, initialOtherUrl, initialExternalUrl, reset]);

  const onSubmit = (data: FormValues) => {
    onSave({
      whatsapp_url: data.whatsapp_url || null,
      ifood_url: data.ifood_url || null,
      other_url: data.other_url || null,
      external_url: data.external_url || null, // NOVO: Passando external_url para onSave
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Canais de Venda e Links</DialogTitle>
          <DialogDescription>
            Gerencie os links para seus canais de venda e outras redes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="whatsapp_url">Link do WhatsApp</Label>
              <Input
                id="whatsapp_url"
                placeholder="Ex: https://wa.me/5583999999999"
                className="col-span-3"
                {...register('whatsapp_url')}
              />
              {errors.whatsapp_url && (
                <p className="text-sm text-red-500 mt-1">{errors.whatsapp_url.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ifood_url">Link do iFood</Label>
              <Input
                id="ifood_url"
                placeholder="Ex: https://www.ifood.com.br/delivery/restaurante/..."
                className="col-span-3"
                {...register('ifood_url')}
              />
              {errors.ifood_url && (
                <p className="text-sm text-red-500 mt-1">{errors.ifood_url.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="other_url">Outro Link (Site, Cardápio Online, etc.)</Label>
              <Input
                id="other_url"
                placeholder="Ex: https://seusite.com.br"
                className="col-span-3"
                {...register('other_url')}
              />
              {errors.other_url && (
                <p className="text-sm text-red-500 mt-1">{errors.other_url.message}</p>
              )}
            </div>

            {/* NOVO: Campo para external_url */}
            <div>
              <Label htmlFor="external_url">Link Externo (Geral)</Label>
              <Input
                id="external_url"
                placeholder="Ex: https://linkgeral.com"
                className="col-span-3"
                {...register('external_url')}
              />
              {errors.external_url && (
                <p className="text-sm text-red-500 mt-1">{errors.external_url.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !!errors.whatsapp_url || !!errors.ifood_url || !!errors.other_url || !!errors.external_url} // NOVO: Desabilitar se houver erro em external_url
              variant="highlight"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SalesChannelsDialog;