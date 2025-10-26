import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MenuItem } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Camera } from 'lucide-react';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

const formSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  description: z.string().max(500, 'A descrição não pode exceder 500 caracteres.').optional(),
  price: z.coerce.number().min(0.01, 'O preço deve ser maior que zero.'),
  image_url: z.string().url('URL de imagem inválida.').optional().or(z.literal('')),
  is_active: z.boolean().default(true),
});

export type MenuItemFormValues = z.infer<typeof formSchema>;

interface MenuItemFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  initialData: MenuItem | null;
  onSave: (data: MenuItemFormValues) => Promise<void>;
  isLoading: boolean;
}

export default function MenuItemFormDialog({
  isOpen,
  onClose,
  categoryId,
  initialData,
  onSave,
  isLoading,
}: MenuItemFormDialogProps) {
  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      image_url: initialData?.image_url || '',
      is_active: initialData?.is_active ?? true,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || '',
        price: initialData.price,
        image_url: initialData.image_url || '',
        is_active: initialData.is_active,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        price: 0,
        image_url: '',
        is_active: true,
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: MenuItemFormValues) => {
    await onSave(values);
    // Não chama onClose aqui, pois o componente pai faz isso após o sucesso da mutação
  };
  
  const currentImageUrl = form.watch('image_url');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Item' : 'Novo Item de Menu'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Imagem e Upload */}
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagem do Item (Opcional)</FormLabel>
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 shadow-soft-sm">
                      <img 
                        src={currentImageUrl || PLACEHOLDER_IMAGE_URL} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <ImageUploadButton
                      onUploadComplete={(url) => field.onChange(url)}
                      bucketName={RESTAURANT_IMAGES_BUCKET}
                      folderPath={`${categoryId}/items`}
                      className="h-10 flex-1 bg-highlight hover:bg-highlight/90 rounded-xl shadow-soft-md"
                      icon={<Camera className="h-4 w-4 mr-2" />}
                    >
                      {field.value ? "Trocar Imagem" : "Adicionar Imagem"}
                    </ImageUploadButton>
                  </div>
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
                    <Input placeholder="Ex: Hambúrguer Clássico" {...field} className="h-10 rounded-xl shadow-soft-sm" />
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
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Breve descrição do item..." {...field} className="rounded-xl shadow-soft-sm" />
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
                      className="h-10 rounded-xl shadow-soft-sm"
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      value={field.value === 0 ? '' : field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 shadow-soft-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Ativo (Visível ao público)</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-highlight"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="rounded-xl shadow-soft-sm">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 rounded-xl shadow-soft-md">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}