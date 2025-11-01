"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle, Edit, Trash2, Image as ImageIcon, Link as LinkIcon, Palette, Type, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AdminPageLayout from '@/components/admin/AdminPageLayout';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  order_index: number;
  is_active: boolean;
  target_audience: 'user' | 'restaurant_free' | 'restaurant_premium';
  has_button: boolean;
  button_text: string;
  button_link: string;
  button_color: string;
  text_color: string;
}

const AdminBanners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [targetAudience, setTargetAudience] = useState<'user' | 'restaurant_free' | 'restaurant_premium'>('user');
  const [hasButton, setHasButton] = useState(false);
  const [buttonText, setButtonText] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  const [buttonColor, setButtonColor] = useState('#E47948'); // Default highlight color
  const [textColor, setTextColor] = useState('#FFFFFF'); // Default white

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
      toast({
        title: 'Erro ao carregar banners',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setBanners(data as Banner[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingBanner(null);
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setLinkUrl('');
    setOrderIndex(0);
    setIsActive(true);
    setTargetAudience('user');
    setHasButton(false);
    setButtonText('');
    setButtonLink('');
    setButtonColor('#E47948');
    setTextColor('#FFFFFF');
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setTitle(banner.title);
    setSubtitle(banner.subtitle);
    setImageUrl(banner.image_url);
    setLinkUrl(banner.link_url);
    setOrderIndex(banner.order_index);
    setIsActive(banner.is_active);
    setTargetAudience(banner.target_audience);
    setHasButton(banner.has_button);
    setButtonText(banner.button_text);
    setButtonLink(banner.button_link);
    setButtonColor(banner.button_color);
    setTextColor(banner.text_color);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const bannerData = {
      title,
      subtitle,
      image_url: imageUrl,
      link_url: linkUrl,
      order_index: orderIndex,
      is_active: isActive,
      target_audience: targetAudience,
      has_button: hasButton,
      button_text: hasButton ? buttonText : '',
      button_link: hasButton ? buttonLink : '',
      button_color: hasButton ? buttonColor : '#E47948',
      text_color: textColor,
    };

    if (editingBanner) {
      const { error } = await supabase
        .from('banners')
        .update(bannerData)
        .eq('id', editingBanner.id);

      if (error) {
        toast({
          title: 'Erro ao atualizar banner',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Banner atualizado com sucesso!',
          variant: 'default', // Corrigido para 'default'
        });
        fetchBanners();
        setIsModalOpen(false);
      }
    } else {
      const { error } = await supabase
        .from('banners')
        .insert(bannerData);

      if (error) {
        toast({
          title: 'Erro ao criar banner',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Banner criado com sucesso!',
          variant: 'default', // Corrigido para 'default'
        });
        fetchBanners();
        setIsModalOpen(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este banner?')) return;

    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao excluir banner',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Banner excluído com sucesso!',
        variant: 'default', // Corrigido para 'default'
      });
      fetchBanners();
    }
  };

  return (
    <AdminPageLayout
      title="Gerenciar Banners"
      description="Crie e edite banners para diferentes públicos (usuário final, restaurante free, restaurante premium)."
    >
      <div className="flex justify-end mb-4">
        <Button onClick={openCreateModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo Banner
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Público</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell className="font-medium">{banner.title}</TableCell>
                  <TableCell>{banner.target_audience}</TableCell>
                  <TableCell>
                    {banner.is_active ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell>{banner.order_index}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(banner)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(banner.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBanner ? 'Editar Banner' : 'Adicionar Novo Banner'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Título</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subtitle" className="text-right">Subtítulo</Label>
              <Textarea id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="imageUrl" className="text-right">URL da Imagem</Label>
              <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="linkUrl" className="text-right">URL do Link</Label>
              <Input id="linkUrl" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="orderIndex" className="text-right">Ordem</Label>
              <Input id="orderIndex" type="number" value={orderIndex} onChange={(e) => setOrderIndex(parseInt(e.target.value))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="targetAudience" className="text-right">Público-alvo</Label>
              <Select value={targetAudience} onValueChange={(value: 'user' | 'restaurant_free' | 'restaurant_premium') => setTargetAudience(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o público" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário Final</SelectItem>
                  <SelectItem value="restaurant_free">Restaurante Free</SelectItem>
                  <SelectItem value="restaurant_premium">Restaurante Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">Ativo</Label>
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} className="col-span-3" />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hasButton" className="text-right">Tem Botão</Label>
              <Switch id="hasButton" checked={hasButton} onCheckedChange={setHasButton} className="col-span-3" />
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
                  <Input id="buttonColor" type="color" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} className="col-span-2 h-8" />
                  <Input id="buttonColorHex" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} className="col-span-1" />
                </div>
              </>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="textColor" className="text-right">Cor do Texto</Label>
              <Input id="textColor" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="col-span-2 h-8" />
              <Input id="textColorHex" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="col-span-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editingBanner ? 'Salvar Alterações' : 'Criar Banner'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
};

export default AdminBanners;