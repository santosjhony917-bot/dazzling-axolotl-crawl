import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Utensils, Camera } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MenuItem } from '@/types';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { useImageUpload } from '@/hooks/useImageUpload';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { showError, showSuccess } from '@/utils/toast';

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ItemFormData) => void;
  isSaving: boolean;
  categoryId: string;
  initialData?: MenuItem | null;
}

export const itemSchema = z.object({
  id: z.string().optional(),
  category_id: z.string().min(1, "Category ID is required"), // Garantindo que é string obrigatória
  name: z.string().min(3, "O nome do item é obrigatório."),
  description: z.string().max(255, "Máximo de 255 caracteres").optional().nullable(),
  price: z.number().min(0.01, "O preço deve ser maior que zero."),
  image_url: z.string().url("URL de imagem inválida").or(z.literal('')).optional().nullable(),
  order_index: z.number().min(0, "A ordem deve ser 0 ou maior").optional(),
  is_active: z.boolean().optional(),
});

export type ItemFormData = z.infer<typeof itemSchema>;

export default function ItemFormDialog({ open, onOpenChange, onSave, isSaving, categoryId, initialData }: ItemFormDialogProps) {
  const { uploadImage, uploading: isUploadingImage } = useImageUpload();
  const [previewImage, setPreviewImage] = useState<string | null>(initialData?.image_url || null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      id: initialData?.id,
      category_id: categoryId,
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      image_url: initialData?.image_url || null,
      order_index: initialData?.order_index || 0,
      is_active: initialData?.is_active ?? true,
    },
  });
  
  const currentName = watch('name');

  useEffect(() => {
    if (open) {
      reset({
        id: initialData?.id,
        category_id: categoryId,
        name: initialData?.name || '',
        description: initialData?.description || '',
        price: initialData?.price || 0,
        image_url: initialData?.image_url || null,
        order_index: initialData?.order_index || 0,
        is_active: initialData?.is_active ?? true,
      });
      setPreviewImage(initialData?.image_url || null);
    }
  }, [open, initialData, categoryId, reset]);

  const handleFileSelect = async (file: File) => {
    const entityId = initialData?.id || categoryId; // Usa o ID do item se existir, senão o da categoria
    
    // Usando showLoading para obter um ID de toast para dismiss
    const uploadToastId = showSuccess("Iniciando upload da imagem...");
    
    try {
      const { url, error } = await uploadImage(file, RESTAURANT_IMAGES_BUCKET, entityId, 'item');
      
      if (error) throw error;
      
      setValue('image_url', url, { shouldValidate: true });
      setPreviewImage(url);
      showSuccess("Imagem enviada com sucesso!"); // Removido toastId
    } catch (e) {
      showError(`Falha no upload: ${(e as Error).message}`); // Removido toastId
    }
  };

  const onSubmit = (data: ItemFormData) => {
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Utensils className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl font-bold text-primary">
              {initialData ? 'Editar Item' : 'Novo Item'}
            </DialogTitle>
          </div>
          <DialogDescription>
            Detalhes do prato ou produto no seu cardápio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Image Upload */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Utensils className="w-8 h-8 text-gray-400" />
              )}
              <ImageUploadButton
                onFileSelect={handleFileSelect}
                uploading={isUploadingImage}
                className="absolute bottom-0 right-0 h-6 w-6 p-0 bg-primary text-white hover:bg-primary/90"
                icon={<Camera className="h-3 w-3" />}
              />
            </div>
            <p className="text-sm text-gray-600">Adicione uma foto de destaque para o item.</p>
          </div>

          {/* Name */}
          <div>
            <Input
              {...register('name')}
              placeholder="Nome do Item (Ex: Pizza Calabresa)"
              className="h-12 rounded-xl text-base focus:border-highlight focus:ring-highlight"
              disabled={isSaving || isUploadingImage}
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>
          
          {/* Price */}
          <div>
            <Input
              {...register('price', { valueAsNumber: true })}
              type="number"
              step="0.01"
              placeholder="Preço (R$)"
              className="h-12 rounded-xl text-base focus:border-highlight focus:ring-highlight"
              disabled={isSaving || isUploadingImage}
            />
            {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
          </div>

          {/* Description */}
          <div>
            <Textarea
              {...register('description')}
              placeholder="Descrição detalhada do item..."
              rows={3}
              className="rounded-xl text-base focus:border-highlight focus:ring-highlight"
              disabled={isSaving || isUploadingImage}
            />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isUploadingImage}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || isUploadingImage} className="bg-highlight hover:bg-highlight/90">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Salvar Item"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}