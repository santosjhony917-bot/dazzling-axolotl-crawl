import React from 'react';
import { Category } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowUp, ArrowDown, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CategoryCardProps {
  category: Category;
  onEdit: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onEdit, onDelete, onMoveUp, onMoveDown }) => {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Menu className="h-6 w-6 text-gray-400 cursor-grab" />
          <Link to={`/restaurant-area/menu/${category.id}/items`} className="hover:underline">
            <h3 className="text-lg font-semibold text-gray-800">{category.name}</h3>
          </Link>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Order Controls */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onMoveUp} 
            disabled={!onMoveUp}
            title="Mover para cima"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onMoveDown} 
            disabled={!onMoveDown}
            title="Mover para baixo"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>

          {/* Action Controls */}
          <Button variant="outline" size="icon" onClick={onEdit} title="Editar Categoria">
            <Edit className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button variant="destructive" size="icon" onClick={onDelete} title="Excluir Categoria">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryCard;