import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MenuCategory } from '@/types';
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
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, is_active: boolean) => Promise<void>;
  initialData: MenuCategory | null;
  isLoading: boolean;
}

const categorySchema = z.object({
  name: z.string().min(3, "O nome da categoria deve ter pelo menos 3 caracteres."),
  is_active: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const CategoryFormDialog: React.FC<CategoryFormDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  initialData,
  isLoading,
}) => {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || '',
      is_active: initialData?.is_active ?? true,
    },
  });

  const is_active = watch('is_active');

  React.useEffect(() => {
    if (open) {
      reset({
        name: initialData?.name || '',
        is_active: initialData?.is_active ?? true,
      });
    }
  }, [open, initialData, reset]);

  const onSubmit = async (data: CategoryFormValues) => {
    await onSave(data.name, data.is_active);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">
            {initialData ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
          <DialogDescription>
            Defina o nome e a visibilidade desta seção do seu cardápio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ex: Pizzas Clássicas"
              className="h-12 rounded-xl text-base focus:border-highlight focus:ring-highlight"
              disabled={isLoading}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex items-center justify-between space-x-2 pt-2">
            <Label htmlFor="is_active" className="flex flex-col space-y-1">
              <span className="text-sm font-medium leading-none">Visibilidade Pública</span>
              <span className="text-xs text-muted-foreground">
                {is_active ? 'Ativa: Visível no cardápio público.' : 'Inativa: Oculta dos clientes.'}
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
                'Salvar Categoria'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryFormDialog;