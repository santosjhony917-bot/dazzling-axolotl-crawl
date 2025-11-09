"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlusCircle, ArrowLeft } from "lucide-react";
import { MenuItemList } from "@/components/restaurant/menu/MenuItemList";

export default function CategoryDetails() {
  const { categoryId, restaurantId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [editedCategory, setEditedCategory] = useState(null);
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: 0,
    image_url: "",
    is_active: true,
    category_id: categoryId,
  });

  useEffect(() => {
    const fetchCategory = async () => {
      const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("id", categoryId)
        .single();

      if (error) {
        toast({
          title: "Erro ao carregar categoria",
          description: error.message,
          variant: "destructive",
        });
        navigate(`/restaurant/${restaurantId}/menu`);
      } else {
        setCategory(data);
        setEditedCategory(data);
      }
      setLoading(false);
    };

    fetchCategory();
  }, [categoryId, restaurantId, navigate, toast]);

  const handleSaveCategory = async () => {
    const { data, error } = await supabase
      .from("menu_categories")
      .update(editedCategory)
      .eq("id", categoryId)
      .select();

    if (error) {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Categoria atualizada com sucesso!",
        description: `${editedCategory.name} foi atualizada.`,
      });
      setCategory(data[0]);
      setIsEditDialogOpen(false);
    }
  };

  const handleAddItem = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .insert({ ...newItem, category_id: categoryId })
      .select();

    if (error) {
      toast({
        title: "Erro ao adicionar item",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Item adicionado com sucesso!",
        description: `${newItem.name} foi adicionado ao menu.`,
      });
      setNewItem({
        name: "",
        description: "",
        price: 0,
        image_url: "",
        is_active: true,
        category_id: categoryId,
      });
      setIsAddItemDialogOpen(false);
      // No need to manually update items state here, MenuItemList will refetch
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando detalhes da categoria...</div>;
  }

  if (!category) {
    return <div className="text-center py-8">Categoria não encontrada.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Button variant="ghost" onClick={() => navigate(`/restaurant/${restaurantId}/menu`)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Menu
      </Button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setIsEditDialogOpen(true)}>Editar Categoria</Button>
          <Button onClick={() => setIsAddItemDialogOpen(true)} className="bg-green-500 hover:bg-green-600">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
          </Button>
        </div>
      </div>

      <p className="text-lg text-muted-foreground mb-8">
        {category.is_active ? "Categoria ativa" : "Categoria inativa"}
      </p>

      <h2 className="text-2xl font-semibold mb-4">Itens do Menu</h2>
      <MenuItemList categoryId={category.id} restaurantId={restaurantId} />

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>
              Faça alterações na sua categoria aqui. Clique em salvar quando terminar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category-name" className="text-right">
                Nome
              </Label>
              <Input
                id="category-name"
                value={editedCategory?.name || ""}
                onChange={(e) => setEditedCategory({ ...editedCategory, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category-active" className="text-right">
                Ativa
              </Label>
              <Switch
                id="category-active"
                checked={editedCategory?.is_active || false}
                onCheckedChange={(checked) => setEditedCategory({ ...editedCategory, is_active: checked })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSaveCategory}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Item</DialogTitle>
            <DialogDescription>
              Preencha os detalhes para adicionar um novo item a esta categoria.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item-name" className="text-right">
                Nome
              </Label>
              <Input
                id="item-name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item-description" className="text-right">
                Descrição
              </Label>
              <Textarea
                id="item-description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item-price" className="text-right">
                Preço
              </Label>
              <Input
                id="item-price"
                type="number"
                step="0.01"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item-image-url" className="text-right">
                URL da Imagem
              </Label>
              <Input
                id="item-image-url"
                value={newItem.image_url}
                onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item-active" className="text-right">
                Ativo
              </Label>
              <Switch
                id="item-active"
                checked={newItem.is_active}
                onCheckedChange={(checked) => setNewItem({ ...newItem, is_active: checked })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddItem}>
              Adicionar Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}