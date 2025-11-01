import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MenuCategory, MenuItem } from '@/types/supabase';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { Camera, Utensils, Loader2 } from 'lucide-react';
import { DEFAULT_MENU_ITEM_IMAGE_URL } from '@/constants/assets';
import { cn } from '@/lib/utils';

// Esquema de validação
const itemSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  description: z.string().max(500, 'A descrição não pode exceder 500 caracteres.').optional(),
  price: z.number().min(0.01, 'O preço deve ser maior que zero.'),
  image_url: z.string().url('URL de imagem inválida.').optional().or(z.literal('')),
  is_active: z.boolean(),
});

export type MenuItemFormValues = z.infer<typeof itemSchema>; // Corrigido: Exportando a interface

interface ItemFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: MenuCategory;
  itemToEdit?: MenuItem | null;
  onSave: (data: MenuItemFormValues) => Promise<void>; // Corrigido: Assinatura da prop onSave
}

const ItemFormDialog: React.FC<ItemFormDialogProps> = ({
  isOpen,
  onClose,
  category,
  itemToEdit,
  onSave,
}) => {
  const isEditing = !!itemToEdit;
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<MenuItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      image_url: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (itemToEdit) {
      reset({
        name: itemToEdit.name,
        description: itemToEdit.description || '',
        price: itemToEdit.price,
        image_url: itemToEdit.image_url || '',
        is_active: itemToEdit.is_active,
      });
    } else {
      reset();
    }
  }, [itemToEdit, reset]);

  const onSubmit = async (data: MenuItemFormValues) => {
    setIsSaving(true);
    
    const itemData = {
      ...data,
      category_id: category.id,
      // Garantir que a URL seja null se for string vazia
      image_url: data.image_url || null,
      description: data.description || null,
    };

    let error = null;

    if (isEditing) {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update(itemData)
        .eq('id', itemToEdit.id);
      error = updateError;
    } else {
      // 1. Determinar o próximo order_index
      const { data: maxOrderData } = await supabase
        .from('menu_items')
        .select('order_index')
        .eq('category_id', category.id)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();
        
      const newOrderIndex = (maxOrderData?.order_index || 0) + 1;

      const { error: insertError } = await supabase
        .from('menu_items')
        .insert({ ...itemData, order_index: newOrderIndex });
      error = insertError;
    }

    setIsSaving(false);

    if (error) {
      showError(`Erro ao salvar item: ${error.message}`);
    } else {
      showSuccess(`Item salvo com sucesso!`);
      await onSave(data); // Chamando onSave com os dados
      onClose();
    }
  };
  
  const handleUploadStart = useCallback(() => {
    setIsUploading(true);
  }, []);
  
  const handleUploadComplete = useCallback((url: string) => {
    setValue('image_url', url, { shouldValidate: true });
    setIsUploading(false);
    showSuccess("Imagem enviada com sucesso!");
  }, [setValue]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Item' : 'Novo Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Imagem e Upload */}
          <Controller
            name="image_url"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                <Label>Imagem do Item</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                    <img 
                      src={field.value || DEFAULT_MENU_ITEM_IMAGE_URL} 
                      alt="Prévia do Item" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <ImageUploadButton
                        onUploadComplete={handleUploadComplete}
                        bucketName={RESTAURANT_IMAGES_BUCKET}
                        folderPath={`${category.restaurant_id}/menu`}
                        className="bg-white text-primary hover:bg-gray-100 h-8 w-8 p-0 rounded-full shadow-lg"
                        icon={<Camera className="h-4 w-4" />}
                        disabled={isUploading} // A prop 'disabled' agora é reconhecida
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Input
                      {...field}
                      placeholder="URL da imagem (opcional)"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      disabled={isUploading}
                    />
                    {errors.image_url && <p className="text-xs text-red-500 mt-1">{errors.image_url.message}</p>}
                  </div>
                </div>
              </div>
            )}
          />

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Pizza Margherita"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Textarea
              id="description"
              placeholder="Ingredientes e detalhes..."
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          {/* Preço */}
          <div className="space-y-2">
            <Label htmlFor="price">Preço (R$)</Label>
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  value={field.value === 0 ? '' : field.value}
                />
              )}
            />
            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between space-x-2 pt-2">
            <Label htmlFor="is_active" className="flex flex-col space-y-1">
              <span>Item Ativo</span>
              <span className="font-normal leading-snug text-muted-foreground text-sm">
                Se desativado, não aparecerá no menu público.
              </span>
            </Label>
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Switch
                  id="is_active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || isUploading}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEditing ? 'Salvar Alterações' : 'Criar Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ItemFormDialog;