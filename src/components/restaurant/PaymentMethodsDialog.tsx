import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { showSuccess, showError } from '@/utils/toast';

interface PaymentMethodsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentMethods: string[];
  onSave: (methods: string[]) => Promise<void>;
  isLoading: boolean;
}

const predefinedMethods = ['PIX', 'Crédito', 'Débito', 'Dinheiro', 'Vale Refeição', 'Transferência'];

const PaymentMethodsDialog: React.FC<PaymentMethodsDialogProps> = ({ isOpen, onClose, currentMethods, onSave, isLoading }) => {
  const [selectedMethods, setSelectedMethods] = useState<string[]>(currentMethods);
  const [customMethod, setCustomMethod] = useState('');

  useEffect(() => {
    setSelectedMethods(currentMethods);
  }, [currentMethods]);

  const handleToggleMethod = useCallback((method: string) => {
    setSelectedMethods(prev => 
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  }, []);

  const handleAddCustomMethod = useCallback(() => {
    const trimmedMethod = customMethod.trim();
    if (trimmedMethod && !selectedMethods.includes(trimmedMethod)) {
      setSelectedMethods(prev => [...prev, trimmedMethod]);
      setCustomMethod('');
    }
  }, [customMethod, selectedMethods]);

  const handleSave = async () => {
    try {
      await onSave(selectedMethods);
      showSuccess("Formas de pagamento salvas com sucesso!");
      onClose(); // Fechar o diálogo após o sucesso
    } catch (error) {
      showError("Erro ao salvar formas de pagamento.");
      console.error("Save payment methods error:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" /> Gerenciar Pagamentos
          </DialogTitle>
          <DialogDescription>
            Selecione as formas de pagamento aceitas pelo seu restaurante.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          <h3 className="text-lg font-semibold text-gray-700">Métodos Comuns</h3>
          <div className="grid grid-cols-2 gap-4">
            {predefinedMethods.map(method => (
              <div key={method} className="flex items-center space-x-2">
                <Checkbox
                  id={method}
                  checked={selectedMethods.includes(method)}
                  onCheckedChange={() => handleToggleMethod(method)}
                />
                <Label htmlFor={method} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {method}
                </Label>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">Outros Métodos</h3>
          <div className="space-y-2">
            {selectedMethods
              .filter(method => !predefinedMethods.includes(method))
              .map(method => (
                <div key={method} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border">
                  <span className="text-sm">{method}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleToggleMethod(method)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remover
                  </Button>
                </div>
              ))}
          </div>

          <div className="flex space-x-2 mt-2">
            <Input
              placeholder="Adicionar novo método"
              value={customMethod}
              onChange={(e) => setCustomMethod(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomMethod();
                }
              }}
            />
            <Button onClick={handleAddCustomMethod} type="button" variant="outline" size="icon" disabled={!customMethod.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={onClose} variant="outline">
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isLoading} variant="highlight">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodsDialog;