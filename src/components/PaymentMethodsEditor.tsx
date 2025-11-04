import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PaymentMethod } from '@/types';

interface PaymentMethodsEditorProps {
  selectedMethods: PaymentMethod[];
  onChange: (methods: PaymentMethod[]) => void;
}

const allMethods: { id: PaymentMethod; label: string }[] = [
    { id: 'credit_card', label: 'Cartão de Crédito' },
    { id: 'debit_card', label: 'Cartão de Débito' },
    { id: 'cash', label: 'Dinheiro' },
    { id: 'pix', label: 'Pix' },
];

export const PaymentMethodsEditor: React.FC<PaymentMethodsEditorProps> = ({ selectedMethods, onChange }) => {
  const handleToggle = (methodId: PaymentMethod) => {
    const newMethods = selectedMethods.includes(methodId)
      ? selectedMethods.filter(m => m !== methodId)
      : [...selectedMethods, methodId];
    onChange(newMethods);
  };

  return (
    <div className="space-y-3">
      {allMethods.map(method => (
        <div key={method.id} className="flex items-center space-x-2">
          <Checkbox
            id={method.id}
            checked={selectedMethods.includes(method.id)}
            onCheckedChange={() => handleToggle(method.id)}
          />
          <Label htmlFor={method.id} className="font-normal">{method.label}</Label>
        </div>
      ))}
    </div>
  );
};