import { MenuItem } from "@/types"
import { MenuItemListItem } from "./MenuItemListItem"

interface MenuItemListProps {
  items: MenuItem[]
  onEdit: (item: MenuItem) => void
  onDelete: (itemId: string) => void
  onStatusChange: (item: MenuItem, isActive: boolean) => void
}

export function MenuItemList({ items, onEdit, onDelete, onStatusChange }: MenuItemListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Nenhum item encontrado nesta categoria.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <MenuItemListItem
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  )
}