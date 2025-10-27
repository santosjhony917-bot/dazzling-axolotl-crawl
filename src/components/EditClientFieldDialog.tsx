"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Define os campos que podem ser editados
type EditableField = 'first_name' | 'phone';

interface EditClientFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
  field: EditableField | null;
  initialValue: string;
}

const schema = z.object({
  value: z.string().min(1, { message: 'Este campo não pode ser vazio.' }),
});

type FormData = z.infer<typeof schema>;

const fieldLabels: Record<EditableField, { title: string, description: string, placeholder: string }> = {
  first_name: {
    title: 'Editar Nome',
    description: 'Insira seu primeiro nome para exibição.',
    placeholder: 'Seu nome',
  },
  phone: {
    title: 'Editar Telefone',
    description: 'Insira seu número de telefone com DDD.',
    placeholder: '(99) 99999-9999',
  },
};

const EditClientFieldDialog: React.FC<EditClientFieldDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  field,
  initialValue,
}) => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      value: initialValue,
    },
  });

  useEffect(() => {
    if (isOpen) {
      setValue('value', initialValue);
      reset({ value: initialValue });
    }
  }, [isOpen, initialValue, setValue, reset]);

  const onSubmit = async (data: FormData) => {
    if (!field) return;
    setLoading(true);
    try {
      await onSave(data.value);
      onClose();
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!field) return null;

  const { title, description, placeholder } = fieldLabels[field];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="value" className="text-right col-span-1">
              Valor
            </Label>
            <Input
              id="value"
              placeholder={placeholder}
              className="col-span-3"
              {...register('value')}
              disabled={loading}
            />
          </div>
          {errors.value && <p className="text-sm text-red-500 text-right col-span-4">{errors.value.message}</p>}
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit" 
              disabled={loading || !!errors.value}
              variant="highlight"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientFieldDialog;