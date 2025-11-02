import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/integrations/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import BannerPreview from '@/components/admin/BannerPreview';
import { getSelectablePagePaths, createPageUrl } from '@/utils/url';

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  order_index: number;
  is_active: boolean;
  target_audience: 'user' | 'restaurant' | 'admin';
  has_button: boolean;
  button_text?: string;
  button_link?: string;
  button_color?: string;
  text_color?: string;
  text_position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  text_size?: 'sm' | 'md' | 'lg';
}

export default function AdminBanners() {
  const queryClient = useQueryClient();
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: banners, isLoading, error } = useQuery<Banner[], Error>({
    queryKey: ['adminBanners'],
    queryFn: async () => {
      const { data, error } = await base44.integrations.supabase.from('banners').select('*').order('order_index');
      if (error) throw error;
      return data;
    },
  });

  const addUpdateBannerMutation = useMutation({
    mutationFn: async (banner: Partial<Banner>) => {
      if (banner.id) {
        const { error } = await base44.integrations.supabase.from('banners').update(banner).eq('id', banner.id);
        if (error) throw error;
      } else {
        const { error } = await base44.integrations.supabase.from('banners').insert(banner);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
      showSuccess(editingBanner?.id ? "Banner atualizado com sucesso!" : "Banner adicionado com sucesso!");
      setEditingBanner(null);
    },
    onError: (err: any) => {
      showError(`Erro: ${err.message}`);
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await base44.integrations.supabase.from('banners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
      showSuccess("Banner excluído com sucesso!");
    },
    onError: (err: any) => {
      showError(`Erro ao excluir banner: ${err.message}`);
    },
  });

  const handleSave = async () => {
    if (!editingBanner?.title || !editingBanner?.image_url) {
      showError("Título e URL da imagem são obrigatórios.");
      return;
    }
    setIsSubmitting(true);
    addUpdateBannerMutation.mutate(editingBanner);
  };

  const selectablePagePaths = getSelectablePagePaths();

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto my-10" />;
  if (error) return <div className="text-red-500 text-center">Erro ao carregar banners: {error.message}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-primary mb-6">Gerenciar Banners</h1>

      <Button onClick={() => setEditingBanner({ is_active: true, order_index: 0, target_audience: 'user', has_button: false, button_color: '#E47948', text_color: '#FFFFFF', text_position: 'bottom-left', text_size: 'md' })} className="mb-6">
        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo Banner
      </Button>

      {editingBanner && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6 space-y-4">
          <h2 className="text-xl font-semibold text-primary">{editingBanner.id ? "Editar Banner" : "Novo Banner"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input id="title" value={editingBanner.title || ''} onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="subtitle">Subtítulo</Label>
              <Input id="subtitle" value={editingBanner.subtitle || ''} onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="imageUrl">URL da Imagem</Label>
              <Input id="imageUrl" value={editingBanner.image_url || ''} onChange={(e) => setEditingBanner({ ...editingBanner, image_url: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="linkUrl">URL de Destino (clique no banner)</Label>
              <Select
                value={editingBanner.link_url || ''}
                onValueChange={(value) => setEditingBanner({ ...editingBanner, link_url: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma página ou insira uma URL" />
                </SelectTrigger>
                <SelectContent>
                  {selectablePagePaths.map(page => (
                    <SelectItem key={page.value} value={page.value}>{page.label}</SelectItem>
                  ))}
                  {/* Opção para inserir URL manual */}
                  <SelectItem value="custom-url">Outra URL...</SelectItem>
                </SelectContent>
              </Select>
              {editingBanner.link_url === 'custom-url' && (
                <Input
                  className="mt-2"
                  placeholder="https://exemplo.com"
                  value={editingBanner.link_url === 'custom-url' ? '' : editingBanner.link_url || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, link_url: e.target.value })}
                />
              )}
            </div>
            <div>
              <Label htmlFor="orderIndex">Ordem</Label>
              <Input id="orderIndex" type="number" value={editingBanner.order_index || 0} onChange={(e) => setEditingBanner({ ...editingBanner, order_index: parseInt(e.target.value) })} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="isActive" checked={editingBanner.is_active} onCheckedChange={(checked) => setEditingBanner({ ...editingBanner, is_active: checked })} />
              <Label htmlFor="isActive">Ativo</Label>
            </div>
            <div>
              <Label htmlFor="targetAudience">Público Alvo</Label>
              <Select
                value={editingBanner.target_audience || 'user'}
                onValueChange={(value: 'user' | 'restaurant' | 'admin') => setEditingBanner({ ...editingBanner, target_audience: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o público" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuários (Clientes)</SelectItem>
                  <SelectItem value="restaurant">Restaurantes</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="hasButton" checked={editingBanner.has_button} onCheckedChange={(checked) => setEditingBanner({ ...editingBanner, has_button: checked })} />
              <Label htmlFor="hasButton">Tem Botão</Label>
            </div>
            {editingBanner.has_button && (
              <>
                <div>
                  <Label htmlFor="buttonText">Texto do Botão</Label>
                  <Input id="buttonText" value={editingBanner.button_text || ''} onChange={(e) => setEditingBanner({ ...editingBanner, button_text: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="buttonLink">Link do Botão</Label>
                  <Input id="buttonLink" value={editingBanner.button_link || ''} onChange={(e) => setEditingBanner({ ...editingBanner, button_link: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="buttonColor">Cor do Botão</Label>
                  <Input id="buttonColor" type="color" value={editingBanner.button_color || '#E47948'} onChange={(e) => setEditingBanner({ ...editingBanner, button_color: e.target.value })} />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="textColor">Cor do Texto</Label>
              <Input id="textColor" type="color" value={editingBanner.text_color || '#FFFFFF'} onChange={(e) => setEditingBanner({ ...editingBanner, text_color: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="textPosition">Posição do Texto</Label>
              <Select
                value={editingBanner.text_position || 'bottom-left'}
                onValueChange={(value: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center') => setEditingBanner({ ...editingBanner, text_position: value })}
              >
                <SelectTrigger>
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
            <div>
              <Label htmlFor="textSize">Tamanho do Texto</Label>
              <Select
                value={editingBanner.text_size || 'md'}
                onValueChange={(value: 'sm' | 'md' | 'lg') => setEditingBanner({ ...editingBanner, text_size: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tamanho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Pequeno</SelectItem>
                  <SelectItem value="md">Médio</SelectItem>
                  <SelectItem value="lg">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setEditingBanner(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingBanner.id ? "Salvar Alterações" : "Adicionar Banner"}
            </Button>
          </div>
          {editingBanner.image_url && editingBanner.title && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Pré-visualização:</h3>
              <BannerPreview banner={editingBanner as Banner} />
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {banners?.map((banner) => (
          <div key={banner.id} className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-primary">{banner.title}</h3>
              <p className="text-sm text-text-secondary">{banner.subtitle}</p>
              <p className="text-xs text-gray-500">Ordem: {banner.order_index} | Ativo: {banner.is_active ? 'Sim' : 'Não'}</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => setEditingBanner(banner)}>Editar</Button>
              <Button variant="destructive" size="sm" onClick={() => deleteBannerMutation.mutate(banner.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}