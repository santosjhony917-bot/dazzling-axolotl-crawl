"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const availableMethods = [
  { id: 'credit_card', label: 'Cartão de Crédito' },
  { id: 'debit_card', label: 'Cartão de Débito' },
  { id: 'pix', label: 'Pix' },
  { id: 'cash', label: 'Dinheiro' },
  { id: 'vr', label: 'Vale Refeição' },
  { id: 'va', label: 'Vale Alimentação' },
]

export function RestaurantPaymentMethods({ paymentMethods = {}, onPaymentMethodsChange }) {
  const handleCheckedChange = (methodId, checked) => {
    onPaymentMethodsChange({
      ...paymentMethods,
      [methodId]: checked,
    })
  }

  return (
    <div className="space-y-4">
      <Label>Formas de Pagamento Aceitas</Label>
      <div className="grid grid-cols-2 gap-4">
        {availableMethods.map((method) => (
          <div key={method.id} className="flex items-center space-x-2">
            <Checkbox
              id={method.id}
              checked={!!paymentMethods[method.id]}
              onCheckedChange={(checked) => handleCheckedChange(method.id, !!checked)}
            />
            <Label htmlFor={method.id} className="font-normal">
              {method.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}