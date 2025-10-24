import React, { useState, useCallback } from 'react';
import { z, ZodType } from 'zod';
import EditFieldDialog from './EditFieldDialog';
import { Button } from './ui/button';
import { Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableFieldProps {
  children: React.ReactNode;
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  label: string;
  title?: string;
  fieldName?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  isTextArea?: boolean;
  type?: "text" | "tel" | "email" | "number";
  mask?: (value: string) => string;
  validationSchema?: ZodType<string>;
}

const defaultSchema = z.string().min(1, "Campo obrigatório.");

const EditableField: React.FC<EditableFieldProps> = ({
  children,
  initialValue,
  onSave,
  label,
  title,
  fieldName,
  icon,
  placeholder,
  isTextArea = false,
  type = "text",
  mask,
  validationSchema = defaultSchema,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = useCallback(async (value: string) => {
    await onSave(value);
  }, [onSave]);

  const dialogTitle = title || `Editar ${label}`;
  const dialogFieldName = fieldName || label;
  const dialogIcon = icon || <Edit className="h-6 w-6 text-primary" />;
  const dialogPlaceholder = placeholder || `Digite o novo ${label.toLowerCase()}`;

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)} 
        className={cn(
          "flex items-center justify-between w-full cursor-pointer group",
          isTextArea ? "items-start" : "items-center"
        )}
      >
        {children}
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 p-0 text-[#E47948] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      <EditFieldDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={dialogTitle}
        fieldName={dialogFieldName}
        currentValue={initialValue}
        icon={dialogIcon}
        onSave={handleSave}
        placeholder={dialogPlaceholder}
        validationSchema={validationSchema}
        type={type}
        mask={mask}
        isTextArea={isTextArea}
      />
    </>
  );
};

export default EditableField;