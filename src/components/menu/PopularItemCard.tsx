import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface PopularItemCardProps extends React.HTMLAttributes<HTMLDivElement> {
  item: {
    id: string;
    name: string;
    image_url?: string;
    restaurant_name: string;
    restaurant_id: string;
  };
}

const PLACEHOLDER_IMAGE_URL = "/placeholder.svg";

export const PopularItemCard = React.forwardRef<
  HTMLDivElement,
  PopularItemCardProps
>(({ item, className, ...props }, ref) => (
  <Link to={`/restaurants/${item.restaurant_id}/menu-item/${item.id}`}>
    <Card
      ref={ref}
      className={cn(
        "w-[180px] h-[200px] flex flex-col overflow-hidden cursor-pointer hover:shadow-lg transition-shadow relative border-none shadow-soft-md rounded-2xl",
        className
      )}
      {...props}
    >
      <div className="relative w-full h-2/3 overflow-hidden">
        <img
          src={item.image_url || PLACEHOLDER_IMAGE_URL}
          alt={item.name}
          className="object-cover w-full h-full"
        />
      </div>
      <CardContent className="p-2 flex-1 flex flex-col justify-between">
        <h3 className="text-sm font-semibold truncate">{item.name}</h3>
        <p className="text-xs text-gray-500 truncate">{item.restaurant_name}</p>
      </CardContent>
    </Card>
  </Link>
));

PopularItemCard.displayName = "PopularItemCard";