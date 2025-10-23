import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface EditFieldDialogProps {
  initialValue: string | number;
  onSave: (value: string | number) => void;
  label: string;
  type?: "text" | "number" | "email" | "tel";
  isTextArea?: boolean;
  children: React.ReactNode;
}

export default function EditFieldDialog({
  initialValue,
  onSave,
  label,
  type = "text",
  isTextArea = false,
  children,
}: EditFieldDialogProps) {
  const [value, setValue] = useState(String(initialValue));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setValue(String(initialValue));
  }, [initialValue]);

  const handleSave = () => {
    // Basic validation for number type
    let finalValue: string | number = value;
    if (type === "number") {
      finalValue = parseFloat(value);
      if (isNaN(finalValue)) {
        finalValue = value; // Keep as string if parsing fails
      }
    }

    onSave(finalValue);
    setIsOpen(false);
  };

  const Component = isTextArea ? Textarea : Input;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar {label}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Component
            id="edit-field"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type={isTextArea ? undefined : type}
            className="col-span-3"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}