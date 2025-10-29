import React from 'react';
import { MenuItem } from '@/types/menu';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { Edit, Trash2, Eye, EyeOff, GripVertical, Loader2 } from 'lucide-react'; // Importando Loader2
import { Button } from '@/components/ui/button';
import { useDeleteMenuItem } from '@/hooks/useMenuItemManagement'; // CORRIGIDO
import { toast } from 'react-hot-toast';
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
  onEdit: (item: MenuItem) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onEdit }) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const deleteMutation = useDeleteMenuItem();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(item.id);
      toast.success('Item excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast.error('Falha ao excluir item.');
    }
  };

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow border-l-4 border-primary/50">
      <CardContent className="p-4 flex items-center gap-4">
        
        {/* Drag Handle */}
        <div className="cursor-grab text-gray-400 hover:text-primary transition-colors flex-shrink-0">
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Imagem */}
        {item.image_url && (
          <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
            <img 
              src={item.image_url} 
              alt={item.name} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Detalhes */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold truncate">{item.name}</h3>
            {/* Corrigindo Erros 8 e 9: Usando aria-label em vez de title */}
            {item.is_active ? (
              <Eye className="w-4 h-4 text-green-600" aria-label="Visível no perfil público" />
            ) : (
              <EyeOff className="w-4 h-4 text-red-500" aria-label="Oculto no perfil público" />
            )}
          </div>
          <p className="text-sm text-gray-600 truncate">{item.description || 'Sem descrição.'}</p>
          <p className="text-base font-bold text-primary mt-1">{formatPrice(item.price)}</p>
        </div>

        {/* Ações */}
        <div className="flex flex-col space-y-2 flex-shrink-0">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 text-primary hover:bg-primary hover:text-white"
            onClick={() => onEdit(item)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 text-red-500 hover:bg-red-500 hover:text-white"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={deleteMutation.isPending}
          >
            {/* Corrigindo Erro 10 */}
            {deleteMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o item "{item.name}" do seu cardápio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {/* Corrigindo Erro 11 */}
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default MenuItemCard;