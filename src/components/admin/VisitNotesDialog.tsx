import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Restaurant } from '@/types/supabase';
import { Loader2 } from 'lucide-react';

interface VisitNotesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  restaurant: Restaurant;
  onSave: (newNotes: string) => void;
  isSaving: boolean;
}

const VisitNotesDialog: React.FC<VisitNotesDialogProps> = ({
  isOpen,
  onOpenChange,
  restaurant,
  onSave,
  isSaving,
}) => {
  const [notes, setNotes] = useState(restaurant.visit_notes || '');

  useEffect(() => {
    if (isOpen) {
      setNotes(restaurant.visit_notes || '');
    }
  }, [isOpen, restaurant.visit_notes]);

  const handleSave = () => {
    onSave(notes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anotações de Visita para: {restaurant.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicione suas anotações sobre o contato com este restaurante..."
            rows={6}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VisitNotesDialog;