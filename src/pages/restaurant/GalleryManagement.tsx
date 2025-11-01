import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { Image, Plus, Loader2, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { RestaurantGallery } from '@/types/supabase';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// --- Tipos e Componentes Auxiliares ---

interface GalleryImage extends RestaurantGallery {
  isNew?: boolean;
}

interface SortableItemProps {
  image: GalleryImage;
  onDelete: (id: string) => void;
  onEdit: (image: GalleryImage) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ image, onDelete, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
      <img 
        src={image.image_url || PLACEHOLDER_IMAGE_URL} 
        alt={image.caption || 'Imagem da Galeria'} 
        className="w-full h-32 object-cover"
      />
      
      <div className="p-3">
        <p className="text-sm font-medium truncate">{image.caption || 'Sem legenda'}</p>
      </div>

      {/* Overlay de Ações */}
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => onEdit(image)}
          className="bg-white text-primary hover:bg-gray-100"
        >
          Editar
        </Button>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={() => onDelete(image.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Handle de Arrastar */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-2 left-2 cursor-grab p-1 bg-white/80 rounded-full shadow-md hover:bg-white transition-colors"
      >
        <GripVertical className="h-5 w-5 text-gray-600" />
      </div>
    </div>
  );
};

// --- Componente Principal ---

export default function GalleryManagement() {
  const { restaurant, isLoading: authLoading } = useAuthData();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<GalleryImage | null>(null);
  const [editCaption, setEditCaption] = useState('');

  const restaurantId = restaurant?.id;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchGallery = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('restaurant_gallery')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true });

    if (error) {
      showError("Erro ao carregar galeria: " + error.message);
    } else {
      setGallery(data as GalleryImage[]);
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const handleUploadComplete = useCallback(async (url: string) => {
    if (!restaurantId) return;
    setIsUploading(true);

    // 1. Determinar o próximo order_index
    const maxOrder = gallery.reduce((max, item) => Math.max(max, item.order_index || 0), 0);
    const newOrderIndex = maxOrder + 1;

    // 2. Inserir a nova imagem no DB
    const { data, error } = await supabase
      .from('restaurant_gallery')
      .insert({
        restaurant_id: restaurantId,
        image_url: url,
        caption: '',
        order_index: newOrderIndex,
      })
      .select()
      .single();

    setIsUploading(false);

    if (error) {
      showError("Erro ao salvar imagem: " + error.message);
    } else {
      showSuccess("Imagem adicionada com sucesso!");
      setGallery(prev => [...prev, data as GalleryImage]);
    }
  }, [restaurantId, gallery]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Tem certeza que deseja deletar esta imagem?")) return;

    // 1. Deletar do Storage (opcional, mas recomendado)
    // Não implementado aqui para simplificar, mas idealmente deveria ser feito.

    // 2. Deletar do DB
    const { error } = await supabase
      .from('restaurant_gallery')
      .delete()
      .eq('id', id);

    if (error) {
      showError("Erro ao deletar imagem: " + error.message);
    } else {
      showSuccess("Imagem deletada com sucesso!");
      setGallery(prev => prev.filter(item => item.id !== id));
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setGallery((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // 3. Atualizar order_index no DB (em lote)
        const updates = newItems.map((item, index) => ({
          id: item.id,
          order_index: index,
        }));
        
        // Disparar atualização assíncrona (sem esperar)
        supabase.from('restaurant_gallery')
          .upsert(updates)
          .then(({ error }) => {
            if (error) {
              console.error("Erro ao reordenar galeria:", error);
              showError("Erro ao salvar a nova ordem.");
            }
          });

        return newItems;
      });
    }
  }, []);
  
  const handleEditClick = (image: GalleryImage) => {
    setCurrentImage(image);
    setEditCaption(image.caption || '');
    setIsEditDialogOpen(true);
  };
  
  const handleSaveCaption = async () => {
    if (!currentImage) return;
    
    const { error } = await supabase
      .from('restaurant_gallery')
      .update({ caption: editCaption })
      .eq('id', currentImage.id);
      
    if (error) {
      showError("Erro ao salvar legenda: " + error.message);
    } else {
      showSuccess("Legenda atualizada!");
      setGallery(prev => prev.map(item => 
        item.id === currentImage.id ? { ...item, caption: editCaption } : item
      ));
      setIsEditDialogOpen(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <RestaurantAreaPageLayout title="Galeria de Imagens" icon={Image} backPath="/restaurant-area/profile">
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        <Card className="shadow-soft-md">
          <CardHeader>
            <CardTitle className="text-xl">Gerenciar Imagens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Arraste e solte as imagens para reordenar. A primeira imagem será usada como destaque na galeria.
            </p>
            
            <div className="flex items-center gap-4 mb-6">
              <ImageUploadButton
                onUploadComplete={handleUploadComplete}
                bucketName={RESTAURANT_IMAGES_BUCKET}
                folderPath={`${restaurantId}/gallery`}
                className="bg-primary text-white hover:bg-primary/90 h-10 w-10 p-0 rounded-lg shadow-md"
                icon={<Plus className="h-5 w-5" />}
                disabled={isUploading}
              />
              <span className="text-sm font-medium text-gray-700">
                {isUploading ? "Enviando..." : "Adicionar Imagem"}
              </span>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={gallery.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {gallery.map((image) => (
                    <SortableItem 
                      key={image.id} 
                      image={image} 
                      onDelete={handleDelete} 
                      onEdit={handleEditClick}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            
            {gallery.length === 0 && !loading && (
              <p className="text-center text-gray-500 mt-8">Nenhuma imagem na galeria ainda. Adicione a primeira!</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog de Edição de Legenda */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Legenda</DialogTitle>
            <DialogDescription>
              Adicione uma breve descrição para a imagem.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="caption">Legenda</Label>
              <Textarea
                id="caption"
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                placeholder="Ex: Nosso prato mais vendido!"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCaption}>Salvar Legenda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RestaurantAreaPageLayout>
  );
}