import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';

const PromoRedirect = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [error, setError] = useState(false);

  useEffect(() => {
    const processRedirect = async () => {
      if (!shortCode) return;

      try {
        // 1. Encontrar o rastreador pelo código curto
        const { data: tracker, error: trackerError } = await supabase
          .from('qr_trackers')
          .select('lead_id, campaign_id')
          .eq('short_code', shortCode)
          .single();

        if (trackerError || !tracker) {
          throw new Error('Código promocional inválido ou expirado.');
        }

        // 2. Registrar o evento 'QRCodeScanned'
        await supabase.from('commercial_events').insert({
          lead_id: tracker.lead_id,
          campaign_id: tracker.campaign_id,
          event_type: 'QRCodeScanned',
          actor_type: 'Lead',
          payload: { 
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        });

        // 3. Invocar a Edge Function para disparar a IA B2B via WhatsApp
        // A IA receberá o gatilho "Scanned" e chamará o número empresarial (`restaurants.phone`).
        await supabase.functions.invoke('whatsapp-webhook', {
          body: { event: 'QRCodeScanned', lead_id: tracker.lead_id }
        });

        // 4. Lógica de redirecionamento dinâmico para as lojas
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        let storeUrl = 'https://play.google.com/store/apps/details?id=com.filterfood.app'; // Default: Play Store

        if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
            storeUrl = 'https://apps.apple.com/br/app/filterfood/id123456789'; // App Store
        }

        window.location.replace(storeUrl);

      } catch (err: any) {
        console.error("Erro no redirecionamento:", err);
        setError(true);
        showError("Erro ao processar o código promocional.");
        setTimeout(() => window.location.replace('/'), 3000);
      }
    };

    processRedirect();
  }, [shortCode]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      {!error ? (
        <div className="flex flex-col items-center animate-pulse text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Redirecionando para a Loja...</h2>
          <p className="text-sm text-slate-400">Baixe o FilterFood para validar seu convite.</p>
        </div>
      ) : (
        <div className="text-center">
          <div className="w-16 h-16 bg-rose-900/30 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <span className="text-rose-500 text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Código não encontrado</h2>
          <p className="text-sm text-slate-400">Redirecionando você para o site principal...</p>
        </div>
      )}
    </div>
  );
};

export default PromoRedirect;

