import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CreditCard, Plus, X } from 'lucide-react';
import { showError } from '@/utils/toast';

interface PaymentMethodsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentMethods: string[];
  onSave: (newMethods: string[]) => Promise<void>;
  isLoading: boolean;
}

const PaymentMethodsDialog: React.FC<PaymentMethodsDialogProps> = ({ isOpen, onClose, currentMethods, onSave, isLoading }) => {
  const [methods, setMethods] = useState<string[]>(currentMethods);
  const [newMethod, setNewMethod] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMethods(currentMethods);
    }
  }, [isOpen, currentMethods]);

  const handleAddMethod = () => {
    const trimmedMethod = newMethod.trim();
    if (trimmedMethod && !methods.includes(trimmedMethod)) {
      setMethods([...methods, trimmedMethod]);
      setNewMethod('');
    } else if (methods.includes(trimmedMethod)) {
      showError("Esta forma de pagamento já foi adicionada.");
    }
  };

  const handleRemoveMethod = (methodToRemove: string) => {
    setMethods(methods.filter(m => m !== methodToRemove));
  };

  const handleSave = async () => {
    if (methods.length === 0) {
      showError("Adicione pelo menos uma forma de pagamento.");
      return;
    }
    await onSave(methods);
    // onClose é chamado no ProfileSettingsPage após o sucesso da mutação
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl max-h-[90vh] flex flex-col shadow-soft-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
            <CreditCard className="h-6 w-6" /> Gerenciar Pagamentos
          </DialogTitle>
          <DialogDescription>
            Adicione as formas de pagamento aceitas pelo seu restaurante.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 overflow-y-auto">
          {/* Lista de Métodos Atuais */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Formas Ativas ({methods.length})</p>
            <div className="flex flex-wrap gap-2">
              {methods.map((method, index) => (
                <div key={index} className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-700 border border-gray-200">
                  {method}
                  <button 
                    type="button" 
                    onClick={() => handleRemoveMethod(method)}
                    className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                    disabled={isLoading}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Adicionar Novo Método */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700">Adicionar Novo</p>
            <div className="flex gap-2">
              <Input
                type="text"
                value={newMethod}
                onChange={(e) => setNewMethod(e.target.value)}
                placeholder="Ex: Vale Refeição"
                className="h-10 rounded-xl text-sm focus:border-highlight focus:ring-highlight"
                disabled={isLoading}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMethod(); } }}
              />
              <Button type="button" size="icon" onClick={handleAddMethod} disabled={isLoading || !newMethod.trim()} className="bg-primary hover:bg-primary/90 rounded-xl">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isLoading} variant="highlight">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Salvar Formas de Pagamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodsDialog;