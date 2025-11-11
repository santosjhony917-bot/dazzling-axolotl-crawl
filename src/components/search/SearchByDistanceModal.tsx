"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SearchByDistanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDistance?: number;
  initialCategory?: string;
  initialSearchQuery?: string;
}

const SearchByDistanceModal: React.FC<SearchByDistanceModalProps> = ({
  isOpen,
  onClose,
  initialDistance = 10,
  initialCategory = '',
  initialSearchQuery = '',
}) => {
  const [distance, setDistance] = useState<number[]>([initialDistance]);
  // Mapeia initialCategory '' para 'all' para consistência com SelectItem
  const [category, setCategory] = useState<string>(initialCategory === '' ? 'all' : initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [categories, setCategories] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setDistance([initialDistance]);
    // Mapeia initialCategory '' para 'all' para consistência com SelectItem
    setCategory(initialCategory === '' ? 'all' : initialCategory);
    setSearchQuery(initialSearchQuery);
  }, [initialDistance, initialCategory, initialSearchQuery]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('category')
        .not('category', 'is', null)
        .order('category', { ascending: true });

      if (error) {
        toast({
          title: 'Erro ao carregar categorias',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        const uniqueCategories = Array.from(new Set(data.map((item) => item.category as string)));
        setCategories(uniqueCategories);
      }
    };

    fetchCategories();
  }, [toast]);

  const handleApply = () => {
    const params = new URLSearchParams();
    params.append('distance', distance[0].toString());
    if (category && category !== 'all') { // Apenas adiciona a categoria se não for 'all'
      params.append('category', category);
    }
    if (searchQuery) {
      params.append('query', searchQuery);
    }
    navigate(`/search?${params.toString()}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-center">Filtrar Busca</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="distance" className="text-left">
              Distância: {distance[0]} km
            </Label>
            <Slider
              id="distance"
              min={1}
              max={100}
              step={1}
              value={distance}
              onValueChange={setDistance}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category" className="text-left">
              Categoria
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem> {/* Valor alterado para "all" */}
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="searchQuery" className="text-left">
              Buscar por nome ou descrição
            </Label>
            <Input
              id="searchQuery"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex: Pizza, Hamburguer, etc."
              className="rounded-xl"
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
          <Button onClick={handleApply} variant="highlight" className="rounded-xl">Aplicar Filtro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SearchByDistanceModal;