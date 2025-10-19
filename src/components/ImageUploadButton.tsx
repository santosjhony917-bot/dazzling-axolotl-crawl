import React, { useRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2, Camera } from 'lucide-react';
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

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input value to allow re-uploading the same file
    event.target.value = '';
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
      <Button
        onClick={handleClick}
        disabled={uploading}
        className={cn("relative", className)}
        {...props}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          children || <Camera className="h-4 w-4" />
        )}
      </Button>
    </>
  );
};