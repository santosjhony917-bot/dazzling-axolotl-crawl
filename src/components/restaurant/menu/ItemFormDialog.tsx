import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MenuItem } from '@/types';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Utensils, Image, Trash2 } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

// Esquema de validação para o preço (string para facilitar a máscara, mas convertido para number)
const itemSchema = z.object({
  name: z.string().min(3, "O nome do item deve ter pelo menos 3 caracteres."),
  description: z.string().max(250, "A descrição deve ter no máximo 250 caracteres.").optional().nullable(),
  price: z.string().regex(/^\d{1,4}(,\d{2})?$/, "Preço inválido. Use o formato XX,XX ou XXXX."),
  is_active: z.boolean().default(true),
  image_url: z.string().optional().nullable(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (itemData: Omit<MenuItem, 'id' | 'category_id' | 'created_at'>, file: File | null) => Promise<void>;
  initialData: MenuItem | null;
  isLoading: boolean;
}

const ItemFormDialog: React.FC<ItemFormDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  initialData,
  isLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price ? initialData.price.toFixed(2).replace('.', ',') : '',
      is_active: initialData?.is_active ?? true,
      image_url: initialData?.image_url || null,
    },
  });

  const is_active = watch('is_active');
  const currentImageUrl = watch('image_url');

  useEffect(() => {
    if (open) {
      reset({
        name: initialData?.name || '',
        description: initialData?.description || '',
        price: initialData?.price ? initialData.price.toFixed(2).replace('.', ',') : '',
        is_active: initialData?.is_active ?? true,
        image_url: initialData?.image_url || null,
      });
      setSelectedFile(null);
      setPreviewUrl(initialData?.image_url || null);
    }
  }, [open, initialData, reset]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    if (value.length > 2) {
      value = value.replace(/(\d+)(\d{2})$/, '$1,$2'); // Insere a vírgula
    } else if (value.length === 1) {
      value = `0,0${value}`;
    } else if (value.length === 2) {
      value = `0,${value}`;
    }
    
    setValue('price', value, { shouldValidate: true });
  };

  // CORREÇÃO: Tornar a função assíncrona para corresponder à assinatura esperada
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setValue('image_url', file.name); // Apenas para validação, o URL real vem do upload
  };
  
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setValue('image_url', null);
  };

  const onSubmit = async (data: ItemFormValues) => {
    // Converte o preço de string (XX,XX) para number (XX.XX)
    const priceNumber = parseFloat(data.price.replace(',', '.'));
    
    const itemToSave: Omit<MenuItem, 'id' | 'category_id' | 'created_at'> = {
      name: data.name,
      description: data.description || null,
      price: priceNumber,
      image_url: initialData?.image_url || null, // Mantém o URL antigo se não houver novo upload
      order_index: initialData?.order_index ?? 0,
      is_active: data.is_active,
    };
    
    await onSave(itemToSave, selectedFile);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">
            {initialData ? 'Editar Item' : 'Novo Item do Cardápio'}
          </DialogTitle>
          <DialogDescription>
            Preencha os detalhes do prato ou produto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Imagem do Item */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative w-32 h-32 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Utensils className="w-8 h-8 text-gray-500" />
              )}
              
              <ImageUploadButton
                onFileSelect={handleFileSelect}
                uploading={isLoading}
                className="absolute bottom-0 right-0 h-8 w-8 p-0 bg-highlight text-white hover:bg-highlight/90"
                icon={<Image className="h-4 w-4" />}
              />
            </div>
            
            {(previewUrl && !isLoading) && (
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRemoveImage}
                    className="text-red-500 hover:bg-red-50"
                >
                    <Trash2 className="w-4 h-4 mr-1" /> Remover Imagem
                </Button>
            )}
            
            {errors.image_url && <p className="text-sm text-destructive">{errors.image_url.message}</p>}
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Item</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ex: Pizza Calabresa Especial"
              className="h-12 rounded-xl text-base focus:border-highlight focus:ring-highlight"
              disabled={isLoading}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Ingredientes, detalhes e diferenciais."
              rows={3}
              className="rounded-xl text-base focus:border-highlight focus:ring-highlight"
              disabled={isLoading}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          
          {/* Preço */}
          <div className="space-y-2">
            <Label htmlFor="price">Preço (R$)</Label>
            <Input
              id="price"
              {...register('price')}
              placeholder="Ex: 39,90"
              className="h-12 rounded-xl text-base focus:border-highlight focus:ring-highlight"
              onChange={handlePriceChange}
              disabled={isLoading}
            />
            {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
          </div>

          {/* Ativo Switch */}
          <div className="flex items-center justify-between space-x-2 pt-2">
            <Label htmlFor="is_active" className="flex flex-col space-y-1">
              <span className="text-sm font-medium leading-none">Visibilidade Pública</span>
              <span className="text-xs text-muted-foreground">
                {is_active ? 'Ativo: Visível no cardápio público.' : 'Inativo: Oculto dos clientes.'}
              </span>
            </Label>
            <Switch
              id="is_active"
              checked={is_active}
              onCheckedChange={(checked) => setValue('is_active', checked)}
              className={cn("data-[state=checked]:bg-highlight")}
              disabled={isLoading}
            />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-highlight hover:bg-highlight/90">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Salvar Item'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ItemFormDialog;