import React, { useRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploadButtonProps extends ButtonProps {
  onFileSelect: (file: File) => void;
  uploading: boolean;
  children?: React.ReactNode;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onFileSelect,
  uploading,
  children,
  className,
  ...props
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={uploading}
      />
      <Button
        onClick={handleButtonClick}
        disabled={uploading}
        className={className}
        {...props}
      >
        {children}
      </Button>
    </div>
  );
};