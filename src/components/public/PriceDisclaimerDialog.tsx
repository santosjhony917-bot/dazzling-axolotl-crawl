import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface PriceDisclaimerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  platformName: string;
}

const PriceDisclaimerDialog: React.FC<PriceDisclaimerDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  platformName,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="rounded-2xl max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-amber-100">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-primary">
              Aviso Importante
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base text-gray-600 space-y-3 pt-2">
            <p>
              Você será redirecionado para <span className="font-semibold text-primary">{platformName}</span>.
            </p>
            <p className="font-medium">
              ⚠️ Os preços e disponibilidade dos pratos podem ser diferentes na plataforma de pedido.
            </p>
            <p className="text-sm">
              Recomendamos verificar os valores atualizados antes de finalizar seu pedido.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 sm:gap-2">
          <AlertDialogCancel className="rounded-xl">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-xl bg-highlight hover:bg-highlight/90 text-white"
          >
            Continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PriceDisclaimerDialog;
