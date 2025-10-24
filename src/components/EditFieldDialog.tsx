import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface EditFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fieldName: string;
  currentValue: string;
  icon: React.ReactNode;
  onSave: (value: string) => void;
  placeholder: string;
  validationSchema: z.ZodType<string>;
  type?: "text" | "tel" | "email" | "number"; // <-- 'number' adicionado
  mask?: (value: string) => string;
  isTextArea?: boolean;
}

export default function EditFieldDialog({
  isOpen,
  onClose,
  title,
  fieldName,
  currentValue,
  icon,
  onSave,
  placeholder,
  validationSchema,
  type = "text",
  mask,
  isTextArea = false,
}: EditFieldDialogProps) {
  
  const [isSaving, setIsSaving] = useState(false);

  // Criação dinâmica do schema para o React Hook Form
  const formSchema = z.object({
    fieldValue: validationSchema,
  });
  
  type FormData = z.infer<typeof formSchema>;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fieldValue: currentValue,
    },
  });
  
  // Observa o valor do campo para aplicar a máscara dinamicamente
  const fieldValue = watch('fieldValue');

  // Reseta o estado do formulário quando o diálogo abre ou o valor atual muda
  useEffect(() => {
    if (isOpen) {
      setValue('fieldValue', currentValue, { shouldValidate: false });
    }
  }, [isOpen, currentValue, setValue]);

  // Lida com a mudança de input e aplica a máscara
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let rawValue = e.target.value;
    
    if (mask) {
      rawValue = mask(rawValue);
    }
    
    setValue('fieldValue', rawValue, { shouldValidate: true });
  };

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      // Chama a função de salvamento externa
      onSave(data.fieldValue);
      
      // Simula operação assíncrona
      await new Promise(resolve => setTimeout(resolve, 300)); 
      
      onClose();
    } catch (e) {
      console.error("Erro ao salvar:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const Component = isTextArea ? Textarea : Input;
  
  // Determina o tipo de input para componentes não-textarea
  const inputType = isTextArea ? undefined : type;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {icon}
            <DialogTitle className="text-xl font-bold text-primary">{title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fieldValue" className="text-base font-medium text-primary">{fieldName}</Label>
            <Component
              id="fieldValue"
              {...register('fieldValue')}
              value={fieldValue}
              onChange={handleInputChange}
              type={inputType}
              placeholder={placeholder}
              className="h-12 rounded-xl text-base"
              disabled={isSaving}
            />
            {errors.fieldValue && (
              <p className="text-sm text-destructive">{errors.fieldValue.message}</p>
            )}
          </div>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-[#E47948] hover:bg-[#E47948]/90">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}