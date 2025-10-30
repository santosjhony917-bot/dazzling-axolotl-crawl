import React from 'react';
import { MenuCategory } from '@/types/menu'; // Corrigido
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

// Define the schema for form validation
const categorySchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  is_active: z.boolean().default(true),
  order_index: z.number().optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string; 
  initialData: MenuCategory | null;
  onSave: (data: CategoryFormValues) => Promise<void>; 
  isLoading: boolean; 
}

export default function CategoryFormDialog({ isOpen, onClose, initialData, onSave, isLoading }: CategoryFormDialogProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || '',
      is_active: initialData?.is_active ?? true,
      order_index: initialData?.order_index ?? 0,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: initialData?.name || '',
        is_active: initialData?.is_active ?? true,
        order_index: initialData?.order_index ?? 0,
      });
    }
  }, [isOpen, initialData, form]);

  const onSubmit = async (data: CategoryFormValues) => {
    await onSave(data);
    onClose();
  };

  const isSubmitting = isLoading; 

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome da Categoria</Label>
            <Input
              id="name"
              {...form.register('name')}
              disabled={isSubmitting}
              className="h-10 rounded-lg"
            />
            {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
            <Label htmlFor="is_active">Ativa (Visível ao público)</Label>
            <Switch
              id="is_active"
              checked={form.watch('is_active')}
              onCheckedChange={(checked) => form.setValue('is_active', checked)}
              disabled={isSubmitting}
              className="data-[state=checked]:bg-highlight"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}