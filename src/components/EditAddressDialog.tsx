"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useState } from "react";
import { Restaurant } from "@/types";

const formSchema = z.object({
  cep: z.string().min(8, "CEP inválido").max(9, "CEP inválido"),
  address: z.string().min(1, "Endereço é obrigatório"),
  number: z.string().min(1, "Número é obrigatório"),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
});

type FormData = z.infer<typeof formSchema>;

interface EditAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: Restaurant;
  onSuccess?: () => void;
}

export function EditAddressDialog({
  open,
  onOpenChange,
  restaurant,
  onSuccess,
}: EditAddressDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cep: restaurant.cep || "",
      address: restaurant.address || "",
      number: restaurant.number || "",
      neighborhood: restaurant.neighborhood || "",
      city: restaurant.city || "",
      state: restaurant.state || "",
    },
  });

  const handleCepBlur = async (cep: string) => {
    if (cep.replace(/\D/g, "").length !== 8) {
      return;
    }
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        form.setValue("address", data.logradouro);
        form.setValue("neighborhood", data.bairro);
        form.setValue("city", data.localidade);
        form.setValue("state", data.uf);
        form.setFocus("number");
      } else {
        toast.error("CEP não encontrado.");
      }
    } catch (error) {
      toast.error("Erro ao buscar CEP.");
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsGeocoding(true);
    let latitude = null;
    let longitude = null;

    try {
      const fullAddress = `${data.address}, ${data.number}, ${data.city}, ${data.state}, ${data.cep}`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          fullAddress
        )}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Falha na geocodificação");
      }

      const geocodingData = await response.json();
      if (geocodingData && geocodingData.length > 0) {
        latitude = parseFloat(geocodingData[0].lat);
        longitude = parseFloat(geocodingData[0].lon);
      } else {
        toast.warning(
          "Não foi possível encontrar as coordenadas para este endereço. O endereço será salvo, mas pode não aparecer corretamente nos mapas."
        );
      }
    } catch (error) {
      console.error("Erro de geocodificação:", error);
      toast.error(
        "Ocorreu um erro ao validar as coordenadas do endereço. Tente novamente."
      );
    } finally {
      setIsGeocoding(false);
    }

    setLoading(true);
    const { error } = await supabase
      .from("restaurants")
      .update({
        ...data,
        latitude,
        longitude,
      })
      .eq("id", restaurant.id);

    setLoading(false);

    if (error) {
      toast.error("Erro ao salvar o endereço. Tente novamente.");
      console.error(error);
    } else {
      toast.success("Endereço salvo com sucesso!");
      onSuccess?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-xl shadow-soft-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="h-6 w-6 text-primary" />
            <div>
              <DialogTitle className="text-xl font-bold">
                Editar Endereço
              </DialogTitle>
              <DialogDescription>
                Atualize o endereço do seu restaurante.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cep"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="00000-000"
                      {...field}
                      onBlur={() => handleCepBlur(field.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Sua rua ou avenida" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu bairro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Sua cidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input placeholder="UF" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={loading || isGeocoding}
                className="w-full"
              >
                {(loading || isGeocoding) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isGeocoding
                  ? "Validando Endereço..."
                  : loading
                  ? "Salvando..."
                  : "Salvar Endereço"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}