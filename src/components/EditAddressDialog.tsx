"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { geocodeAddress } from "@/lib/google-maps";

const formSchema = z.object({
  cep: z.string().min(8, "CEP inválido"),
  address: z.string().min(1, "Campo obrigatório"),
  neighborhood: z.string().min(1, "Campo obrigatório"),
  city: z.string().min(1, "Campo obrigatório"),
  state: z.string().min(2, "UF inválido").max(2),
  number: z.string().min(1, "Campo obrigatório"),
});

export function EditAddressDialog({ open, onOpenChange, restaurant, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cep: restaurant?.cep || "",
      address: restaurant?.address || "",
      neighborhood: restaurant?.neighborhood || "",
      city: restaurant?.city || "",
      state: restaurant?.state || "",
      number: restaurant?.number || "",
    },
  });

  useEffect(() => {
    if (restaurant) {
      form.reset({
        cep: restaurant.cep || "",
        address: restaurant.address || "",
        neighborhood: restaurant.neighborhood || "",
        city: restaurant.city || "",
        state: restaurant.state || "",
        number: restaurant.number || "",
      });
    }
  }, [restaurant, form, open]);

  const handleCepSearch = async (cep: string) => {
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          form.setValue("address", data.logradouro);
          form.setValue("neighborhood", data.bairro);
          form.setValue("city", data.localidade);
          form.setValue("state", data.uf);
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    let latitude = restaurant.latitude;
    let longitude = restaurant.longitude;

    if (restaurant.plan !== 'free') {
      setIsGeocoding(true);
      try {
        const fullAddress = `${values.address}, ${values.number}, ${values.neighborhood}, ${values.city}, ${values.state}`;
        const geocodeData = await geocodeAddress(fullAddress);
        if (geocodeData) {
          latitude = geocodeData.lat;
          longitude = geocodeData.lng;
        }
      } catch (error) {
        console.error("Geocoding failed:", error);
        toast.error("Falha ao verificar o endereço no mapa. O endereço será salvo sem a localização precisa.");
      } finally {
        setIsGeocoding(false);
      }
    } else {
      // For free plan, we don't geocode, so we can nullify lat/lng if they exist
      latitude = null;
      longitude = null;
    }

    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          ...values,
          latitude,
          longitude,
        })
        .eq("id", restaurant.id);

      if (error) {
        throw error;
      }

      toast.success("Endereço atualizado com sucesso!");
      if (onSuccess) {
        onSuccess();
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating address:", error);
      toast.error("Erro ao atualizar o endereço. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-primary" />
            Editar Endereço
          </DialogTitle>
          <DialogDescription>
            Preencha o endereço completo para garantir a localização correta no mapa.
          </DialogDescription>
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
                      onChange={(e) => {
                        const cep = e.target.value.replace(/\D/g, "");
                        field.onChange(cep);
                        handleCepSearch(cep);
                      }}
                      maxLength={8}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Avenida Paulista" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input placeholder="Bela Vista" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF</FormLabel>
                      <FormControl>
                        <Input placeholder="SP" {...field} maxLength={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || isGeocoding} variant="highlight">
                {loading || isGeocoding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {loading || isGeocoding ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}