"use client";

import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Banner {
  id: string;
  image_url: string;
  link_url?: string;
  title: string;
  subtitle?: string;
  has_button: boolean;
  button_text?: string;
  button_link?: string;
  button_color?: string;
  text_color?: string;
  text_position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  text_size?: "sm" | "md" | "lg";
}

interface BannerCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  banners: Banner[];
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({ banners, className, ...props }) => {
  const getTextPositionClasses = (position: Banner['text_position']) => {
    switch (position) {
      case "top-left": return "top-4 left-4 items-start text-left";
      case "top-right": return "top-4 right-4 items-start text-right";
      case "bottom-left": return "bottom-4 left-4 items-end text-left";
      case "bottom-right": return "bottom-4 right-4 items-end text-right";
      case "center": return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center text-center";
      default: return "bottom-4 left-4 items-end text-left";
    }
  };

  const getTextSizeClasses = (size: Banner['text_size']) => {
    switch (size) {
      case "sm": return "text-sm";
      case "md": return "text-base";
      case "lg": return "text-lg";
      default: return "text-base";
    }
  };

  return (
    <div className={cn("relative", className)} {...props}>
      <Carousel className="w-full">
        <CarouselContent>
          {banners.map((banner) => (
            <CarouselItem key={banner.id}>
              <div className="p-1">
                <Card className="relative overflow-hidden rounded-lg shadow-md">
                  <CardContent className="flex aspect-video items-center justify-center p-0">
                    <a href={banner.link_url || "#"} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                      />
                      <div className={cn(
                        "absolute inset-0 flex flex-col justify-end p-4 text-white",
                        getTextPositionClasses(banner.text_position)
                      )} style={{ color: banner.text_color }}>
                        <h3 className={cn("font-bold", getTextSizeClasses(banner.text_size))}>{banner.title}</h3>
                        {banner.subtitle && <p className={cn("text-sm", getTextSizeClasses(banner.text_size))}>{banner.subtitle}</p>}
                        {banner.has_button && banner.button_text && banner.button_link && (
                          <a
                            href={banner.button_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 px-4 py-2 rounded-md text-sm font-medium inline-block"
                            style={{ backgroundColor: banner.button_color }}
                          >
                            {banner.button_text}
                          </a>
                        )}
                      </div>
                    </a>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2" />
        <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2" />
      </Carousel>
    </div>
  );
};

export default BannerCarousel;