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
  textPosition: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right' | 'center';
  textSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl'; // Adicionado
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
  textPosition,
  textSize, // Adicionado
}) => {
  const finalImageUrl = imageUrl || PLACEHOLDER_IMAGE_URL;

  // Determine flexbox classes based on textPosition
  let justifyClasses = '';
  let alignClasses = '';
  let textAlignment = 'text-left'; // Default

  switch (textPosition) {
    case 'top-left':
      justifyClasses = 'justify-start';
      alignClasses = 'items-start';
      textAlignment = 'text-left';
      break;
    case 'top-center':
      justifyClasses = 'justify-start';
      alignClasses = 'items-center';
      textAlignment = 'text-center';
      break;
    case 'top-right':
      justifyClasses = 'justify-start';
      alignClasses = 'items-end';
      textAlignment = 'text-right';
      break;
    case 'center':
      justifyClasses = 'justify-center';
      alignClasses = 'items-center';
      textAlignment = 'text-center';
      break;
    case 'bottom-left':
      justifyClasses = 'justify-end';
      alignClasses = 'items-start';
      textAlignment = 'text-left';
      break;
    case 'bottom-center':
      justifyClasses = 'justify-end';
      alignClasses = 'items-center';
      textAlignment = 'text-center';
      break;
    case 'bottom-right':
      justifyClasses = 'justify-end';
      alignClasses = 'items-end';
      textAlignment = 'text-right';
      break;
    default: // bottom-left
      justifyClasses = 'justify-end';
      alignClasses = 'items-start';
      textAlignment = 'text-left';
      break;
  }

  // Determine text size classes
  let titleSizeClass = 'text-xl';
  let subtitleSizeClass = 'text-sm';
  switch (textSize) {
    case 'sm':
      titleSizeClass = 'text-lg';
      subtitleSizeClass = 'text-xs';
      break;
    case 'md':
      titleSizeClass = 'text-xl';
      subtitleSizeClass = 'text-sm';
      break;
    case 'lg':
      titleSizeClass = 'text-2xl';
      subtitleSizeClass = 'text-base';
      break;
    case 'xl':
      titleSizeClass = 'text-3xl';
      subtitleSizeClass = 'text-lg';
      break;
    case '2xl':
      titleSizeClass = 'text-4xl';
      subtitleSizeClass = 'text-xl';
      break;
  }

  return (
    <div className="relative w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-none border border-gray-200 dark:border-gray-700">
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
        <img
          src={finalImageUrl}
          alt="Banner Preview"
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col p-4",
          justifyClasses,
          alignClasses
        )}>
          <h3 className={cn(titleSizeClass, "font-bold mb-1", textAlignment)} style={{ color: textColor }}>{title || "Título do Banner"}</h3>
          <p className={cn(subtitleSizeClass, "mb-3", textAlignment)} style={{ color: textColor }}>{subtitle || "Subtítulo do banner aqui."}</p>
          {hasButton && (
            <Button
              style={{ backgroundColor: buttonColor, color: textColor }}
              className={cn(
                "w-fit px-4 py-2 rounded-md text-sm font-semibold",
                !buttonText && "opacity-70 cursor-not-allowed",
                textAlignment === 'text-center' && 'mx-auto',
                textAlignment === 'text-right' && 'ml-auto'
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