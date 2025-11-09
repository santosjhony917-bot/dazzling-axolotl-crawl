"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageIcon, PencilIcon, TrashIcon } from "lucide-react";
import { formatPrice } from "@/utils/format-price"; // Importação corrigida

interface MenuItemListItemProps {
  item: any;
  onUpdate: () => void;
  onDelete: (id: string) => void; // Tipo corrigido para aceitar 'id'
}

export function MenuItemListItem({
  item,
  onUpdate,
  onDelete,
}: MenuItemListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [price, setPrice] = useState(item.price);
  const [imageUrl, setImageUrl] = useState(item.image_url);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUpdate = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("menu_items")
      .update({ name, description, price, image_url: imageUrl })
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Erro ao atualizar item",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Item atualizado",
        description: "O item do menu foi atualizado com sucesso.",
      });
      setIsEditing(false);
      onUpdate();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Erro ao deletar item",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Item deletado",
        description: "O item do menu foi deletado com sucesso.",
      });
      onDelete(item.id); // Passando o id do item
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0">
      <div className="flex items-center space-x-4">
        {imageUrl ? (
          <img // Usando tag <img> padrão
            src={imageUrl}
            alt={item.name}
            width={64}
            height={64}
            className="object-cover rounded-md"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-500" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-lg">{item.name}</h3>
          <p className="text-gray-600 text-sm">{item.description}</p>
          <div className="flex items-center text-primary font-medium mt-1">
            <span className="font-bold text-highlight">
              {formatPrice(item.price)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex space-x-2">
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <PencilIcon className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Item do Menu</DialogTitle>
              <DialogDescription>
                Faça alterações no seu item do menu aqui. Clique em salvar
                quando terminar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Descrição
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Preço
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="imageUrl" className="text-right">
                  URL da Imagem
                </Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogContent>
        </Dialog>

        <Button variant="destructive" size="icon" onClick={handleDelete}>
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}