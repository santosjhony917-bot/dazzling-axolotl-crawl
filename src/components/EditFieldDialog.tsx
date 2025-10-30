import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller } from 'react-hook-form';
import { Loader2 } from 'lucide-react';

interface EditFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  fieldName: string;
  initialValue: string | number | undefined;
  inputType?: 'text' | 'textarea' | 'number' | 'url';
  onSave: (fieldName: string, value: string | number) => Promise<void>;
  loading: boolean;
}

const EditFieldDialog: React.FC<EditFieldDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  fieldName,
  initialValue,
  inputType = 'text',
  onSave,
  loading,
}) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      value: initialValue || '',
    },
  });

  useEffect(() => {
    reset({ value: initialValue || '' });
  }, [initialValue, isOpen, reset]);

  const onSubmit = async (data: { value: string | number }) => {
    await onSave(fieldName, data.value);
    // O fechamento do diálogo deve ser tratado pelo componente pai após o sucesso do onSave
    // Mas para garantir que o formulário seja resetado, fazemos isso aqui.
  };

  const renderInput = (field: any) => {
    switch (inputType) {
      case 'textarea':
        return (
          <Textarea
            {...field}
            id="value"
            placeholder={`Insira o ${title.toLowerCase()}`}
            className="min-h-[100px]"
          />
        );
      case 'number':
        return (
          <Input
            {...field}
            id="value"
            type="number"
            placeholder={`Insira o ${title.toLowerCase()}`}
            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
          />
        );
      case 'url':
        return (
          <Input
            {...field}
            id="value"
            type="url"
            placeholder="Ex: https://wa.me/5511999999999"
          />
        );
      case 'text':
      default:
        return (
          <Input
            {...field}
            id="value"
            type="text"
            placeholder={`Insira o ${title.toLowerCase()}`}
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="value">{title}</Label>
              <Controller
                name="value"
                control={control}
                rules={{ 
                  required: false, // Links são opcionais
                  validate: (value) => {
                    if (inputType === 'url' && value && !value.startsWith('http')) {
                      return 'O link deve começar com http:// ou https://';
                    }
                    return true;
                  }
                }}
                render={({ field }) => renderInput(field)}
              />
              {errors.value && <p className="text-sm text-red-500">{errors.value.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !!errors.value}
              variant="highlight"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditFieldDialog;