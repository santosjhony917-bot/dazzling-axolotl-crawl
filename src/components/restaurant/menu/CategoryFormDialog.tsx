import React from 'react';
import { MenuCategory } from '@/types/supabase'; // Import MenuCategory from supabase types
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Define the schema for form validation
const categorySchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  is_active: z.boolean().default(true),
  is_popular: z.boolean().default(false), // Adicionado is_popular
  order_index: z.number().optional(),
  section_name: z.string().optional(),
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
  const [sections, setSections] = React.useState<{ id: string; name: string }[]>([]);
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || '',
      is_active: initialData?.is_active ?? true,
      is_popular: initialData?.is_popular ?? false, // Definindo valor padrão para is_popular
      order_index: initialData?.order_index ?? 0,
      section_name: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      supabase
        .from('menu_sections')
        .select('id,name')
        .eq('restaurant_id', restaurantId)
        .order('order_index')
        .then(({ data }) => setSections((data || []) as { id: string; name: string }[]));
      form.reset({
        name: initialData?.name || '',
        is_active: initialData?.is_active ?? true,
        is_popular: initialData?.is_popular ?? false, // Resetando is_popular
        order_index: initialData?.order_index ?? 0,
        section_name: '',
      });
    }
  }, [isOpen, initialData, form, restaurantId]);

  React.useEffect(() => {
    if (!isOpen || !initialData?.section_id || !sections.length) return;
    const section = sections.find(item => item.id === initialData.section_id);
    if (section) form.setValue('section_name', section.name);
  }, [isOpen, initialData?.section_id, sections, form]);

  const onSubmit = async (data: CategoryFormValues) => {
    await onSave(data);
    // onClose(); // onClose é chamado pelo componente pai após o save
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

          <div className="grid gap-2">
            <Label htmlFor="section_name">Menu principal / Seção (opcional)</Label>
            <Input
              id="section_name"
              list="menu-section-options"
              placeholder="Ex: Menu do Chefe, Menu à La Carte, Sobremesas"
              {...form.register('section_name')}
              disabled={isSubmitting}
              className="h-10 rounded-lg"
            />
            <datalist id="menu-section-options">
              {sections.map(section => <option key={section.id} value={section.name} />)}
            </datalist>
            <p className="text-xs text-muted-foreground">
              Use quando o cardápio tem abas principais e subcategorias. Ex: Menu do Chefe &gt; NA BRASA.
            </p>
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

          <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
            <Label htmlFor="is_popular">Popular (Destacar no menu)</Label>
            <Switch
              id="is_popular"
              checked={form.watch('is_popular')}
              onCheckedChange={(checked) => form.setValue('is_popular', checked)}
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
