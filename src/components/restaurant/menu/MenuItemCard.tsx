import React, { useState } from 'react';
import { MenuItem } from '@/types/menu';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreVertical, Edit, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useDeleteMenuItem, useUpdateMenuItem } from '@/hooks/useMenuManagement'; // Corrigido
import { toast } from 'react-hot-toast';
import ItemFormDialog from './ItemFormDialog';
import { formatCurrency } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MenuItemCardProps {
  item: MenuItem;
  categoryId: string;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, categoryId }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const deleteMutation = useDeleteMenuItem();
  const updateMutation = useUpdateMenuItem();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(item.id);
      toast.success('Item excluído com sucesso!');
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast.error('Falha ao excluir item.');
    }
  };

  const handleToggleActive = async () => {
    const newStatus = !item.is_active;
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        updates: { is_active: newStatus },
      });
      toast.success(`Item ${newStatus ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alternar status do item:', error);
      toast.error('Falha ao alternar status do item.');
    }
  };

  const isDeleting = deleteMutation.isPending;
  const isUpdating = updateMutation.isPending;

  return (
    <>
      <Card className="relative flex flex-col h-full transition-shadow hover:shadow-lg">
        {!item.is_active && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg">
            <span className="text-white font-bold text-lg bg-red-600 px-3 py-1 rounded-full">
              INATIVO
            </span>
          </div>
        )}
        
        {item.image_url && (
          <div className="relative h-40 overflow-hidden rounded-t-lg">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold line-clamp-2">{item.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow pt-0">
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
              {item.description}
            </p>
          )}
          <p className="text-xl font-bold text-primary">
            {formatCurrency(item.price)}
          </p>
        </CardContent>
        <CardFooter className="flex justify-end p-3 pt-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleActive} disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : item.is_active ? (
                  <EyeOff className="mr-2 h-4 w-4" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                {item.is_active ? 'Desativar' : 'Ativar'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)} 
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <ItemFormDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialData={item}
        categoryId={categoryId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o item &quot;{item.name}&quot; do seu cardápio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MenuItemCard;