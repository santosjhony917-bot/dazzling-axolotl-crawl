import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { ArrowLeft, PlusCircle, Utensils, GripVertical } from 'lucide-react'
import { MenuItemList } from '@/components/restaurant/menu/MenuItemList'
import { MenuItemDialog } from '@/components/restaurant/menu/MenuItemDialog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MenuCategory, MenuItem } from '@/types'
import { CategoryDialog } from '@/components/restaurant/menu/CategoryDialog'

type MenuDataItem = MenuCategory & { items: MenuItem[] }

export function AdminRestaurantMenuPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const { toast } = useToast()

  const [restaurantName, setRestaurantName] = useState('')
  const [menuData, setMenuData] = useState<MenuDataItem[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | undefined>(undefined)

  const fetchMenuData = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)

    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', restaurantId)
      .single()

    if (restaurantError || !restaurantData) {
      toast({ title: 'Erro', description: 'Restaurante não encontrado.', variant: 'destructive' })
      setLoading(false)
      return
    }
    setRestaurantName(restaurantData.name)

    const { data: categories, error: categoriesError } = await supabase
      .from('menu_categories')
      .select(`*, menu_items ( * )`)
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true })
      .order('order_index', { foreignTable: 'menu_items', ascending: true })

    if (categoriesError) {
      toast({ title: 'Erro ao carregar menu', description: categoriesError.message, variant: 'destructive' })
    } else {
      setMenuData(categories as MenuDataItem[])
    }

    setLoading(false)
  }, [restaurantId, toast])

  useEffect(() => {
    fetchMenuData()
  }, [fetchMenuData])

  const handleItemDialogClose = (refresh: boolean) => {
    setIsItemDialogOpen(false)
    setEditingItem(undefined)
    setSelectedCategoryId(null)
    if (refresh) fetchMenuData()
  }

  const handleNewItem = (categoryId: string) => {
    setEditingItem(undefined)
    setSelectedCategoryId(categoryId)
    setIsItemDialogOpen(true)
  }

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setSelectedCategoryId(item.category_id)
    setIsItemDialogOpen(true)
  }

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId)
    if (error) {
      toast({ title: 'Erro ao deletar item', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Item deletado com sucesso!' })
      fetchMenuData()
    }
  }

  const handleCategoryDialogClose = (refresh: boolean) => {
    setIsCategoryDialogOpen(false)
    setEditingCategory(undefined)
    if (refresh) fetchMenuData()
  }

  const handleNewCategory = () => {
    setEditingCategory(undefined)
    setIsCategoryDialogOpen(true)
  }

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category)
    setIsCategoryDialogOpen(true)
  }

  const handleDeleteCategory = async (category: MenuCategory) => {
    if (category.items && (category.items as unknown as any[]).length > 0) {
      toast({ title: 'Ação não permitida', description: 'Delete todos os itens da categoria antes de removê-la.', variant: 'destructive' })
      return
    }
    const { error } = await supabase.from('menu_categories').delete().eq('id', category.id)
    if (error) {
      toast({ title: 'Erro ao deletar categoria', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Categoria deletada com sucesso!' })
      fetchMenuData()
    }
  }

  const handleStatusChange = async (item: MenuItem, isActive: boolean) => {
    setMenuData(currentData =>
      currentData.map(category => ({
        ...category,
        items: category.items.map(i =>
          i.id === item.id ? { ...i, is_active: isActive } : i
        ),
      }))
    )

    const { error } = await supabase
      .from('menu_items')
      .update({ is_active: isActive })
      .eq('id', item.id)

    if (error) {
      setMenuData(currentData =>
        currentData.map(category => ({
          ...category,
          items: category.items.map(i =>
            i.id === item.id ? { ...i, is_active: !isActive } : i
          ),
        }))
      )
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Status atualizado",
        description: `O item "${item.name}" foi ${isActive ? 'ativado' : 'desativado'}.`,
      })
    }
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/admin/restaurants">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Restaurantes
        </Link>
      </Button>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Utensils className="w-6 h-6 mr-3 text-primary" />
          Menu de {restaurantName}
        </h1>
        <Button onClick={handleNewCategory}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
      ) : menuData.length === 0 ? (
        <Alert>
          <AlertTitle>Nenhuma categoria encontrada</AlertTitle>
          <AlertDescription>Comece adicionando uma categoria para poder cadastrar os itens do seu menu.</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {menuData.map((category) => (
            <div key={category.id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <GripVertical className="w-5 h-5 text-gray-400 cursor-grab mr-2" />
                  <h2 className="text-xl font-semibold">{category.name}</h2>
                </div>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditCategory(category)}>Editar Categoria</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteCategory(category)}>Excluir Categoria</Button>
                  <Button size="sm" onClick={() => handleNewItem(category.id)}>Adicionar Item</Button>
                </div>
              </div>
              <MenuItemList
                items={category.items}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                onStatusChange={handleStatusChange}
              />
            </div>
          ))}
        </div>
      )}

      {isItemDialogOpen && selectedCategoryId && restaurantId && (
        <MenuItemDialog
          isOpen={isItemDialogOpen}
          onClose={handleItemDialogClose}
          item={editingItem}
          categoryId={selectedCategoryId}
          restaurantId={restaurantId}
        />
      )}

      {isCategoryDialogOpen && restaurantId && (
        <CategoryDialog
          isOpen={isCategoryDialogOpen}
          onClose={handleCategoryDialogClose}
          category={editingCategory}
          restaurantId={restaurantId}
        />
      )}
    </div>
  )
}