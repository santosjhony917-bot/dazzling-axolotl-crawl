import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface ReviewItem {
  id: string;
  name: string;
  price: number | null;
  price_type: string | null;
  price_source: string | null;
  extraction_confidence: number | null;
  menu_categories?: { name?: string } | null;
}

interface MenuImportReviewProps {
  restaurantId: string | null;
  restaurantName?: string;
  onClose: () => void;
}

export function MenuImportReview({ restaurantId, restaurantName, onClose }: MenuImportReviewProps) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    supabase
      .from('menu_items')
      .select('id,name,price,price_type,price_source,extraction_confidence,menu_categories!inner(name,restaurant_id)')
      .eq('menu_categories.restaurant_id', restaurantId)
      .eq('needs_review', true)
      .order('name')
      .then(({ data, error }) => {
        if (error) showError(`Não foi possível carregar a revisão: ${error.message}`);
        setItems((data || []) as unknown as ReviewItem[]);
        setPrices(Object.fromEntries((data || []).map((item: any) => [item.id, item.price != null ? String(item.price) : ''])));
        setLoading(false);
      });
  }, [restaurantId]);

  const confirmPrice = async (item: ReviewItem) => {
    const parsed = Number(String(prices[item.id] || '').replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0) {
      showError('Informe um preço válido.');
      return;
    }
    setSavingId(item.id);
    const { error } = await supabase.from('menu_items').update({
      price: parsed,
      price_min: parsed,
      price_max: parsed,
      price_type: parsed === 0 ? 'free' : 'fixed',
      price_source: 'manual_review',
      extraction_confidence: 1,
      needs_review: false
    }).eq('id', item.id);
    setSavingId(null);
    if (error) {
      showError(`Erro ao confirmar preço: ${error.message}`);
      return;
    }
    setItems(current => current.filter(currentItem => currentItem.id !== item.id));
    showSuccess('Preço confirmado.');
  };

  return (
    <Dialog open={Boolean(restaurantId)} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisão de preços — {restaurantName || 'Restaurante'}</DialogTitle>
          <DialogDescription>
            Somente itens que nenhuma fonte conseguiu precificar aparecem aqui. Preços por opção, faixas e itens incluídos não são tratados como erro.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-emerald-700">
            <Check className="h-8 w-8" />
            <span className="font-semibold">Nenhum preço pendente de revisão.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{item.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="outline">{item.menu_categories?.name || 'Cardápio'}</Badge>
                    <Badge variant="secondary">{item.price_type || 'unknown'}</Badge>
                    <span className="text-xs text-muted-foreground">Fonte: {item.price_source || 'não identificada'}</span>
                  </div>
                </div>
                <Input className="sm:w-32" inputMode="decimal" placeholder="R$ 0,00" value={prices[item.id] || ''} onChange={event => setPrices(current => ({ ...current, [item.id]: event.target.value }))} />
                <Button size="sm" onClick={() => confirmPrice(item)} disabled={savingId === item.id}>
                  {savingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
