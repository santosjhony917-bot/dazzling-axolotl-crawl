import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard } from 'lucide-react';

interface SearchByPaymentMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyFilter: (paymentMethods: {
        pix: boolean;
        dinheiro: boolean;
        credito: boolean;
        debito: boolean;
        aleloRefeicao: boolean;
        sodexo: boolean;
    }) => void;
    currentFilters: {
        pix: boolean;
        dinheiro: boolean;
        credito: boolean;
        debito: boolean;
        aleloRefeicao: boolean;
        sodexo: boolean;
    };
}

const SearchByPaymentMethodModal: React.FC<SearchByPaymentMethodModalProps> = ({ isOpen, onClose, onApplyFilter, currentFilters }) => {
    const [paymentMethods, setPaymentMethods] = useState(currentFilters);

    useEffect(() => {
        if (isOpen) {
            setPaymentMethods(currentFilters);
        }
    }, [isOpen, currentFilters]);

    const handleApply = () => {
        onApplyFilter(paymentMethods);
        onClose();
    };

    const methods = [
        { id: 'pix', label: 'PIX' },
        { id: 'dinheiro', label: 'Dinheiro' },
        { id: 'credito', label: 'Crédito' },
        { id: 'debito', label: 'Débito' },
        { id: 'aleloRefeicao', label: 'Alelo Refeição' },
        { id: 'sodexo', label: 'Sodexo' },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl shadow-soft-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-primary font-bold">
                        <CreditCard className="w-5 h-5 text-highlight" />
                        Formas de Pagamento
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        {methods.map((method) => (
                            <div key={method.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={method.id}
                                    checked={paymentMethods[method.id as keyof typeof paymentMethods]}
                                    onCheckedChange={(checked) =>
                                        setPaymentMethods(prev => ({ ...prev, [method.id]: checked as boolean }))
                                    }
                                />
                                <Label htmlFor={method.id} className="cursor-pointer">
                                    {method.label}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
                    <Button onClick={handleApply} variant="highlight" className="rounded-xl">Aplicar Filtro</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SearchByPaymentMethodModal;
