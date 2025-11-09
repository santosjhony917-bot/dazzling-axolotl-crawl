import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { ArrowLeft, PlusCircle, Utensils } from 'lucide-react'
import { MenuItemList } from '@/components/restaurant/menu/MenuItemList'
import { MenuItemDialog } from '@/components/restaurant/menu/MenuItemDialog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MenuItem, MenuCategory } from '@/types'

export function CategoryDetailsPage() {
  const { restaurantId, categoryId } = useParams<{ restaurantId: string, categoryId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [category, setCategory] = useState<MenuCategory | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined)

  const fetchCategoryAndItems = useCallback(async () => {
    if (!categoryId || !restaurantId) return

    setLoading(true)
    
    const { data: categoryData, error: categoryError } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('id', categoryId)
      .single()

    if (categoryError || !categoryData) {
      toast({
        title: 'Erro ao carregar categoria',
        description: categoryError?.message || 'Categoria não encontrada.',
        variant: 'destructive',
      })
      navigate(`/restaurant/${restaurantId}/menu`)
      return
    }
    setCategory(categoryData)

    const { data: itemsData, error: itemsError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('category_id', categoryId)
      .order('order_index', { ascending: true })

    if (itemsError) {
      toast({
        title: 'Erro ao carregar itens',
        description: itemsError.message,
        variant: 'destructive',
      })
    } else {
      setItems(itemsData)
    }

    setLoading(false)
  }, [categoryId, restaurantId, navigate, toast])

  useEffect(() => {
    fetchCategoryAndItems()
  }, [fetchCategoryAndItems])

  const handleDialogClose = (refresh: boolean) => {
    setIsDialogOpen(false)
    setEditingItem(undefined)
    if (refresh) {
      fetchCategoryAndItems()
    }
  }

  const handleNewItem = () => {
    setEditingItem(undefined)
    setIsDialogOpen(true)
  }

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setIsDialogOpen(true)
  }

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId)
    if (error) {
      toast({ title: 'Erro ao deletar item', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Item deletado com sucesso!' })
      fetchCategoryAndItems()
    }
  }

  const handleStatusChange = async (item: MenuItem, isActive: boolean) => {
    setItems(currentItems =>
      currentItems.map(i => (i.id === item.id ? { ...i, is_active: isActive } : i))
    )

    const { error } = await supabase
      .from('menu_items')
      .update({ is_active: isActive })
      .eq('id', item.id)

    if (error) {
      setItems(currentItems =>
        currentItems.map(i => (i.id === item.id ? { ...i, is_active: !isActive } : i))
      )
      toast({
        title: "Erro ao atualizar item",
        description: "Não foi possível alterar o status do item. Tente novamente.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Status do item atualizado!",
        description: `O item "${item.name}" foi ${isActive ? 'ativado' : 'desativado'}.`,
      })
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(`/restaurant/${restaurantId}/menu`)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para o Menu
      </Button>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Utensils className="w-6 h-6 mr-3 text-primary" />
          Gerenciar Itens
        </h1>
        <Button onClick={handleNewItem}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Novo Item
        </Button>
      </div>

      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <AlertTitle className="font-semibold text-blue-800">Itens em: {category?.name || 'Carregando...'}</AlertTitle>
        <AlertDescription className="text-blue-700">
          Adicione, edite ou remova os itens desta categoria.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      ) : (
        <MenuItemList
          items={items}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          onStatusChange={handleStatusChange}
        />
      )}

      {isDialogOpen && categoryId && restaurantId && (
        <MenuItemDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          item={editingItem}
          categoryId={categoryId}
          restaurantId={restaurantId}
        />
      )}
    </div>
  )
}