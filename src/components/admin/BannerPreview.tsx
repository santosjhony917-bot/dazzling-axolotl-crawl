"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface BannerPreviewProps {
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  hasButton: boolean;
  buttonText: string;
  buttonLink: string;
  buttonColor: string;
  textColor: string;
}

const BannerPreview: React.FC<BannerPreviewProps> = ({
  title,
  subtitle,
  imageUrl,
  linkUrl,
  hasButton,
  buttonText,
  buttonLink,
  buttonColor,
  textColor,
}) => {
  const finalImageUrl = imageUrl || PLACEHOLDER_IMAGE_URL;

  return (
    <div className="relative w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
        <img
          src={finalImageUrl}
          alt="Banner Preview"
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-4">
          <h3 className="text-xl font-bold mb-1" style={{ color: textColor }}>{title || "Título do Banner"}</h3>
          <p className="text-sm mb-3" style={{ color: textColor }}>{subtitle || "Subtítulo do banner aqui."}</p>
          {hasButton && (
            <Button
              style={{ backgroundColor: buttonColor, color: textColor }}
              className={cn(
                "w-fit px-4 py-2 rounded-md text-sm font-semibold",
                !buttonText && "opacity-70 cursor-not-allowed"
              )}
              onClick={() => {
                if (buttonLink) window.open(buttonLink, '_blank');
              }}
              disabled={!buttonText}
            >
              {buttonText || "Botão"}
            </Button>
          )}
        </div>
      </div>
      {linkUrl && (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-10"
          aria-label="Link do Banner"
        ></a>
      )}
    </div>
  );
};

export default BannerPreview;