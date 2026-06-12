"use client";

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  X, 
  ArrowRight, 
  Crown, 
  Zap, 
  Lock, 
  Shield, 
  Loader2, 
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { useAuthData } from '@/context/AuthContext';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { PublicRestaurantData } from '@/types/restaurant';
import { WeekSchedule } from '@/types/schedule';

// --- Mock Schedule local ---
const mockSchedule: any = {
  Seg: { open: "18:00", close: "23:00", active: true },
  Ter: { open: "18:00", close: "23:00", active: true },
  Qua: { open: "18:00", close: "23:00", active: true },
  Qui: { open: "18:00", close: "23:00", active: true },
  Sex: { open: "18:00", close: "23:00", active: true },
  Sab: { open: "18:00", close: "23:00", active: true },
  Dom: { open: "18:00", close: "23:00", active: true },
};

// --- Benefícios de Alto Impacto ---
const premiumBenefits = [
  {
    title: "Perfil Atraente com Capa e Fotos",
    desc: "Clientes compram com os olhos. Adicione uma bela capa e fotos do ambiente.",
    icon: Sparkles,
    color: "text-amber-400 bg-amber-500/10 border border-amber-500/20"
  },
  {
    title: "Destaque Total nas Buscas",
    desc: "Fique no topo da lista na sua região e seja a primeira escolha dos clientes.",
    icon: TrendingUp,
    color: "text-rose-400 bg-rose-500/10 border border-rose-500/20"
  },
  {
    title: "Cardápio Completo com Fotos",
    desc: "Exiba todos os seus pratos com imagens irresistíveis, categorias e preços.",
    icon: Crown,
    color: "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20"
  },
  {
    title: "Links de Contato e Vendas",
    desc: "Botões rápidos para seu WhatsApp, iFood ou site próprio direto no perfil.",
    icon: Zap,
    color: "text-blue-400 bg-blue-500/10 border border-blue-500/20"
  }
];

// --- Comparativo de Recursos ---
const comparisonFeatures = [
  { label: "Capa e Identidade Visual", free: false, premium: true },
  { label: "Cardápio com Fotos", free: false, premium: true },
  { label: "Botões de WhatsApp e iFood", free: false, premium: true },
  { label: "Galeria de Fotos do Ambiente", free: false, premium: true },
  { label: "Destaque na Busca da Cidade", free: false, premium: true },
  { label: "Estatísticas de Visualizações", free: false, premium: true },
  { label: "Nome e Informações Básicas", free: true, premium: true },
  { label: "Exibição do Endereço", free: true, premium: true },
];

const UpgradePageContent: React.FC = () => {
  const navigate = useNavigate();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<'free' | 'premium'>('premium');
  const { restaurant } = useAuthData();

  const handleSubscribe = () => {
    setIsSubscribing(true);
    setTimeout(() => {
      alert("Iniciando processo de assinatura Premium!");
      setIsSubscribing(false);
    }, 1500);
  };
  
  const handleViewPremiumRestaurants = () => {
    navigate(createPageUrl('restaurantResults'));
  };

  const isRestaurantIdAvailable = !!restaurant?.id;

  // --- Construção dos Dados Mockados com Base no Restaurante Real ---
  const sanitizeName = (name: string) => {
    return name
      .replace(/\s*\(Free\)\s*/i, '')
      .replace(/\s*\(Premium\)\s*/i, '')
      .replace(/\s*\(Teste\)\s*/i, '')
      .trim();
  };

  const mockFreeData: PublicRestaurantData = useMemo(() => ({
    id: restaurant?.id || 'mock-id',
    name: restaurant?.name ? sanitizeName(restaurant.name) : 'Seu Restaurante',
    image_url: restaurant?.image_url || null,
    cover_image_url: null, // Oculto no Free
    plan: 'free',
    city: restaurant?.city || 'Sua Cidade',
    state: restaurant?.state || 'UF',
    followers_count: 12,
    is_favorite: false,
    opening_hours: restaurant?.opening_hours || mockSchedule,
    payment_methods: (restaurant?.payment_methods as string[]) || ['PIX', 'Cartão de Crédito', 'Dinheiro'],
    address: restaurant?.address || 'Rua do Restaurante, 123',
    number: restaurant?.number || '',
    neighborhood: restaurant?.neighborhood || '',
    cep: restaurant?.cep || '',
    menu_categories: [], // Sem categorias estruturadas no Free
    social_networks: [],
  }) as unknown as PublicRestaurantData, [restaurant]);

  const mockPremiumData: PublicRestaurantData = useMemo(() => ({
    ...mockFreeData,
    plan: 'premium',
    description: restaurant?.description || 'O melhor sabor da culinária regional. Pratos preparados com ingredientes frescos e selecionados por nossos chefs.',
    cover_image_url: restaurant?.cover_image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    image_url: restaurant?.image_url || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=150',
    whatsapp_url: restaurant?.whatsapp_url || 'https://wa.me/55999999999',
    ifood_url: restaurant?.ifood_url || 'https://ifood.com.br',
    other_url: restaurant?.other_url || 'https://site.com',
    other_url_label: restaurant?.other_url_label || 'Cardápio Digital',
    followers_count: 157, // Mais atrativo
    social_networks: [
      { platform: 'instagram', url: 'https://instagram.com' }
    ],
    menu_categories: [
      {
        id: 'cat-1',
        restaurant_id: restaurant?.id || 'mock-id',
        name: 'Destaques do Chef 🍽️',
        order_index: 0,
        is_active: true,
        is_popular: true,
        created_at: '',
        menu_items: [
          {
            id: 'item-1',
            category_id: 'cat-1',
            name: 'Hambúrguer Gourmet Especial',
            description: 'Blend artesanal de 150g, queijo cheddar derretido, bacon caramelizado e maionese defumada no pão brioche.',
            price: 36.90,
            image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
            order_index: 0,
            is_active: true,
            created_at: '',
          },
          {
            id: 'item-2',
            category_id: 'cat-1',
            name: 'Batata Frita Rústica Trufada',
            description: 'Batatas fritas temperadas com azeite de trufas brancas, parmesão ralado e alecrim fresco.',
            price: 24.90,
            image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500',
            order_index: 1,
            is_active: true,
            created_at: '',
          }
        ]
      }
    ] as any,
    gallery_images: [
      { id: 'gal-1', restaurant_id: 'mock-id', image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500', caption: 'Nosso Salão Acolhedor', order_index: 0 },
      { id: 'gal-2', restaurant_id: 'mock-id', image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500', caption: 'Ingredientes Frescos', order_index: 1 }
    ] as any
  }) as unknown as PublicRestaurantData, [mockFreeData, restaurant]);

  return (
    <div className="relative w-full overflow-hidden select-none pb-4">
      {/* Cybernetic grid pattern */}
      <div className="absolute inset-0 bg-[#090D1A] bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      {/* Mesh Glow Backgrounds */}
      <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-gradient-to-b from-[#EF2A39]/12 to-transparent rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-40 left-[-50px] w-[280px] h-[280px] bg-[#8B5CF6]/8 rounded-full blur-[90px] pointer-events-none" />

      {/* 1. Hero Section com Headline Ultra Persuasiva */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 pt-4 pb-8 text-center px-4"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#EF2A39]/10 to-violet-500/10 border border-[#EF2A39]/30 text-[#EF2A39] text-[10px] font-extrabold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(239,42,57,0.15)]">
          <Crown className="w-3.5 h-3.5 fill-[#EF2A39]" />
          Parceiro Oficial Premium
        </div>

        <h1 className="text-[25px] font-black leading-tight tracking-tight text-white mb-3">
          Destaque seu Restaurante e <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EF2A39] via-[#F43F5E] to-[#F59E0B] drop-shadow-[0_2px_10px_rgba(239,42,57,0.2)]">Atraia 3x Mais</span> Clientes 🚀
        </h1>
        
        <p className="text-xs font-semibold text-slate-400 max-w-sm mx-auto leading-relaxed mb-6">
          Não seja apenas mais um na lista. Mostre fotos, cardápio, contatos diretos e conquiste novos clientes antes da concorrência.
        </p>
        
        <Button 
          variant="link" 
          onClick={handleViewPremiumRestaurants}
          className="text-slate-300 hover:text-white text-xs font-bold p-0 h-auto flex items-center justify-center mx-auto transition-all"
        >
          Ver demonstração de restaurantes parceiros <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </motion.header>

      {/* 2. Conteúdo Principal */}
      <main className="relative z-20 space-y-6 px-1">
        
        {/* Simulador Interativo do Smartphone */}
        <div className="bg-white/[0.02] border border-white/10 backdrop-blur-md rounded-3xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <div className="text-center mb-5">
            <h2 className="text-[14px] font-extrabold text-white leading-tight">
              Compare como seu perfil ficará no celular do cliente
            </h2>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              Alterne abaixo para ver a diferença em tempo real
            </p>
          </div>
          
          {/* Glassmorphic Plan Toggle */}
          <div className="relative flex w-full bg-white/[0.04] border border-white/10 rounded-xl p-1 h-9 mb-5">
            <div className="relative w-full h-full flex z-10">
              <button
                onClick={() => setPreviewPlan('free')}
                className={cn(
                  "flex-1 h-full rounded-lg font-bold transition-all text-[11px] flex items-center justify-center gap-1.5",
                  previewPlan === 'free' ? "text-slate-900 font-extrabold" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Seu Plano (Free)
              </button>
              <button
                onClick={() => setPreviewPlan('premium')}
                className={cn(
                  "flex-1 h-full rounded-lg font-bold transition-all text-[11px] flex items-center justify-center gap-1.5",
                  previewPlan === 'premium' ? "text-white font-extrabold" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Crown className={cn("w-3 h-3", previewPlan === 'premium' ? "fill-white text-white" : "text-slate-400")} />
                Perfil Premium
              </button>
            </div>
            
            <motion.div
              className={cn(
                "absolute top-1 bottom-1 rounded-lg shadow-md",
                previewPlan === 'free' ? "bg-white" : "bg-gradient-to-r from-[#EF2A39] to-[#F43F5E]"
              )}
              animate={{
                left: previewPlan === 'free' ? '4px' : 'calc(50% - 2px)',
                right: previewPlan === 'free' ? 'calc(50% - 2px)' : '4px'
              }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            />
          </div>

          {/* Premium Bezel-less Phone Frame Mockup */}
          <div className="relative mx-auto w-full max-w-[360px] h-[670px] rounded-[48px] border-[6px] border-slate-800 bg-[#090D1A] shadow-[0_0_50px_rgba(239,42,57,0.25)] overflow-hidden flex flex-col transition-all duration-300">
            {/* Dynamic Island Notch */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-black rounded-full z-50 flex items-center justify-center border border-white/5 shadow-[0_1px_5px_rgba(255,255,255,0.05)]">
              <div className="w-1.5 h-1.5 bg-gradient-to-br from-indigo-500 to-[#EF2A39] rounded-full animate-pulse mr-2" />
              <span className="text-[8px] font-extrabold text-slate-400 tracking-widest uppercase">PREVIEW</span>
            </div>

            {/* Scrollable Phone Screen */}
            <div className="w-full h-full overflow-y-auto bg-white pt-9 pb-10 hide-scrollbar relative">
              {!isRestaurantIdAvailable ? (
                <div className="p-4 text-center">
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-400 rounded-2xl">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Não Carregado</AlertTitle>
                    <AlertDescription className="text-xs">
                      Vincule seu restaurante para pré-visualizar.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={previewPlan}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full text-left"
                  >
                    {previewPlan === 'free' ? (
                      <FreeProfileLayout
                        restaurant={mockFreeData}
                        toggleFavorite={() => {}}
                        isFavoriteMutating={false}
                        isCompact={true}
                      />
                    ) : (
                      <PremiumProfileLayout
                        restaurant={mockPremiumData}
                        toggleFavorite={() => {}}
                        isFavoriteMutating={false}
                        isCompact={true}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
        
        {/* Blocos de Benefícios em Grid */}
        <div className="grid grid-cols-1 gap-3">
          {premiumBenefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                key={i}
                className="flex gap-4 p-4 bg-white/[0.02] border border-white/10 rounded-2xl hover:border-white/20 transition-all group shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
              >
                <div className={cn("size-10 rounded-xl shrink-0 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(255,255,255,0.03)] transition-all group-hover:scale-110", b.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-extrabold text-white leading-snug">{b.title}</h3>
                  <p className="text-[11px] font-medium text-slate-400 leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Tabela Comparativa de Recursos */}
        <div className="bg-white/[0.02] border border-white/10 backdrop-blur-md rounded-3xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <h3 className="text-xs font-extrabold text-white text-center mb-4 uppercase tracking-wider bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent">
            Resumo dos Recursos
          </h3>
          <div className="space-y-3">
            {comparisonFeatures.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-2 border-b border-white/5 last:border-0 hover:bg-white/[0.01] px-1 rounded-lg transition-colors">
                <span className="font-semibold text-slate-300">{f.label}</span>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="flex flex-col items-center">
                    <span className="text-[7px] text-slate-500 font-bold uppercase mb-0.5">Free</span>
                    {f.free ? (
                      <Check className="w-4 h-4 text-green-500 shrink-0 filter drop-shadow-[0_0_4px_rgba(34,197,94,0.4)]" />
                    ) : (
                      <X className="w-4 h-4 text-red-500/60 shrink-0" />
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[7px] text-[#EF2A39] font-bold uppercase mb-0.5">Premium</span>
                    <Check className="w-4.5 h-4.5 text-green-400 font-bold shrink-0 filter drop-shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
 
        {/* Prova Social / Neuromarketing Estatístico */}
        <div className="p-5 bg-gradient-to-br from-[#EF2A39]/20 to-red-600/5 border border-[#EF2A39]/30 text-white rounded-3xl text-center space-y-2 relative overflow-hidden shadow-[0_0_20px_rgba(239,42,57,0.1)]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <Award className="w-8 h-8 mx-auto stroke-[1.5] text-yellow-300 animate-bounce animate-duration-1000" />
          <h3 className="text-sm font-black tracking-tight leading-snug">
            Mais de 70% dos estabelecimentos já migraram
          </h3>
          <p className="text-[10px] text-slate-300 leading-relaxed font-semibold max-w-xs mx-auto">
            Restaurantes parceiros ativos Premium relatam um aumento médio de até 3x no clique para WhatsApp e iFood na primeira semana.
          </p>
        </div>

        {/* 3. Seção de Preços com Neuro-ancoragem */}
        <div className="p-6 bg-gradient-to-b from-[#EF2A39]/10 via-white/[0.01] to-white/[0.02] border border-[#EF2A39]/30 rounded-3xl text-center space-y-4 shadow-[0_0_30px_rgba(239,42,57,0.1)]">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-[9px] font-extrabold uppercase tracking-wider mx-auto">
            Oferta de Lançamento Ativa
          </div>

          <div className="space-y-1">
            <h2 className="text-sm font-extrabold text-white">
              Torne-se Premium Hoje e Cancele Quando Quiser
            </h2>
            <p className="text-[11px] font-semibold text-slate-400 max-w-xs mx-auto leading-normal">
              Aproveite o preço de lançamento com desconto vitalício enquanto mantiver a assinatura.
            </p>
          </div>
          
          {/* Urgency progress bar */}
          <div className="space-y-1.5 max-w-[280px] mx-auto pt-2">
            <div className="flex justify-between text-[9px] font-bold text-slate-400">
              <span>Vagas promocionais na sua cidade</span>
              <span className="text-[#EF2A39] font-extrabold">84% Preenchido</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#EF2A39] to-red-500" 
                initial={{ width: 0 }}
                animate={{ width: "84%" }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
          </div>
          
          <div className="py-2">
            <p className="text-xs font-extrabold text-slate-500 line-through">
              De R$ 59,90/mês
            </p>
            <p className="text-[40px] font-black text-white leading-none mt-1">
              R$ 37,00
              <span className="text-xs font-semibold text-slate-400"> / mês</span>
            </p>
            <p className="text-[10px] text-green-400 font-extrabold mt-1">
              Economia de 38% todos os meses
            </p>
          </div>

          <motion.div
            animate={{ scale: [1, 1.015, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="w-full h-11 rounded-xl text-xs font-bold bg-gradient-to-r from-[#EF2A39] to-red-600 hover:from-[#EF2A39]/95 hover:to-red-600/95 text-white shadow-[0_4px_20px_rgba(239,42,57,0.3)] hover:shadow-none transition-all flex items-center justify-center gap-2 border-0"
            >
              {isSubscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Crown className="w-4.5 h-4.5 fill-white" />
                  Quero Vender Mais e Destakar Perfil
                </>
              )}
            </Button>
          </motion.div>
          
          <div className="flex justify-center items-center gap-4 pt-1 text-slate-400 text-[10px] font-semibold">
            <div className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-green-400" />
              Garantia de 7 Dias
            </div>
            <div className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              Pagamento 100% Seguro
            </div>
          </div>
        </div>

        {/* Garantia Incondicional de Risco Zero */}
        <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl text-center space-y-1.5">
          <p className="text-[11px] font-extrabold text-slate-200 flex items-center justify-center gap-1">
            🛡️ Risco Zero e Transparência Total
          </p>
          <p className="text-[10px] font-medium text-slate-400 leading-normal max-w-xs mx-auto">
            Sem fidelidade ou taxa de cancelamento. Cancele diretamente pelo painel de forma instantânea com apenas um clique.
          </p>
        </div>

      </main>
    </div>
  );
};

export default function UpgradePage() {
  return (
    <RestaurantAreaPageLayout title="Parceria Premium" icon={Crown} backPath="restaurant-area/profile-menu" dark={true}>
      <UpgradePageContent />
    </RestaurantAreaPageLayout>
  );
}