import React from 'react';
import { MenuCategory } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

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
  // Adicionando 'watch' aqui
  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || '',
      is_active: initialData?.is_active ?? true,
      order_index: initialData?.order_index ?? 0,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: initialData?.name || '',
        is_active: initialData?.is_active ?? true,
        order_index: initialData?.order_index ?? 0,
      });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = (data: CategoryFormValues) => {
    onSave(data).then(onClose);
  };

  const is_active = watch('is_active');
  const isSubmitting = isLoading; 

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome da Categoria</Label>
            <Input
              id="name"
              {...register('name')}
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="is_active">Ativa</Label>
            <Switch
              id="is_active"
              checked={is_active}
              {...register('is_active')}
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar Categoria'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}