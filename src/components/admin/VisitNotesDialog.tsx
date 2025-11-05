import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface VisitNotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  initialNotes: string | null;
  onSave: (notes: string) => void;
  isSaving: boolean;
}

const VisitNotesDialog: React.FC<VisitNotesDialogProps> = ({
  isOpen,
  onClose,
  restaurantName,
  initialNotes,
  onSave,
  isSaving,
}) => {
  const [notes, setNotes] = useState(initialNotes || '');

  useEffect(() => {
    if (isOpen) {
      setNotes(initialNotes || '');
    }
  }, [isOpen, initialNotes]);

  const handleSave = () => {
    onSave(notes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Anotações para {restaurantName}</DialogTitle>
          <DialogDescription>
            Adicione ou edite as anotações sobre a visita a este restaurante.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Digite suas anotações aqui..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VisitNotesDialog;