import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MenuItem } from "@/types/menu";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MenuItemListItemProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (itemId: string) => void;
  onToggleActive: (item: MenuItem, isActive: boolean) => void;
}

export function MenuItemListItem({ item, onEdit, onDelete, onToggleActive }: MenuItemListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center bg-card p-3 rounded-lg shadow-sm mb-3">
      <button {...attributes} {...listeners} className="cursor-grab touch-none mr-3 text-muted-foreground">
        <GripVertical className="w-5 h-5" />
      </button>
      <img
        src={item.image_url || '/placeholder.svg'}
        alt={item.name}
        className="w-16 h-16 rounded-md object-cover mr-4"
      />
      <div className="flex-grow">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{item.name}</h3>
          {!item.is_active && <Badge variant="outline">Pausado</Badge>}
        </div>
        <p className="text-sm text-muted-foreground truncate max-w-xs">{item.description}</p>
        <div className="flex items-center text-primary font-medium mt-1">
          <span className="font-bold text-highlight">{formatPrice(item.price)}</span>
        </div>
      </div>
      <div className="flex items-center ml-4 space-x-2">
        <Switch
          checked={item.is_active}
          onCheckedChange={(checked) => onToggleActive(item, checked)}
          aria-label="Ativar/desativar item"
        />
        <button onClick={() => onEdit(item)} className="p-2 hover:bg-muted rounded-full">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(item.id)} className="p-2 hover:bg-muted rounded-full text-destructive">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}