import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

interface EditFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fieldName: string;
  currentValue: string;
  icon: React.ReactNode;
  onSave: (value: string) => Promise<void> | void;
  placeholder?: string;
  type?: "text" | "tel" | "email";
  validationSchema?: z.ZodType<string>; // Alterado de z.ZodString para z.ZodType<string>
  mask?: (value: string) => string;
}

const defaultSchema: z.ZodType<string> = z.string().min(1, "Campo obrigatório");

export default function EditFieldDialog({
  isOpen,
  onClose,
  title,
  fieldName,
  currentValue,
  icon,
  onSave,
  placeholder,
  type = "text",
  validationSchema = defaultSchema,
  mask,
}: EditFieldDialogProps) {
  const [loading, setLoading] = useState(false);
  
  const schema = z.object({
    value: validationSchema,
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      value: currentValue,
    },
  });

  useEffect(() => {
    setValue('value', currentValue);
  }, [currentValue, setValue]);

  const onSubmit = async (data: { value: string }) => {
    setLoading(true);
    try {
      await onSave(data.value);
      onClose();
    } catch (e) {
      // Error handling is done in the parent component (RestaurantProfile)
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value;
    if (mask) {
      rawValue = mask(rawValue);
    }
    setValue('value', rawValue, { shouldValidate: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl shadow-soft-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {icon}
            <DialogTitle className="text-xl font-bold text-primary">{title}</DialogTitle>
          </div>
          <DialogDescription>
            Edite o campo {fieldName} do seu restaurante.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            {...register('value')}
            type={type}
            placeholder={placeholder}
            className="h-12 rounded-xl text-base focus:border-highlight focus:ring-highlight"
            onChange={mask ? handleInputChange : undefined}
          />
          {errors.value && (
            <p className="text-sm text-destructive">{errors.value.message}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !!errors.value}
              variant="highlight"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}