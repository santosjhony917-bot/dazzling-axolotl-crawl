"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function EditAddressDialog({
  open,
  onOpenChange,
  restaurant,
  onAddressUpdate,
}) {
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setAddress(restaurant.address || "");
      setNumber(restaurant.number || "");
      setNeighborhood(restaurant.neighborhood || "");
      setCity(restaurant.city || "");
      setState(restaurant.state || "");
      setCep(restaurant.cep || "");
    }
  }, [restaurant]);

  const handleCepSearch = async () => {
    if (cep.replace(/\D/g, "").length !== 8) {
      toast.error("CEP inválido. Deve conter 8 dígitos.");
      return;
    }
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) {
        toast.error("CEP não encontrado.");
      } else {
        setAddress(data.logradouro);
        setNeighborhood(data.bairro);
        setCity(data.localidade);
        setState(data.uf);
      }
    } catch (error) {
      toast.error("Erro ao buscar o CEP.");
      console.error(error);
    } finally {
      setCepLoading(false);
    }
  };

  const handleSave = async () => {
    if (!cep || !address || !number || !neighborhood || !city || !state) {
      toast.error("Por favor, preencha todos os campos do endereço.");
      return;
    }
    setLoading(true);

    try {
      const fullAddress = `${address}, ${number}, ${neighborhood}, ${city}, ${state}, Brasil`;
      
      const { data: coords, error: geocodeError } = await supabase.functions.invoke('geocode-address', {
        body: { address: fullAddress },
      });

      if (geocodeError || !coords) {
        console.error('Geocode Error:', geocodeError);
        toast.error('Não foi possível obter as coordenadas do endereço. Verifique se o endereço está correto e tente novamente.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          address,
          number,
          neighborhood,
          city,
          state,
          cep,
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
        .eq('id', restaurant.id);

      if (updateError) {
        throw updateError;
      }

      toast.success('Endereço atualizado com sucesso!');
      if (onAddressUpdate) {
        onAddressUpdate();
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar endereço:", error);
      toast.error(error.message || 'Ocorreu um erro ao salvar o endereço. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-xl shadow-soft-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-gray-800">
              Editar Endereço
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Preencha o endereço completo para garantir a localização correta no
            mapa.
          </p>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cep" className="col-span-4">
              CEP
            </Label>
            <div className="col-span-4 flex gap-2">
              <Input
                id="cep"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                className="col-span-3"
                placeholder="00000-000"
              />
              <Button onClick={handleCepSearch} disabled={cepLoading}>
                {cepLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Buscar"
                )}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="col-span-4">
              Endereço
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="col-span-4"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="number" className="col-span-4">
              Número
            </Label>
            <Input
              id="number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="col-span-4"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="neighborhood" className="col-span-4">
              Bairro
            </Label>
            <Input
              id="neighborhood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="col-span-4"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="w-full flex flex-col gap-2">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar Alterações
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}