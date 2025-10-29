import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MenuItem } from '@/types/menu'; // Corrigido para importar MenuItem
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save } from 'lucide-react';
import { z } from 'zod';
import { useUpdateMenuItem, useCreateMenuItem } from '@/hooks/useMenuManagement';
import { toast } from 'react-hot-toast';
import ImageUpload from '@/components/ImageUpload';
import { useRestaurantContext } from '@/context/RestaurantContext';

// Esquema de validação
const itemFormSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  description: z.string().optional(),
  price: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val),
    z.number().min(0.01, 'O preço deve ser maior que zero.')
  ),
  image_url: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

interface ItemFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: MenuItem;
  categoryId: string;
}

const ItemFormDialog: React.FC<ItemFormDialogProps> = ({ isOpen, onOpenChange, initialData, categoryId }) => {
  const { restaurant } = useRestaurantContext();
  const restaurantId = restaurant?.id;

  const isEdit = !!initialData;
  const mutationUpdate = useUpdateMenuItem();
  const mutationCreate = useCreateMenuItem();

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      image_url: initialData?.image_url || null,
      is_active: initialData?.is_active ?? true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: initialData?.name || '',
        description: initialData?.description || '',
        price: initialData?.price || 0,
        image_url: initialData?.image_url || null,
        is_active: initialData?.is_active ?? true,
      });
    }
  }, [isOpen, initialData, form]);

  const onSubmit = async (values: ItemFormValues) => {
    if (!restaurantId) {
      toast.error('Erro: ID do restaurante não encontrado.');
      return;
    }

    const dataToSave = {
      ...values,
      price: values.price, // Já é number
      category_id: categoryId,
    };

    try {
      if (isEdit && initialData) {
        await mutationUpdate.mutateAsync({ id: initialData.id, updates: dataToSave });
        toast.success('Item atualizado com sucesso!');
      } else {
        await mutationCreate.mutateAsync(dataToSave);
        toast.success('Item criado com sucesso!');
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      toast.error(`Falha ao salvar item: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const isSubmitting = mutationUpdate.isPending || mutationCreate.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Item do Cardápio' : 'Adicionar Novo Item'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Upload de Imagem */}
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagem do Item (Opcional)</FormLabel>
                  <FormControl>
                    <ImageUpload
                      bucketName="menu_items"
                      currentImageUrl={field.value || undefined}
                      onUploadSuccess={(url) => field.onChange(url)}
                      onRemove={() => field.onChange(null)}
                      folderPath={`${restaurantId}/${categoryId}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Pizza Calabresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ex: Molho de tomate, mussarela, calabresa e cebola." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preço */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (R$)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      {...field} 
                      onChange={(e) => field.onChange(e.target.value)}
                      value={field.value === 0 ? '' : field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ativo */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Item Ativo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Se desativado, o item não aparecerá no perfil público.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isEdit ? 'Salvar Alterações' : 'Adicionar Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ItemFormDialog;