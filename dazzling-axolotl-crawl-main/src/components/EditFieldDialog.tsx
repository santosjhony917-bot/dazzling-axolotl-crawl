import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface EditFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  fieldName: string;
  initialValue: string | number | undefined;
  inputType: 'text' | 'textarea' | 'number' | 'url';
  onSave: (fieldName: string, value: string | number) => void;
  loading: boolean;
}

type FormValues = {
    value: string;
};

const EditFieldDialog: React.FC<EditFieldDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  fieldName,
  initialValue,
  inputType,
  onSave,
  loading,
}) => {
  
  // Dynamic Schema Definition
  const validationSchema = useMemo(() => {
    if (inputType === 'url') {
      return z.object({
        value: z.string()
          .min(1, { message: "Este campo é obrigatório." })
          .url({ message: "Insira uma URL válida (deve começar com http:// ou https://)." }),
      });
    } 
    
    if (inputType === 'number') {
      return z.object({
        value: z.string()
          .min(1, { message: "Este campo é obrigatório." })
          .refine(val => !isNaN(parseFloat(val)), {
            message: "Insira um número válido.",
          }),
      });
    }

    // Default (text/textarea)
    return z.object({ 
      value: z.string().min(1, { message: "Este campo é obrigatório." }) 
    });
  }, [inputType]);


  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      value: String(initialValue || ''),
    },
  });

  // Reset form when dialog opens or initialValue changes
  useEffect(() => {
    if (isOpen) {
      reset({ value: String(initialValue || '') });
    }
  }, [isOpen, initialValue, reset]);

  const onSubmit = (data: FormValues) => {
    let finalValue: string | number = data.value;

    if (inputType === 'number') {
      // Convert to number if inputType is number
      finalValue = parseFloat(data.value);
    }
    
    onSave(fieldName, finalValue);
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const InputComponent = inputType === 'textarea' ? Textarea : Input;
  const inputProps = inputType === 'number' ? { type: 'number', step: 'any' } : 
                     inputType === 'url' ? { type: 'url' } : 
                     { type: 'text' };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 py-4">
            <InputComponent
              id="value"
              placeholder={`Insira o novo valor para ${title.toLowerCase()}`}
              className="col-span-3"
              {...register('value')}
              {...inputProps}
            />
            {errors.value && (
              <p className="text-sm text-red-500 mt-1">{errors.value.message}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !!errors.value}
              variant="highlight"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditFieldDialog;