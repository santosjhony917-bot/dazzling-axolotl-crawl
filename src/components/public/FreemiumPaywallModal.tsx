import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import WhatsappIcon from "./WhatsappIcon";

interface FreemiumPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

export default function FreemiumPaywallModal({ isOpen, onClose, onUnlock }: FreemiumPaywallModalProps) {
  const handleShare = () => {
    // 1. Defina as flags locais no localStorage para liberar 1000 acessos
    localStorage.setItem('acesso_vitalicio', 'true');
    localStorage.setItem('has_unlocked_limit', 'true');
    
    // 2. Chame o callback de liberação imediata para atualizar o estado no componente pai
    onUnlock();

    // 3. Monte a mensagem do WhatsApp (focando em utilidade social: Happy Hour!)
    const message = "Galera, olha que top esse app para ver cardápios completos e preços reais! Vamos marcar o próximo Happy Hour por aqui? Baixem aí: filterfood.com.br/download";
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    
    // 4. Abra o link do WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl p-6 border border-white/20 bg-white/90 backdrop-blur-md shadow-2xl flex flex-col items-center text-center">
        <DialogHeader className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center animate-bounce">
            <span className="text-3xl">⚠️</span>
          </div>
          <DialogTitle className="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight">
            Sua cota diária de 5 cardápios expirou!
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 leading-relaxed font-medium">
            Quer liberar mais <span className="font-extrabold text-highlight">1.000 cardápios para sempre</span>? Compartilhe o FilterFood com 5 amigos ou no grupo da galera para marcar o próximo Happy Hour!
          </DialogDescription>
        </DialogHeader>

        <div className="w-full mt-6 space-y-4">
          <Button
            onClick={handleShare}
            className="w-full h-14 bg-[#25D366] hover:bg-[#20ba56] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-[#25D366]/25 transition-all active:scale-95 border-none"
          >
            <WhatsappIcon className="w-6 h-6 fill-white" />
            CONVIDAR 5 AMIGOS PELO WHATSAPP
          </Button>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors underline decoration-dotted underline-offset-4"
          >
            (Fechar e continuar navegando)
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
