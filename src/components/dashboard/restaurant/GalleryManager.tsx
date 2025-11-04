"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImagePlus, Trash2 } from 'lucide-react'

export function GalleryManager({ restaurantId }) {
  const [gallery, setGallery] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (restaurantId) {
      fetchGallery()
    }
  }, [restaurantId])

  const fetchGallery = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('restaurant_gallery')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true })
    
    if (error) {
      toast.error('Erro ao carregar a galeria.')
    } else {
      setGallery(data)
    }
    setLoading(false)
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${restaurantId}-gallery-${Date.now()}.${fileExt}`
    const filePath = `${restaurantId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('restaurant-images')
      .upload(filePath, file)

    if (uploadError) {
      toast.error(`Erro no upload: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-images')
      .getPublicUrl(filePath)

    const { error: insertError } = await supabase
      .from('restaurant_gallery')
      .insert({ restaurant_id: restaurantId, image_url: publicUrl })

    if (insertError) {
      toast.error('Erro ao salvar imagem na galeria.')
    } else {
      toast.success('Imagem adicionada à galeria!')
      fetchGallery()
    }
    setUploading(false)
  }

  const handleDeleteImage = async (imageId, imageUrl) => {
    const path = imageUrl.split('/restaurant-images/')[1]
    await supabase.storage.from('restaurant-images').remove([path])
    const { error } = await supabase.from('restaurant_gallery').delete().eq('id', imageId)

    if (error) {
      toast.error('Erro ao excluir imagem.')
    } else {
      toast.success('Imagem excluída.')
      fetchGallery()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center"><ImagePlus className="mr-2 h-5 w-5" />Galeria de Fotos</span>
          <Button asChild variant="outline" size="sm">
            <label>
              {uploading ? 'Enviando...' : 'Adicionar Imagem'}
              <input type="file" className="hidden" onChange={handleImageUpload} disabled={uploading} accept="image/*" />
            </label>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <p>Carregando galeria...</p> : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.map(image => (
              <div key={image.id} className="relative group">
                <img src={image.image_url} alt={image.caption || 'Imagem da galeria'} className="rounded-md object-cover aspect-square" />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                  <Button variant="destructive" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => handleDeleteImage(image.id, image.image_url)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {gallery.length === 0 && <p className="text-sm text-gray-500 col-span-full">Nenhuma imagem na galeria ainda.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}