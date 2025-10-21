import React, { useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ButtonProps } from '@/components/ui/button'; // Importa ButtonProps

interface ImageUploadButtonProps extends ButtonProps { // Estende ButtonProps
  onFileSelect: (file: File) => Promise<void>;
  uploading: boolean;
  className?: string;
  icon?: React.ReactNode; // Adiciona suporte para ícone customizado
  children?: React.ReactNode; // Adiciona suporte para children
}

export function ImageUploadButton({ onFileSelect, uploading, className, icon, children, ...props }: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayIcon = useMemo(() => {
    if (uploading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return icon || <Upload className="h-4 w-4" />;
  }, [uploading, icon]);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        disabled={uploading}
      />
      <Button
        type="button"
        onClick={handleClick}
        className={cn("rounded-full", className)}
        size="icon"
        disabled={uploading}
        {...props} // Passa as props adicionais do botão
      >
        {children || displayIcon} {/* Renderiza children se presente, senão o ícone */}
      </Button>
    </>
  );
}