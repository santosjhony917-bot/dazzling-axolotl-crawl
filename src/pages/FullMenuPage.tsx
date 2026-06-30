import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Utensils, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicRestaurant } from '@/hooks/usePublicRestaurant';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import RestaurantMenu from '@/components/public/RestaurantMenu';
import { useQuotaCheck } from '@/hooks/useQuotaCheck';
import FreemiumPaywallModal from '@/components/public/FreemiumPaywallModal';
import PhoneShell from '@/components/layout/PhoneShell';

export default function FullMenuPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();

  const { showPaywall, quotaChecked, unlockQuota } = useQuotaCheck(restaurantId);
  const { restaurant, isLoading, error } = usePublicRestaurant(restaurantId);

  const handleBack = () => navigate(-1);

  if (isLoading) {
    return (
      <PhoneShell>
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
          <Loader2 className="h-7 w-7 animate-spin text-highlight" />
        </div>
      </PhoneShell>
    );
  }

  if (error || !restaurant) {
    return (
      <PhoneShell>
        <div className="min-h-screen bg-[#FAFAFA] text-center">
          <Header title="Cardápio" leftAction={{ icon: ArrowLeft, onClick: handleBack }} />
          <div className="flex min-h-[70vh] flex-col items-center justify-center px-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-red-500 shadow-soft">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#3C2F2F]">Cardápio não encontrado</h1>
            <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-text-secondary">
              {error instanceof Error ? error.message : 'O restaurante ou cardápio solicitado não existe.'}
            </p>
            <Button onClick={handleBack} className="mt-6 h-11 px-6 shadow-none">
              Voltar
            </Button>
          </div>
        </div>
      </PhoneShell>
    );
  }

  if (quotaChecked && showPaywall) {
    return (
      <PhoneShell>
        <div className="relative flex min-h-screen w-full flex-col items-center justify-start bg-[#FAFAFA]">
          <Header title="Cardápio" leftAction={{ icon: ArrowLeft, onClick: handleBack }} />
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="space-y-4 rounded-[24px] border border-slate-100 bg-white/90 p-8 shadow-soft backdrop-blur-md">
              <h2 className="text-xl font-semibold text-[#3C2F2F]">Visualização limitada</h2>
              <p className="text-sm leading-relaxed text-text-secondary">
                Você atingiu o limite de 5 cardápios diários da sua conta gratuita.
              </p>
            </div>
          </div>
          <FreemiumPaywallModal
            isOpen={showPaywall}
            onClose={() => navigate('/home')}
            onUnlock={unlockQuota}
          />
        </div>
      </PhoneShell>
    );
  }

  const hasMenu = restaurant.menu_categories && restaurant.menu_categories.length > 0;

  return (
    <PhoneShell>
      <div className="min-h-screen bg-[#FAFAFA]">
        <Header
          title={restaurant.name.replace(/^Cardápio:\s*/i, '')}
          subtitle="Cardápio completo"
          leftAction={{ icon: ArrowLeft, onClick: handleBack }}
        />

        <main className="px-4 pb-28 pt-4">
          {hasMenu ? (
            <RestaurantMenu
              menuCategories={restaurant.menu_categories}
              menuSections={restaurant.menu_sections}
              isFullMenuPage={true}
            />
          ) : (
            <Card className="rounded-[24px] border border-slate-100 bg-white p-8 text-center shadow-soft">
              <Utensils className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-text-secondary">Nenhum item ativo no cardápio.</p>
            </Card>
          )}
        </main>
      </div>
    </PhoneShell>
  );
}
