import React, { useRef, useState, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ButtonProps } from '@/components/ui/button';

interface ImageUploadButtonProps extends ButtonProps {
  onFileSelect: (file: File) => Promise<void>;
  uploading: boolean;
  className?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const ImageUploadButton = memo(({ onFileSelect, uploading, className, icon, children, ...props }: ImageUploadButtonProps) => {
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
        {...props}
      >
        {children || displayIcon}
      </Button>
    </>
  );
});