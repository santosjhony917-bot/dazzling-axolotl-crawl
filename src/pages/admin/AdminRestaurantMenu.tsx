"use client";

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
import { PlusCircle, Edit, Trash } from "lucide-react";
import { MenuItemList } from "@/components/restaurant/menu/MenuItemList";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminRestaurantMenu() {
  const { restaurantId } = useParams();
  const { toast } = useToast();

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editedCategory, setEditedCategory] = useState(null);
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: 0,
    image_url: "",
    is_active: true,
    category_id: "",
  });

  useEffect(() => {
    fetchCategories();
  }, [restaurantId]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("order_index", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar categorias",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCategories(data);
      if (data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0]);
      }
    }
  };

  const handleAddCategory = async () => {
    const { data, error } = await supabase
      .from("menu_categories")
      .insert({ name: newCategoryName, restaurant_id: restaurantId })
      .select();

    if (error) {
      toast({
        title: "Erro ao adicionar categoria",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Categoria adicionada com sucesso!",
        description: `${newCategoryName} foi adicionada.`,
      });
      setNewCategoryName("");
      setIsAddCategoryDialogOpen(false);
      fetchCategories();
    }
  };

  const handleEditCategory = async () => {
    const { data, error } = await supabase
      .from("menu_categories")
      .update(editedCategory)
      .eq("id", editedCategory.id)
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
      setIsEditCategoryDialogOpen(false);
      fetchCategories();
    }
  };

  const handleDeleteCategory = async (categoryIdToDelete) => {
    const { error } = await supabase
      .from("menu_categories")
      .delete()
      .eq("id", categoryIdToDelete);

    if (error) {
      toast({
        title: "Erro ao deletar categoria",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Categoria deletada com sucesso!",
        description: "A categoria foi removida.",
      });
      fetchCategories();
      setSelectedCategory(null); // Clear selected category after deletion
    }
  };

  const handleAddItem = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .insert({ ...newItem, category_id: selectedCategory.id })
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
        category_id: selectedCategory.id,
      });
      setIsAddItemDialogOpen(false);
      // MenuItemList will refetch its items
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Gerenciar Menu do Restaurante</h1>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Categorias</h2>
        <Button onClick={() => setIsAddCategoryDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Categoria
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {categories.map((category) => (
          <div
            key={category.id}
            className={`p-4 border rounded-lg cursor-pointer flex justify-between items-center ${
              selectedCategory?.id === category.id ? "border-primary ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedCategory(category)}
          >
            <div>
              <h3 className="font-medium">{category.name}</h3>
              <p className="text-sm text-muted-foreground">
                {category.is_active ? "Ativa" : "Inativa"}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditedCategory(category);
                  setIsEditCategoryDialogOpen(true);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso removerá permanentemente a categoria "{category.name}" e todos os seus itens.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteCategory(category.id)} className="bg-red-500 hover:bg-red-600 text-white">
                      Deletar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      {selectedCategory && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Itens em "{selectedCategory.name}"</h2>
            <Button onClick={() => {
              setNewItem(prev => ({ ...prev, category_id: selectedCategory.id }));
              setIsAddItemDialogOpen(true);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
            </Button>
          </div>
          <MenuItemList categoryId={selectedCategory.id} restaurantId={restaurantId} />
        </div>
      )}

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Categoria</DialogTitle>
            <DialogDescription>
              Digite o nome da nova categoria para o seu menu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input
                id="name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddCategory}>
              Adicionar Categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>
              Faça alterações na sua categoria aqui. Clique em salvar quando terminar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-category-name" className="text-right">
                Nome
              </Label>
              <Input
                id="edit-category-name"
                value={editedCategory?.name || ""}
                onChange={(e) => setEditedCategory({ ...editedCategory, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-category-active" className="text-right">
                Ativa
              </Label>
              <Switch
                id="edit-category-active"
                checked={editedCategory?.is_active || false}
                onCheckedChange={(checked) => setEditedCategory({ ...editedCategory, is_active: checked })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleEditCategory}>
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
              <Label htmlFor="add-item-name" className="text-right">
                Nome
              </Label>
              <Input
                id="add-item-name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-item-description" className="text-right">
                Descrição
              </Label>
              <Textarea
                id="add-item-description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-item-price" className="text-right">
                Preço
              </Label>
              <Input
                id="add-item-price"
                type="number"
                step="0.01"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-item-image-url" className="text-right">
                URL da Imagem
              </Label>
              <Input
                id="add-item-image-url"
                value={newItem.image_url}
                onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-item-active" className="text-right">
                Ativo
              </Label>
              <Switch
                id="add-item-active"
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