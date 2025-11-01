"use client";

import React from 'react';
import { Json } from '@/types/supabase'; // Assuming Json type is available
import { formatOpeningHours } from '@/utils/formatters'; // Assuming this utility exists

interface OpeningHoursDisplayProps {
  openingHours: Json | null;
}

const OpeningHoursDisplay: React.FC<OpeningHoursDisplayProps> = ({ openingHours }) => {
  if (!openingHours) {
    return <p className="text-gray-500">Não informado</p>;
  }

  return (
    <div className="text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: formatOpeningHours(openingHours) }} />
  );
};

export default OpeningHoursDisplay;