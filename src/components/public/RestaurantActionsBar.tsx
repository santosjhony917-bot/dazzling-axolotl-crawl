"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RestaurantActionsBarProps {
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  isFavoriteMutating: boolean;
  onShare: () => void;
  onBack: () => void;
  paddingClass?: string;
}

const RestaurantActionsBar: React.FC<RestaurantActionsBarProps> = (props) => {
  return null;
};

export default RestaurantActionsBar;