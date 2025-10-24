import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, UtensilsCrossed } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MenuCategory } from '@/types/restaurant';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CategoryFormData) => void;
  isSaving: boolean;
  initialData?: MenuCategory | null;
}

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "O nome da categoria é obrigatório."),
  order_index: z.number().min(0, "A ordem deve ser 0 ou maior").optional(),
  is_active: z.boolean().optional(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export default function CategoryFormDialog({ open, onOpenChange, onSave, isSaving, initialData }: CategoryFormDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      id: initialData?.id,
      name: initialData?.name || '',
      order_index: initialData?.order_index || 0,
      is_active: initialData?.is_active ?? true,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        id: initialData?.id,
        name: initialData?.name || '',
        order_index: initialData?.order_index || 0,
        is_active: initialData?.is_active ?? true,
      });
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: CategoryFormData) => {
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl font-bold text-primary">
              {initialData ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </div>
          <DialogDescription>
            Defina o nome e a ordem de exibição da sua categoria.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input
              {...register('name')}
              placeholder="Nome da Categoria (Ex: Bebidas, Pizzas)"
              className="h-12 rounded-xl text-base focus:border-highlight focus:ring-highlight"
              disabled={isSaving}
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>
          
          <div>
            <Input
              {...register('order_index', { valueAsNumber: true })}
              type="number"
              placeholder="Ordem de Exibição (0 para o topo)"
              className="h-12 rounded-xl text-base focus:border-highlight focus:ring-highlight"
              disabled={isSaving}
            />
            {errors.order_index && <p className="text-sm text-destructive mt-1">{errors.order_index.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-highlight hover:bg-highlight/90">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Salvar Categoria"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}