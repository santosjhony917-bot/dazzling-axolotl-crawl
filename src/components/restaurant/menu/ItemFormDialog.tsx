import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MenuItem } from '@/types/menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { ImageUploadButton } from '@/components/ImageUploadButton';

const itemSchema = z.object({
  name: z.string().min(1, 'O nome do item é obrigatório.'),
  description: z.string().optional(),
  price: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val),
    z.number().min(0.01, 'O preço deve ser maior que zero.')
  ),
  image_url: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ItemFormValues) => Promise<void>;
  initialData?: MenuItem;
  isLoading: boolean;
  categoryId: string;
}

const ItemFormDialog: React.FC<ItemFormDialogProps> = ({ isOpen, onClose, onSave, initialData, isLoading, categoryId }) => {
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      image_url: initialData?.image_url || '',
    },
  });

  const onSubmit = async (data: ItemFormValues) => {
    await onSave(data);
    form.reset();
  };

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || '',
        price: initialData.price,
        image_url: initialData.image_url || '',
      });
    } else {
      form.reset({ name: '', description: '', price: 0, image_url: '' });
    }
  }, [initialData, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Item' : 'Novo Item de Cardápio'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagem do Item (Opcional)</FormLabel>
                  <FormControl>
                    <ImageUploadButton 
                      imageUrl={field.value}
                      onUploadComplete={(url) => field.onChange(url)}
                      bucketName="restaurant_images" // Usando o bucket principal
                      folderPath={`${categoryId}/items`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Item</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Pizza Calabresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Mussarela, calabresa, cebola..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      placeholder="19.90" 
                      {...field} 
                      onChange={(e) => field.onChange(e.target.value)}
                      value={field.value === 0 ? '' : field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : initialData ? (
                  'Salvar Alterações'
                ) : (
                  'Criar Item'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ItemFormDialog;