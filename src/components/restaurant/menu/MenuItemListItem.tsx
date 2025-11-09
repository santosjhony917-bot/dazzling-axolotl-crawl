import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { MenuItem } from "@/types"
import { formatPrice } from "@/utils/formatters"

interface MenuItemListItemProps {
  item: MenuItem
  onEdit: (item: MenuItem) => void
  onDelete: (itemId: string) => void
  onStatusChange: (item: MenuItem, isActive: boolean) => void
}

export function MenuItemListItem({ item, onEdit, onDelete, onStatusChange }: MenuItemListItemProps) {
  return (
    <div className="flex items-center p-3 bg-white rounded-lg shadow-sm">
      <img
        src={item.image_url || '/placeholder.svg'}
        alt={item.name}
        className="w-16 h-16 rounded-md object-cover mr-4"
      />
      <div className="flex-1">
        <h3 className="font-semibold text-gray-800">{item.name}</h3>
        <p className="text-sm text-gray-500 truncate">{item.description}</p>
        <div className="flex items-center text-primary font-medium mt-1">
          <span className="font-bold text-highlight">{formatPrice(item.price)}</span>
        </div>
      </div>
      <div className="flex items-center space-x-3 ml-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={item.is_active}
            onCheckedChange={(checked) => onStatusChange(item, checked)}
            aria-label={`Ativar/desativar ${item.name}`}
          />
          <span className="text-sm text-gray-600">Ativo</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="text-gray-500 hover:text-primary">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-700">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}