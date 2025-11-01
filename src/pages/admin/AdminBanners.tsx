"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/types/supabase'; // Importando TablesInsert e TablesUpdate
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Loader2, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AdminPageLayout from '@/components/admin/AdminPageLayout'; // Importando AdminPageLayout

type Banner = Tables<'banners'>;
type BannerTargetAudience = Banner['target_audience'];
type BannerTextPosition = Banner['text_position'];
type BannerTextSize = Banner['text_size'];

const fetchBanners = async (): Promise<Banner[]> => {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
};

const AdminBanners: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: banners = [], isLoading, error, refetch } = useQuery<Banner[], Error>({
    queryKey: ['adminBanners'],
    queryFn: fetchBanners,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formValues, setFormValues] = useState<Partial<Banner>>({});

  useEffect(() => {
    if (editingBanner) {
      setFormValues(editingBanner);
    } else {
      setFormValues({
        title: '',
        subtitle: '',
        image_url: '',
        link_url: '',
        order_index: banners.length > 0 ? Math.max(...banners.map(b => b.order_index || 0)) + 1 : 0,
        is_active: true,
        has_button: false,
        button_text: '',
        button_link: '',
        button_color: '#E47948',
        text_color: '#FFFFFF',
        text_position: 'bottom-left',
        text_size: 'md',
        target_audience: 'user',
      });
    }
  }, [editingBanner, banners]);

  const addBannerMutation = useMutation<Banner, Error, Partial<Banner>>({
    mutationFn: async (newBanner) => {
      const { data, error } = await supabase
        .from('banners')
        .insert(newBanner as TablesInsert<'banners'>) // Corrigido o tipo
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
      toast({ title: "Sucesso", description: "Banner adicionado com sucesso." });
      setIsDialogOpen(false);
    },
    onError: (err) => {
      toast({ title: "Erro", description: `Erro ao adicionar banner: ${err.message}`, variant: "destructive" });
    },
  });

  const updateBannerMutation = useMutation<Banner, Error, Partial<Banner>>({
    mutationFn: async (updatedBanner) => {
      if (!updatedBanner.id) throw new Error("ID do banner é obrigatório para atualização.");
      const { data, error } = await supabase
        .from('banners')
        .update(updatedBanner as TablesUpdate<'banners'>) // Corrigido o tipo
        .eq('id', updatedBanner.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
      toast({ title: "Sucesso", description: "Banner atualizado com sucesso." });
      setIsDialogOpen(false);
    },
    onError: (err) => {
      toast({ title: "Erro", description: `Erro ao atualizar banner: ${err.message}`, variant: "destructive" });
    },
  });

  const deleteBannerMutation = useMutation<void, Error, string>({
    mutationFn: async (bannerId) => {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', bannerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
      toast({ title: "Sucesso", description: "Banner excluído com sucesso." });
    },
    onError: (err) => {
      toast({ title: "Erro", description: `Erro ao excluir banner: ${err.message}`, variant: "destructive" });
    },
  });

  const handleSaveBanner = async () => {
    if (editingBanner) {
      await updateBannerMutation.mutateAsync(formValues);
    } else {
      await addBannerMutation.mutateAsync(formValues);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este banner?')) {
      await deleteBannerMutation.mutateAsync(bannerId);
    }
  };

  if (isLoading) {
    return (
      <AdminPageLayout>
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AdminPageLayout>
    );
  }

  if (error) {
    toast({
      title: "Erro",
      description: "Não foi possível carregar os banners.",
      variant: "destructive",
    });
    return (
      <AdminPageLayout>
        <div className="text-center text-red-500 py-8">
          <p>Erro ao carregar banners. Por favor, tente novamente.</p>
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <div className="container mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold text-[#022D68] mb-6">Gerenciamento de Banners</h1>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold">Banners Ativos</CardTitle>
            <Button onClick={() => { setEditingBanner(null); setIsDialogOpen(true); }} className="bg-[#E47948] hover:bg-[#C2653B]">
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Banner
            </Button>
          </CardHeader>
          <CardDescription className="px-6">
            Gerencie os banners que aparecem no aplicativo para diferentes públicos.
          </CardDescription>
          <CardContent className="pt-4">
            {banners.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhum banner adicionado ainda.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {banners.map((banner) => (
                  <Card key={banner.id} className="relative overflow-hidden rounded-lg shadow-md">
                    <img src={banner.image_url} alt={banner.title} className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-between p-3 text-white">
                      <div>
                        <h3 className="font-bold text-lg">{banner.title}</h3>
                        {banner.subtitle && <p className="text-sm">{banner.subtitle}</p>}
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${banner.is_active ? 'bg-green-500' : 'bg-red-500'}`}>
                          {banner.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingBanner(banner); setIsDialogOpen(true); }}>
                            <Edit className="h-5 w-5 text-white" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteBanner(banner.id)}>
                            <Trash2 className="h-5 w-5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingBanner ? 'Editar Banner' : 'Adicionar Novo Banner'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Título</Label>
                <Input id="title" value={formValues.title || ''} onChange={(e) => setFormValues({ ...formValues, title: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subtitle" className="text-right">Subtítulo</Label>
                <Input id="subtitle" value={formValues.subtitle || ''} onChange={(e) => setFormValues({ ...formValues, subtitle: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="image_url" className="text-right">URL da Imagem</Label>
                <Input id="image_url" value={formValues.image_url || ''} onChange={(e) => setFormValues({ ...formValues, image_url: e.target.value })} className="col-span-3" />
              </div>
              {formValues.image_url && (
                <div className="col-span-4 flex justify-center">
                  <img src={formValues.image_url} alt="Preview" className="max-h-48 object-contain rounded-md" />
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="link_url" className="text-right">Link URL</Label>
                <Input id="link_url" value={formValues.link_url || ''} onChange={(e) => setFormValues({ ...formValues, link_url: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="order_index" className="text-right">Ordem</Label>
                <Input id="order_index" type="number" value={formValues.order_index || 0} onChange={(e) => setFormValues({ ...formValues, order_index: parseInt(e.target.value) })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="is_active" className="text-right">Ativo</Label>
                <Switch id="is_active" checked={formValues.is_active || false} onCheckedChange={(checked) => setFormValues({ ...formValues, is_active: checked })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="has_button" className="text-right">Tem Botão</Label>
                <Switch id="has_button" checked={formValues.has_button || false} onCheckedChange={(checked) => setFormValues({ ...formValues, has_button: checked })} className="col-span-3" />
              </div>
              {formValues.has_button && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="button_text" className="text-right">Texto do Botão</Label>
                    <Input id="button_text" value={formValues.button_text || ''} onChange={(e) => setFormValues({ ...formValues, button_text: e.target.value })} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="button_link" className="text-right">Link do Botão</Label>
                    <Input id="button_link" value={formValues.button_link || ''} onChange={(e) => setFormValues({ ...formValues, button_link: e.target.value })} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="button_color" className="text-right">Cor do Botão</Label>
                    <Input id="button_color" type="color" value={formValues.button_color || '#E47948'} onChange={(e) => setFormValues({ ...formValues, button_color: e.target.value })} className="col-span-3" />
                  </div>
                </>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="text_color" className="text-right">Cor do Texto</Label>
                <Input id="text_color" type="color" value={formValues.text_color || '#FFFFFF'} onChange={(e) => setFormValues({ ...formValues, text_color: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="text_position" className="text-right">Posição do Texto</Label>
                <Select value={formValues.text_position || 'bottom-left'} onValueChange={(value: BannerTextPosition) => setFormValues({ ...formValues, text_position: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione a posição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-left">Inferior Esquerda</SelectItem>
                    <SelectItem value="bottom-center">Inferior Centro</SelectItem>
                    <SelectItem value="bottom-right">Inferior Direita</SelectItem>
                    <SelectItem value="top-left">Superior Esquerda</SelectItem>
                    <SelectItem value="top-center">Superior Centro</SelectItem>
                    <SelectItem value="top-right">Superior Direita</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="text_size" className="text-right">Tamanho do Texto</Label>
                <Select value={formValues.text_size || 'md'} onValueChange={(value: BannerTextSize) => setFormValues({ ...formValues, text_size: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o tamanho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">Pequeno</SelectItem>
                    <SelectItem value="md">Médio</SelectItem>
                    <SelectItem value="lg">Grande</SelectItem>
                    <SelectItem value="xl">Extra Grande</SelectItem>
                    <SelectItem value="2xl">2X Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="target_audience" className="text-right">Público Alvo</Label>
                <Select value={formValues.target_audience || 'user'} onValueChange={(value: BannerTargetAudience) => setFormValues({ ...formValues, target_audience: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o público" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário Comum</SelectItem>
                    <SelectItem value="restaurant_free">Restaurante Grátis</SelectItem>
                    <SelectItem value="restaurant_premium">Restaurante Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveBanner} disabled={addBannerMutation.isPending || updateBannerMutation.isPending}>
                {addBannerMutation.isPending || updateBannerMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Banner'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPageLayout>
  );
};

export default AdminBanners;