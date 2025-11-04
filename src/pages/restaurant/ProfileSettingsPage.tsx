"use client"

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { MainLayout } from '@/layouts/MainLayout'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X, MapPin, Clock, Link as LinkIcon, Trash2, Plus, Image as ImageIcon, Building, Mail, Phone, Info, Globe, Edit, Save, ImagePlus } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RestaurantSocialLinks } from '@/components/dashboard/restaurant/RestaurantSocialLinks'
import { RestaurantPaymentMethods } from '@/components/dashboard/restaurant/RestaurantPaymentMethods'
import { EditHoursDialog } from '@/components/EditHoursDialog'
import { ImageUploader } from '@/components/ImageUploader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { GalleryManager } from '@/components/dashboard/restaurant/GalleryManager'
import { RestaurantAddressForm } from '@/components/dashboard/restaurant/RestaurantAddressForm'

const restaurantCategories = [
  "Açaí", "Alemã", "Árabe", "Brasileira", "Cafeteria", "Carnes", "Chinesa", "Contemporânea",
  "Coreana", "Doces & Bolos", "Espanhola", "Francesa", "Frutos do Mar", "Galeteria",
  "Gourmet", "Indiana", "Italiana", "Japonesa", "Lanches", "Marmitas", "Mediterrânea",
  "Mexicana", "Pizzaria", "Portuguesa", "Saudável", "Sorveteria", "Tailandesa", "Variada", "Vegana", "Vegetariana"
]

export default function ProfileSettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchRestaurant()
    }
  }, [user])

  const fetchRestaurant = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      toast.error('Erro ao carregar os dados do restaurante.')
      console.error(error)
    } else {
      setRestaurant(data)
    }
    setLoading(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setRestaurant({ ...restaurant, [name]: value })
  }

  const handleSelectChange = (name, value) => {
    setRestaurant({ ...restaurant, [name]: value })
  }

  const handleSocialLinksChange = (newLinks) => {
    setRestaurant({ ...restaurant, social_networks: newLinks })
  }

  const handlePaymentMethodsChange = (newMethods) => {
    setRestaurant({ ...restaurant, payment_methods: newMethods })
  }

  const handleImageUpload = async (file, type) => {
    if (!file) return

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${type}-${Date.now()}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    setSaving(true)
    const { error: uploadError } = await supabase.storage
      .from('restaurant-images')
      .upload(filePath, file)

    if (uploadError) {
      toast.error(`Erro ao fazer upload da imagem: ${uploadError.message}`)
      setSaving(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-images')
      .getPublicUrl(filePath)

    setRestaurant({ ...restaurant, [type]: publicUrl })
    await handleSave({ [type]: publicUrl })
    setSaving(false)
  }

  const handleSave = async (updatedFields = {}) => {
    setSaving(true)
    const updates = { ...restaurant, ...updatedFields }
    // Remove fields that should not be sent
    delete updates.id
    delete updates.created_at
    delete updates.user_id

    const { data, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      toast.error('Erro ao salvar as alterações.')
      console.error(error)
    } else {
      toast.success('Perfil atualizado com sucesso!')
      setRestaurant(data)
    }
    setSaving(false)
  }
  
  const handleRestaurantUpdate = (updatedRestaurant) => {
    setRestaurant(updatedRestaurant);
  }

  if (loading) {
    return <MainLayout><div className="flex justify-center items-center h-screen"><p>Carregando...</p></div></MainLayout>
  }

  if (!restaurant) {
    return (
      <MainLayout>
        <div className="container mx-auto py-10 px-4 text-center">
          <h1 className="text-3xl font-bold mb-4">Você ainda não tem um restaurante</h1>
          <p className="mb-6">Crie o perfil do seu restaurante para começar a gerenciar seu cardápio digital.</p>
          <Button onClick={() => navigate('/create-restaurant')}>Criar Perfil do Restaurante</Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-10 px-4">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Configurações do Perfil</h1>
          <p className="mt-2 text-lg text-gray-600">Gerencie as informações do seu restaurante que serão exibidas aos clientes.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Info className="mr-2 h-5 w-5" />Informações Básicas</CardTitle>
                <CardDescription>Nome, descrição e categoria do seu restaurante.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Restaurante</Label>
                  <Input id="name" name="name" value={restaurant.name || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" name="description" value={restaurant.description || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select name="category" value={restaurant.category || ''} onValueChange={(value) => handleSelectChange('category', value)}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {restaurantCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Mail className="mr-2 h-5 w-5" />Informações de Contato</CardTitle>
                <CardDescription>Como seus clientes podem entrar em contato.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" name="phone" type="tel" value={restaurant.phone || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_url">WhatsApp (link completo, ex: https://wa.me/5511...)</Label>
                  <Input id="whatsapp_url" name="whatsapp_url" type="url" value={restaurant.whatsapp_url || ''} onChange={handleInputChange} />
                </div>
              </CardContent>
            </Card>

            {/* Address Card */}
            <RestaurantAddressForm restaurant={restaurant} onUpdate={setRestaurant} />

            {/* Images Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><ImageIcon className="mr-2 h-5 w-5" />Imagens</CardTitle>
                <CardDescription>Logo e imagem de capa do seu perfil.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <ImageUploader
                    currentImage={restaurant.image_url}
                    onImageSelect={(file) => handleImageUpload(file, 'image_url')}
                    buttonText="Trocar Logo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imagem de Capa</Label>
                  <ImageUploader
                    currentImage={restaurant.cover_image_url}
                    onImageSelect={(file) => handleImageUpload(file, 'cover_image_url')}
                    buttonText="Trocar Capa"
                    aspectRatio="aspect-[2/1]"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Gallery Card */}
            <GalleryManager restaurantId={restaurant.id} />

            {/* Links & Hours Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5" />Links e Horários</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Horários de Funcionamento</Label>
                  <Button variant="outline" onClick={() => setIsHoursDialogOpen(true)}>
                    <Clock className="mr-2 h-4 w-4" />
                    Definir horários de funcionamento
                  </Button>
                </div>
                <RestaurantSocialLinks
                  socialLinks={restaurant.social_networks || []}
                  onSocialLinksChange={handleSocialLinksChange}
                />
                <RestaurantPaymentMethods
                  paymentMethods={restaurant.payment_methods || {}}
                  onPaymentMethodsChange={handlePaymentMethodsChange}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Salvar Alterações</CardTitle>
                <CardDescription>Revise e salve as informações do seu perfil.</CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-col space-y-4">
                <Button className="w-full" onClick={() => handleSave()} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Tudo'}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir Restaurante
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Essa ação não pode ser desfeita. Isso excluirá permanentemente seu restaurante
                        e todos os dados associados, como cardápios e itens.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        // onClick={handleDeleteRestaurant}
                      >
                        Sim, excluir restaurante
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      <EditHoursDialog
        open={isHoursDialogOpen}
        onOpenChange={setIsHoursDialogOpen}
        restaurant={restaurant}
        onUpdate={handleRestaurantUpdate}
      />
    </MainLayout>
  )
}