import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import * as z from 'zod';

interface EditFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  fieldName: string;
  currentValue: string | number | undefined;
  icon: React.ReactNode;
  inputType?: 'text' | 'textarea' | 'number' | 'url' | 'tel' | 'email';
  onSave: (fieldName: string, value: string | number) => Promise<void>;
  loading: boolean;
  placeholder?: string;
  validationSchema?: z.ZodType<string>;
  mask?: (value: string) => string;
}

const defaultSchema: z.ZodType<string> = z.string().min(1, "Campo obrigatório");

const EditFieldDialog: React.FC<EditFieldDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  fieldName,
  currentValue,
  icon,
  inputType = 'text',
  onSave,
  loading,
  placeholder,
  validationSchema = defaultSchema,
  mask,
}) => {
  
  // Define o schema dinamicamente
  const schema = z.object({
    value: validationSchema.or(z.literal('')), // Permite string vazia se não for validado
  });

  const { control, handleSubmit, reset, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      value: String(currentValue || ''),
    },
  });

  useEffect(() => {
    // Aplica a máscara ao valor inicial se houver
    const initialValue = mask ? mask(String(currentValue || '')) : String(currentValue || '');
    reset({ value: initialValue });
  }, [currentValue, isOpen, reset, mask]);

  const onSubmit = async (data: { value: string }) => {
    // Remove a máscara antes de salvar, se houver
    const finalValue = mask ? data.value.replace(/\D/g, '') : data.value;
    
    // Se for URL e estiver vazio, salva como string vazia (que o Supabase trata como NULL)
    if (inputType === 'url' && finalValue === '') {
        await onSave(fieldName, null as any);
    } else {
        await onSave(fieldName, finalValue);
    }
    // O fechamento do diálogo é tratado pelo componente pai após o sucesso do onSave
  };

  const renderInput = (field: any) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      let rawValue = e.target.value;
      if (mask) {
        rawValue = mask(rawValue);
      }
      field.onChange(rawValue);
    };
    
    const baseProps = {
      ...field,
      id: "value",
      placeholder: placeholder || `Insira o ${title.toLowerCase()}`,
      disabled: loading,
      className: "h-12 rounded-xl text-base focus:border-highlight focus:ring-highlight shadow-soft-sm",
      onChange: handleInputChange,
    };

    switch (inputType) {
      case 'textarea':
        return (
          <Textarea
            {...baseProps}
            className="min-h-[100px] rounded-xl text-base focus:border-highlight focus:ring-highlight shadow-soft-sm"
          />
        );
      case 'number':
        return (
          <Input
            {...baseProps}
            type="number"
            step="any"
          />
        );
      case 'url':
      case 'tel':
      case 'email':
      case 'text':
      default:
        return (
          <Input
            {...baseProps}
            type={inputType === 'url' ? 'text' : inputType} // Mantemos 'text' para URL para evitar validação nativa
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl shadow-soft-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {icon}
            <DialogTitle className="text-xl font-bold text-primary">{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="value">{title}</Label>
              <Controller
                name="value"
                control={control}
                render={({ field }) => renderInput(field)}
              />
              {errors.value && <p className="text-sm text-destructive mt-1">{errors.value.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !!errors.value}
              variant="highlight"
              className="rounded-xl"
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