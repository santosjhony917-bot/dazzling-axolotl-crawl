import React, { useState, useMemo } from 'react';
import { Crown, Check, Loader2, Zap, CreditCard, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatPrice } from '@/lib/utils';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { useRestaurantContext } from '@/context/RestaurantContext';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

// Mock de Planos
const PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        features: [
            'Cardápio Básico',
            'Informações de Contato',
            'Localização (Endereço)',
            '10 Itens de Menu',
        ],
        isCurrent: (currentPlan: string) => currentPlan === 'free',
    },
    {
        id: 'basic',
        name: 'Basic',
        price: 49.90,
        features: [
            'Tudo do Free',
            'Cardápio Completo',
            'Itens Ilimitados',
            'Horários Detalhados',
            'Canais de Pedido (WhatsApp, iFood, etc.)',
        ],
        isCurrent: (currentPlan: string) => currentPlan === 'basic',
    },
    {
        id: 'premium',
        name: 'Premium',
        price: 99.90,
        features: [
            'Tudo do Basic',
            'Galeria de Fotos',
            'Avaliações de Clientes',
            'Destaque na Busca',
            'Suporte Prioritário',
        ],
        isCurrent: (currentPlan: string) => currentPlan === 'premium',
    },
];

// Componente de Card de Plano
interface PlanCardProps {
    plan: typeof PLANS[0];
    currentPlan: string;
    onSelect: (planId: string) => void;
    isPending: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, currentPlan, onSelect, isPending }) => {
    const isCurrent = plan.isCurrent(currentPlan);
    const isHigher = PLANS.findIndex(p => p.id === plan.id) > PLANS.findIndex(p => p.id === currentPlan);
    const isLower = PLANS.findIndex(p => p.id === plan.id) < PLANS.findIndex(p => p.id === currentPlan);

    return (
        <Card className={cn(
            "flex flex-col p-6 transition-all duration-300 shadow-soft-md dark:bg-gray-800",
            isCurrent ? "border-4 border-primary ring-4 ring-primary/20" : "border border-gray-200 dark:border-gray-700",
            isHigher && "bg-primary-50 dark:bg-gray-700/50"
        )}>
            <CardHeader className="p-0 mb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className={cn(
                        "text-2xl font-bold",
                        isCurrent ? "text-primary dark:text-highlight" : "text-gray-900 dark:text-white"
                    )}>
                        {plan.name}
                    </CardTitle>
                    {isCurrent && (
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary text-white">
                            Plano Atual
                        </span>
                    )}
                </div>
                <p className="text-4xl font-extrabold mt-2">
                    {plan.price === 0 ? 'Grátis' : formatPrice(plan.price)}
                    {plan.price > 0 && <span className="text-base font-medium text-gray-500"> / mês</span>}
                </p>
            </CardHeader>
            
            <CardContent className="flex-grow p-0 mt-4">
                <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                            <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>

            <div className="mt-6">
                {isCurrent ? (
                    <Button disabled className="w-full" variant="secondary">
                        Plano Ativo
                    </Button>
                ) : isHigher ? (
                    <Button 
                        className="w-full bg-primary hover:bg-primary/90 text-white"
                        onClick={() => onSelect(plan.id)}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fazer Upgrade'}
                    </Button>
                ) : (
                    <Button 
                        className="w-full"
                        variant="outline"
                        onClick={() => onSelect(plan.id)}
                        disabled={isPending || isLower}
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fazer Downgrade'}
                    </Button>
                )}
            </div>
        </Card>
    );
};

// Componente de Conteúdo da Página de Upgrade
const UpgradePageContent: React.FC = () => {
    const { restaurant, isLoading, refetch } = useRestaurantContext();
    const [isPending, setIsPending] = useState(false);

    if (isLoading || !restaurant) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const currentPlan = restaurant.plan;

    const handlePlanSelection = async (newPlanId: string) => {
        if (newPlanId === currentPlan) return;

        if (newPlanId === 'free' && !window.confirm('Tem certeza que deseja fazer downgrade para o plano FREE? Você perderá acesso a recursos Premium.')) {
            return;
        }

        setIsPending(true);
        try {
            // Simulação de chamada de API para atualizar o plano
            const { error } = await supabase
                .from('restaurants')
                .update({ plan: newPlanId as 'free' | 'basic' | 'premium' })
                .eq('id', restaurant.id);

            if (error) throw error;

            showSuccess(`Plano alterado para ${newPlanId.toUpperCase()} com sucesso!`);
            await refetch(); // Refetch context data
        } catch (error) {
            showError('Falha ao atualizar o plano.');
            console.error(error);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Planos</h1>
            <p className="text-gray-600 dark:text-gray-400">
                Seu plano atual é <span className="font-bold text-primary">{currentPlan.toUpperCase()}</span>. Escolha o plano que melhor se adapta ao seu negócio.
            </p>

            <div className="grid gap-6 lg:grid-cols-3">
                {PLANS.map((plan) => (
                    <PlanCard 
                        key={plan.id} 
                        plan={plan} 
                        currentPlan={currentPlan} 
                        onSelect={handlePlanSelection}
                        isPending={isPending}
                    />
                ))}
            </div>

            <Card className="p-6 shadow-soft-md dark:bg-gray-800">
                <h2 className="text-xl font-bold text-primary mb-3">Métodos de Pagamento</h2>
                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Zap className="w-5 h-5 text-highlight" /> PIX
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <CreditCard className="w-5 h-5 text-highlight" /> Cartão de Crédito
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <DollarSign className="w-5 h-5 text-highlight" /> Boleto
                    </div>
                </div>
            </Card>
        </div>
    );
};

const UpgradePage: React.FC = () => {
    const { restaurant, isLoading } = useRestaurantContext();

    if (isLoading || !restaurant) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <RestaurantAreaPageLayout title="Upgrade Premium" backPath={`/restaurant-area/${restaurant.id}/dashboard`} restaurant={restaurant}>
            <UpgradePageContent />
        </RestaurantAreaPageLayout>
    );
};

export default UpgradePage;