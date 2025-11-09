"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Loader2, AlertTriangle, Trash2, Edit, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthData } from '@/context/AuthContext';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  order_index: number;
  is_active: boolean;
  target_audience: 'user' | 'restaurant';
  has_button: boolean;
  button_text: string | null;
  button_link: string | null;
  button_color: string | null;
  text_color: string | null;
  text_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  text_size: 'sm' | 'md' | 'lg';
}

interface BannersManagementProps {
  restaurantId: string; // Although banners are global, this prop might be used for context or future filtering
}

const BannersManagement: React.FC<BannersManagementProps> = ({ restaurantId }) => {
  const { isAdmin, user } = useAuthData();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<Banner | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [targetAudience, setTargetAudience] = useState<'user' | 'restaurant'>('user');
  const [hasButton, setHasButton] = useState(false);
  const [buttonText, setButtonText] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  const [buttonColor, setButtonColor] = useState('#E47948');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textPosition, setTextPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'>('bottom-left');
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchBanners();
    } else {
      setLoading(false);
      setError('Você não tem permissão para gerenciar banners.');
    }
  }, [isAdmin]);

  const fetchBanners = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching banners:', error);
      setError('Falha ao carregar banners.');
      toast.error('Erro ao carregar banners.');
    } else {
      setBanners(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setLinkUrl('');
    setIsActive(true);
    setTargetAudience('user');
    setHasButton(false);
    setButtonText('');
    setButtonLink('');
    setButtonColor('#E47948');
    setTextColor('#FFFFFF');
    setTextPosition('bottom-left');
    setTextSize('md');
    setCurrentBanner(null);
  };

  const handleOpenDialog = (banner?: Banner) => {
    if (banner) {
      setCurrentBanner(banner);
      setTitle(banner.title);
      setSubtitle(banner.subtitle || '');
      setImageUrl(banner.image_url);
      setLinkUrl(banner.link_url || '');
      setIsActive(banner.is_active);
      setTargetAudience(banner.target_audience);
      setHasButton(banner.has_button);
      setButtonText(banner.button_text || '');
      setButtonLink(banner.button_link || '');
      setButtonColor(banner.button_color || '#E47948');
      setTextColor(banner.text_color || '#FFFFFF');
      setTextPosition(banner.text_position);
      setTextSize(banner.text_size);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user?.id}/banners/${fileName}`;

    setUploadingImage(true);
    const { error: uploadError } = await supabase.storage
      .from('restaurant_images') // Assuming a general bucket for all images
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      toast.error('Erro ao fazer upload da imagem.');
      setUploadingImage(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('restaurant_images')
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      toast.error('Erro ao obter URL pública da imagem.');
      setUploadingImage(false);
      return;
    }

    setImageUrl(publicUrlData.publicUrl);
    toast.success('Imagem do banner carregada com sucesso!');
    setUploadingImage(false);
  };

  const handleSubmit = async () => {
    if (!title || !imageUrl) {
      toast.error('Título e URL da imagem são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    const bannerData = {
      title,
      subtitle: subtitle || null,
      image_url: imageUrl,
      link_url: linkUrl || null,
      is_active: isActive,
      target_audience: targetAudience,
      has_button: hasButton,
      button_text: buttonText || null,
      button_link: buttonLink || null,
      button_color: buttonColor || null,
      text_color: textColor || null,
      text_position: textPosition,
      text_size: textSize,
      order_index: currentBanner ? currentBanner.order_index : banners.length,
    };

    let error;
    if (currentBanner) {
      // Update existing banner
      ({ error } = await supabase
        .from('banners')
        .update(bannerData)
        .eq('id', currentBanner.id));
    } else {
      // Add new banner
      ({ error } = await supabase
        .from('banners')
        .insert(bannerData));
    }

    if (error) {
      console.error('Error saving banner:', error);
      toast.error('Erro ao salvar banner.');
    } else {
      toast.success(`Banner ${currentBanner ? 'atualizado' : 'adicionado'} com sucesso!`);
      fetchBanners();
      setIsDialogOpen(false);
      resetForm();
    }
    setIsSubmitting(false);
  };

  const handleDeleteBanner = async (id: string) => {
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting banner:', error);
      toast.error('Erro ao deletar banner.');
    } else {
      toast.success('Banner deletado com sucesso!');
      fetchBanners();
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-lg">Você não tem permissão para gerenciar banners.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && error !== 'Você não tem permissão para gerenciar banners.') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Banner
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{currentBanner ? 'Editar Banner' : 'Adicionar Novo Banner'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Título</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subtitle" className="text-right">Subtítulo</Label>
              <Input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image_url" className="text-right">URL da Imagem</Label>
              <Input id="image_url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image_upload" className="text-right">Upload Imagem</Label>
              <Input
                id="image_upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="col-span-3"
                disabled={uploadingImage}
              />
              {uploadingImage && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link_url" className="text-right">URL de Link</Label>
              <Input id="link_url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="targetAudience" className="text-right">Público Alvo</Label>
              <Select value={targetAudience} onValueChange={(value: 'user' | 'restaurant') => setTargetAudience(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o público" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuários</SelectItem>
                  <SelectItem value="restaurant">Restaurantes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="textPosition" className="text-right">Posição do Texto</Label>
              <Select value={textPosition} onValueChange={(value: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center') => setTextPosition(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione a posição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-left">Superior Esquerdo</SelectItem>
                  <SelectItem value="top-right">Superior Direito</SelectItem>
                  <SelectItem value="bottom-left">Inferior Esquerdo</SelectItem>
                  <SelectItem value="bottom-right">Inferior Direito</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="textSize" className="text-right">Tamanho do Texto</Label>
              <Select value={textSize} onValueChange={(value: 'sm' | 'md' | 'lg') => setTextSize(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o tamanho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Pequeno</SelectItem>
                  <SelectItem value="md">Médio</SelectItem>
                  <SelectItem value="lg">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="textColor" className="text-right">Cor do Texto</Label>
              <Input id="textColor" type="color" value={textColor || '#FFFFFF'} onChange={(e) => setTextColor(e.target.value)} className="col-span-3 h-8" />
            </div>
            <div className="flex items-center justify-between col-span-4">
              <Label htmlFor="isActive">Ativo</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <div className="flex items-center justify-between col-span-4">
              <Label htmlFor="hasButton">Tem Botão</Label>
              <Switch checked={hasButton} onCheckedChange={setHasButton} />
            </div>
            {hasButton && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="buttonText" className="text-right">Texto do Botão</Label>
                  <Input id="buttonText" value={buttonText} onChange={(e) => setButtonText(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="buttonLink" className="text-right">Link do Botão</Label>
                  <Input id="buttonLink" value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="buttonColor" className="text-right">Cor do Botão</Label>
                  <Input id="buttonColor" type="color" value={buttonColor || '#E47948'} onChange={(e) => setButtonColor(e.target.value)} className="col-span-3 h-8" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={isSubmitting || uploadingImage}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {currentBanner ? 'Salvar Alterações' : 'Adicionar Banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {banners.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center">
          Nenhum banner adicionado ainda.
        </p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Público</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell>{banner.title}</TableCell>
                  <TableCell>{banner.target_audience === 'user' ? 'Usuários' : 'Restaurantes'}</TableCell>
                  <TableCell>{banner.is_active ? 'Sim' : 'Não'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(banner)}
                      className="mr-2"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <ConfirmationDialog
                      title="Deletar Banner"
                      description="Tem certeza que deseja deletar este banner?"
                      onConfirm={() => handleDeleteBanner(banner.id)}
                      confirmButtonText="Deletar"
                      confirmButtonVariant="destructive"
                    >
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ConfirmationDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default BannersManagement;