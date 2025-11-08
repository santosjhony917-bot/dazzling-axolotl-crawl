import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowRight, Crown, Zap, Lock, Star, Shield, Smartphone, CreditCard, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion } from 'framer-motion';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import PlanPreviewToggle from '@/components/upgrade/PlanPreviewToggle';
import { useAuthData } from '@/context/AuthContext';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import { mockFreeRestaurant } from '@/data/mockRestaurants';
import { PublicRestaurantData } from '@/types/restaurant';

const premiumProfilePreviewUrl = 'https://ystffcohclbtykangfnt.supabase.co/storage/v1/object/public/public-assets/premium-profile-preview.jpeg';

// --- Mock Data ---
const freeFeatures = [
  { text: 'Visual limitado', icon: X, color: 'text-red-500' },
  { text: 'Sem destaque na busca', icon: X, color: 'text-red-500' },
  { text: 'Sem galeria de fotos', icon: X, color: 'text-red-500' },
  { text: 'Sem estatísticas', icon: X, color: 'text-red-500' },
];

const premiumFeatures = [
  { text: 'Design atrativo e profissional', icon: Check, color: 'text-green-500' },
  { text: 'Destaque nos resultados', icon: Star, color: 'text-amber-500' },
  { text: 'Fotos, cardápio completo e links', icon: Check, color: 'text-green-500' },
  { text: 'Envio de promoções e cupons', icon: Zap, color: 'text-amber-500' },
  { text: 'Painel com estatísticas de visualizações', icon: Shield, color: 'text-green-500' },
];

// --- Componentes Auxiliares ---

const PremiumCard: React.FC = () => (
  <motion.div
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
    whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(228, 121, 72, 0.3), 0 10px 10px -5px rgba(228, 121, 72, 0.1)' }}
    className="relative flex flex-col h-full p-6 bg-white rounded-xl shadow-2xl border-2 border-highlight"
  >
    <div className="absolute top-0 right-0 bg-highlight text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center">
      MAIS ESCOLHIDO
    </div>
    <div className="flex items-center justify-center size-12 rounded-full bg-highlight/10 mb-4">
      <Crown className="w-6 h-6 text-highlight fill-highlight/50" />
    </div>
    <h3 className="text-xl font-bold text-highlight mb-4">Premium</h3>
    <ul className="space-y-3 flex-1">
      {premiumFeatures.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <li key={index} className="flex items-start gap-3 text-sm text-gray-800">
            <Icon className={cn("w-4 h-4 mt-1 shrink-0", feature.color)} />
            <span className="font-medium">{feature.text}</span>
          </li>
        );
      })}
    </ul>
  </motion.div>
);

const FreeCard: React.FC = () => (
  <Card className="flex flex-col h-full p-6 bg-gray-50 border-2 border-gray-200 shadow-soft-md rounded-xl">
    <div className="flex items-center justify-center size-12 rounded-full bg-gray-200 mb-4">
      <Lock className="w-6 h-6 text-gray-500" />
    </div>
    <h3 className="text-xl font-bold text-primary mb-4">Free (Atual)</h3>
    <ul className="space-y-3 flex-1">
      {freeFeatures.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <li key={index} className="flex items-start gap-3 text-sm text-gray-600">
            <Icon className={cn("w-4 h-4 mt-1 shrink-0", feature.color)} />
            <span className="font-medium">{feature.text}</span>
          </li>
        );
      })}
    </ul>
  </Card>
);

const UpgradePageContent: React.FC = () => {
  const navigate = useNavigate();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<'free' | 'premium'>('free');
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

  return (
    <div className="min-h-screen bg-white dark:bg-background-dark">
      
      <motion.header
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative bg-[#022D68] text-white pt-16 pb-24 overflow-hidden rounded-b-3xl shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#022D68] to-[#022D68]/80 opacity-90"></div>
        
        <div className="relative z-10 max-w-md mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-3xl font-extrabold leading-tight mb-3"
          >
            Transforme seu perfil em um ímã de clientes 🍽️
          </motion.h1>
          <p className="text-base font-medium text-gray-200 mb-6">
            Mais de 70% dos restaurantes da cidade já são Premium. O próximo destaque pode ser o seu.
          </p>
          
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.8, duration: 0.8, type: 'spring' }}
              className="relative w-40 h-40 bg-white/10 rounded-xl shadow-2xl border border-white/20 flex items-center justify-center"
            >
              <Smartphone className="w-16 h-16 text-white/80" />
              <div className="absolute inset-0 bg-white/5 opacity-5 blur-sm" />
              <div className="absolute top-0 left-0 w-full h-full bg-white opacity-10 blur-sm" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
            </motion.div>
          </div>
          
          <Button 
            variant="link" 
            onClick={handleViewPremiumRestaurants}
            className="text-white/80 hover:text-white text-sm font-semibold p-0 h-auto flex items-center mx-auto"
          >
            Ver restaurantes Premium <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </motion.header>

      <main className="relative -mt-16 px-4 max-w-md mx-auto z-20">
        
        <Card className="p-6 shadow-soft-xl border-none rounded-2xl bg-white">
          <h2 className="text-lg font-bold text-primary text-center mb-6">
            Veja como seu restaurante aparece hoje (Free) e como pode brilhar (Premium)
          </h2>
          
          <PlanPreviewToggle 
            currentPlan={restaurant?.plan || 'free'}
            previewPlan={previewPlan} 
            setPreviewPlan={setPreviewPlan} 
          />

          <div className="relative overflow-x-hidden">
            <motion.div
              key={previewPlan}
              initial={{ opacity: 0, x: previewPlan === 'free' ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: previewPlan === 'free' ? 50 : -50 }}
              transition={{ duration: 0.3 }}
            >
              {!isRestaurantIdAvailable ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Restaurante Não Encontrado</AlertTitle>
                  <AlertDescription>
                    Não foi possível carregar a prévia. Certifique-se de que seu restaurante está cadastrado e associado à sua conta.
                  </AlertDescription>
                </Alert>
              ) : (
                previewPlan === 'free' ? (
                  <FreeProfileLayout
                    restaurant={mockFreeRestaurant as PublicRestaurantData}
                    toggleFavorite={() => { /* no-op for mock */ }}
                    isFavoriteMutating={false}
                    isCompact={true}
                  />
                ) : (
                  <img 
                    src={premiumProfilePreviewUrl} 
                    alt="Prévia do Perfil Premium" 
                    className="w-full h-auto rounded-lg shadow-md border" 
                  />
                )
              )}
            </motion.div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <FreeCard />
            <PremiumCard />
          </div>
        </Card>
        
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="mt-12 bg-[#022D68] text-white p-8 rounded-xl shadow-xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent animate-pulse-slow" />
          
          <h2 className="relative z-10 text-center text-2xl font-extrabold leading-snug">
            Os clientes confiam em quem aparece primeiro.
            <br />
            <span className="text-highlight">Deixe seu restaurante impossível de ignorar.</span>
          </h2>
        </motion.div>

        <Card className="mt-12 p-6 shadow-soft-xl border-none rounded-2xl bg-white">
          <h2 className="text-xl font-bold text-primary text-center mb-4">
            Assine o Premium e seja encontrado todos os dias.
          </h2>
          
          <div className="text-center my-6">
            <p className="text-5xl font-extrabold text-highlight">
              R$ 37
              <span className="text-xl font-normal text-gray-500"> / mês</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Sem fidelidade. Cancele quando quiser.
            </p>
          </div>

          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              variant="highlight"
              className="w-full h-14 rounded-xl text-lg font-bold shadow-highlight-glow transition-all hover:shadow-soft-xl"
            >
              {isSubscribing ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Crown className="w-5 h-5 mr-2 fill-white" />
                  Ativar Premium Agora
                </>
              )}
            </Button>
          </motion.div>
          
          <div className="flex justify-center items-center gap-4 mt-4 text-gray-500 text-xs">
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Pagamento Seguro
            </div>
            <div className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              Via App Store/Play Store
            </div>
          </div>
        </Card>
      </main>
      
      <footer className="mt-12 bg-[#022D68] text-white p-8 rounded-t-3xl">
        <div className="max-w-md mx-auto text-center">
          <p className="text-lg font-bold mb-2">
            Filter Food é o mapa gastronômico oficial da cidade.
          </p>
          <p className="text-sm text-gray-300">
            Restaurantes Premium são vistos, lembrados e escolhidos primeiro.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default function UpgradePage() {
    return (
        <RestaurantAreaPageLayout title="Upgrade Premium" icon={Crown} backPath="restaurant-area/profile-menu">
            <UpgradePageContent />
        </RestaurantAreaPageLayout>
    );
}