import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { uploadImage, deleteImage } from '@/lib/supabase/storage';
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  order_index: number;
  is_active: boolean;
}

const BannersPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar banners: ' + error.message);
    } else {
      setBanners(data || []);
    }
    setLoading(false);
  };

  const handleSaveBanner = async (bannerData: Omit<Banner, 'id' | 'created_at'>, imageFile: File | null) => {
    let imageUrl = bannerData.image_url;
    const toastId = toast.loading('Salvando banner...');

    try {
      if (imageFile) {
        const filePath = `public/banners/${Date.now()}-${imageFile.name}`;
        imageUrl = await uploadImage(imageFile, 'banners', filePath);
        if (!imageUrl) throw new Error('Falha ao fazer upload da imagem.');
        
        // If editing and image changed, delete old image
        if (editingBanner && editingBanner.image_url && editingBanner.image_url !== imageUrl) {
          const oldImagePath = editingBanner.image_url.split('/').pop(); // Get filename from URL
          if (oldImagePath) {
            await deleteImage('banners', `public/banners/${oldImagePath}`);
          }
        }
      }

      if (editingBanner) {
        // Update existing banner
        const { error } = await supabase
          .from('banners')
          .update({ ...bannerData, image_url: imageUrl })
          .eq('id', editingBanner.id);

        if (error) throw error;
        toast.success('Banner atualizado com sucesso!', { id: toastId });
      } else {
        // Add new banner
        const { error } = await supabase
          .from('banners')
          .insert({ ...bannerData, image_url: imageUrl });

        if (error) throw error;
        toast.success('Banner adicionado com sucesso!', { id: toastId });
      }

      fetchBanners();
      setIsModalOpen(false);
      setEditingBanner(null);
    } catch (error: any) {
      toast.error('Erro ao salvar banner: ' + error.message, { id: toastId });
    }
  };

  const handleDeleteBanner = async (id: string, imageUrl: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este banner?')) return;
    const toastId = toast.loading('Excluindo banner...');

    try {
      // Delete image from storage
      const imagePath = imageUrl.split('/').pop(); // Get filename from URL
      if (imagePath) {
        await deleteImage('banners', `public/banners/${imagePath}`);
      }

      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Banner excluído com sucesso!', { id: toastId });
      fetchBanners();
    } catch (error: any) {
      toast.error('Erro ao excluir banner: ' + error.message, { id: toastId });
    }
  };

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingBanner(null);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gerenciar Banners</h1>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button onClick={openAddModal} className="mb-4">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo Banner
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingBanner ? 'Editar Banner' : 'Adicionar Banner'}</DialogTitle>
          </DialogHeader>
          <BannerForm
            initialData={editingBanner}
            onSave={handleSaveBanner}
            onCancel={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {banners.map((banner) => (
          <Card key={banner.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {banner.title}
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEditModal(banner)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDeleteBanner(banner.id, banner.image_url)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <img src={banner.image_url} alt={banner.title} className="w-full h-32 object-cover rounded-md mb-2" />
              <p className="text-sm text-gray-600">{banner.subtitle}</p>
              <p className="text-xs text-gray-500 mt-1">Ordem: {banner.order_index} | Ativo: {banner.is_active ? 'Sim' : 'Não'}</p>
              {banner.link_url && <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm hover:underline">Link</a>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

interface BannerFormProps {
  initialData?: Banner | null;
  onSave: (bannerData: Omit<Banner, 'id' | 'created_at'>, imageFile: File | null) => void;
  onCancel: () => void;
}

const BannerForm: React.FC<BannerFormProps> = ({ initialData, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || '');
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
  const [linkUrl, setLinkUrl] = useState(initialData?.link_url || '');
  const [orderIndex, setOrderIndex] = useState(initialData?.order_index || 0);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({ title, subtitle, image_url: imageUrl, link_url: linkUrl, order_index: orderIndex, is_active: isActive }, imageFile);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Título</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="subtitle">Subtítulo</Label>
        <Input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="image">Imagem</Label>
        <Input
          id="image"
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setImageFile(e.target.files[0]);
              setImageUrl(URL.createObjectURL(e.target.files[0])); // Preview
            }
          }}
        />
        {imageUrl && !imageFile && ( // Show current image if no new file selected
          <img src={imageUrl} alt="Current Banner" className="mt-2 w-full h-24 object-cover rounded-md" />
        )}
        {imageFile && ( // Show preview of new image
          <img src={URL.createObjectURL(imageFile)} alt="New Banner Preview" className="mt-2 w-full h-24 object-cover rounded-md" />
        )}
      </div>
      <div>
        <Label htmlFor="linkUrl">URL do Link (opcional)</Label>
        <Input id="linkUrl" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="orderIndex">Ordem de Exibição</Label>
        <Input id="orderIndex" type="number" value={orderIndex} onChange={(e) => setOrderIndex(parseInt(e.target.value))} />
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
        <Label htmlFor="isActive">Ativo</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {editingBanner ? 'Salvar Alterações' : 'Adicionar Banner'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default BannersPage;