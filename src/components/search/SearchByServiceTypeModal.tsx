import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Truck, Store } from 'lucide-react';

interface SearchByServiceTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyFilter: (serviceTypes: { delivery: boolean; presencial: boolean }) => void;
    currentFilters: { delivery: boolean; presencial: boolean };
}

const SearchByServiceTypeModal: React.FC<SearchByServiceTypeModalProps> = ({ isOpen, onClose, onApplyFilter, currentFilters }) => {
    const [serviceTypes, setServiceTypes] = useState(currentFilters);

    useEffect(() => {
        if (isOpen) {
            setServiceTypes(currentFilters);
        }
    }, [isOpen, currentFilters]);

    const handleApply = () => {
        onApplyFilter(serviceTypes);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl shadow-soft-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-primary font-bold">
                        Tipo de Serviço
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="delivery"
                                checked={serviceTypes.delivery}
                                onCheckedChange={(checked) =>
                                    setServiceTypes(prev => ({ ...prev, delivery: checked as boolean }))
                                }
                            />
                            <Label htmlFor="delivery" className="flex items-center gap-2 cursor-pointer">
                                <Truck className="w-4 h-4" /> Delivery
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="presencial"
                                checked={serviceTypes.presencial}
                                onCheckedChange={(checked) =>
                                    setServiceTypes(prev => ({ ...prev, presencial: checked as boolean }))
                                }
                            />
                            <Label htmlFor="presencial" className="flex items-center gap-2 cursor-pointer">
                                <Store className="w-4 h-4" /> Presencial
                            </Label>
                        </div>
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

export default SearchByServiceTypeModal;
