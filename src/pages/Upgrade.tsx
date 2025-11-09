"use client";

import React, { useState } from 'react';
import { Crown, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { toast } from 'sonner';

interface PlanFeature {
    text: string;
    included: boolean;
}

interface Plan {
    id: string;
    name: string;
    price: number;
    description: string;
    features: PlanFeature[];
    isCurrent?: boolean;
}

const UpgradePageContent: React.FC = () => {
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const plans: Plan[] = [
        {
            id: 'free',
            name: 'Grátis',
            price: 0,
            description: 'Ideal para começar e experimentar.',
            features: [
                { text: 'Cardápio online básico', included: true },
                { text: 'Informações de contato', included: true },
                { text: 'Até 10 itens no cardápio', included: true },
                { text: 'Galeria de fotos limitada (3 fotos)', included: true },
                { text: 'Suporte por e-mail', included: true },
                { text: 'Métricas de acesso', included: false },
                { text: 'Integração com redes sociais', included: false },
                { text: 'Personalização avançada', included: false },
                { text: 'Prioridade em buscas', included: false },
                { text: 'Suporte prioritário', included: false },
            ],
            isCurrent: true, // Assuming 'Grátis' is the current plan for demonstration
        },
        {
            id: 'basic',
            name: 'Básico',
            price: 49.90,
            description: 'Para restaurantes que querem mais visibilidade.',
            features: [
                { text: 'Cardápio online completo', included: true },
                { text: 'Informações de contato', included: true },
                { text: 'Itens ilimitados no cardápio', included: true },
                { text: 'Galeria de fotos ilimitada', included: true },
                { text: 'Suporte por e-mail e chat', included: true },
                { text: 'Métricas de acesso', included: true },
                { text: 'Integração com redes sociais', included: true },
                { text: 'Personalização avançada', included: false },
                { text: 'Prioridade em buscas', included: false },
                { text: 'Suporte prioritário', included: false },
            ],
        },
        {
            id: 'premium',
            name: 'Premium',
            price: 99.90,
            description: 'O pacote completo para o seu negócio decolar.',
            features: [
                { text: 'Cardápio online completo', included: true },
                { text: 'Informações de contato', included: true },
                { text: 'Itens ilimitados no cardápio', included: true },
                { text: 'Galeria de fotos ilimitada', included: true },
                { text: 'Suporte por e-mail e chat', included: true },
                { text: 'Métricas de acesso', included: true },
                { text: 'Integração com redes sociais', included: true },
                { text: 'Personalização avançada', included: true },
                { text: 'Prioridade em buscas', included: true },
                { text: 'Suporte prioritário', included: true },
            ],
        },
    ];

    const handleUpgrade = () => {
        if (!selectedPlan) {
            toast.error('Por favor, selecione um plano para fazer o upgrade.');
            return;
        }
        setIsProcessing(true);
        // Simulate API call
        setTimeout(() => {
            toast.success(`Upgrade para o plano ${selectedPlan} realizado com sucesso!`);
            setIsProcessing(false);
            // In a real application, you would update the user's plan in the database
        }, 2000);
    };

    return (
        <div className="p-4 space-y-8">
            <h2 className="text-3xl font-bold text-center">Escolha o Plano Ideal para o Seu Restaurante</h2>
            <p className="text-center text-gray-600 max-w-2xl mx-auto">
                Aumente a visibilidade do seu negócio, gerencie seu cardápio com facilidade e atraia mais clientes com nossos planos premium.
            </p>

            <RadioGroup value={selectedPlan || ''} onValueChange={setSelectedPlan} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <Card key={plan.id} className={`flex flex-col ${plan.isCurrent ? 'border-2 border-primary' : ''}`}>
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                            <p className="text-4xl font-bold mt-4">
                                {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
                                {plan.price > 0 && <span className="text-base text-gray-500">/mês</span>}
                            </p>
                            {plan.isCurrent && (
                                <span className="inline-block bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full mt-2">
                                    Plano Atual
                                </span>
                            )}
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-between">
                            <ul className="space-y-2 mb-6">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className={`flex items-center ${feature.included ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                                        {feature.included ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <X className="h-4 w-4 mr-2 text-red-500" />}
                                        {feature.text}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-auto">
                                <div className="flex items-center justify-center space-x-2">
                                    <RadioGroupItem value={plan.id} id={`plan-${plan.id}`} disabled={plan.isCurrent} />
                                    <Label htmlFor={`plan-${plan.id}`} className="text-base">
                                        {plan.isCurrent ? 'Seu Plano Atual' : 'Selecionar Plano'}
                                    </Label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </RadioGroup>

            <div className="text-center mt-8">
                <Button onClick={handleUpgrade} disabled={!selectedPlan || isProcessing || plans.find(p => p.id === selectedPlan)?.isCurrent}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Fazer Upgrade Agora
                </Button>
            </div>
        </div>
    );
};

const UpgradePage: React.FC = () => {
    return (
        <RestaurantAreaPageLayout title="Upgrade Premium" icon={Crown}>
            <UpgradePageContent />
        </RestaurantAreaPageLayout>
    );
};

export default UpgradePage;