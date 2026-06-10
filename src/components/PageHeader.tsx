"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  backLink: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, backLink }) => {
  return (
    <header className="bg-white flex flex-row items-center justify-between w-full px-5 pt-8 pb-4">
      <div className="w-12 flex justify-start">
        <Link to={backLink}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-[#3C2F2F] hover:bg-gray-100 rounded-full h-12 w-12"
          >
            <ArrowLeft className="h-6 w-6 stroke-[2]" />
          </Button>
        </Link>
      </div>
      
      <h1 className="text-xl font-semibold text-[#3C2F2F] tracking-tight truncate flex-1 text-center font-['Poppins']">
        {title}
      </h1>
      
      <div className="w-12 flex justify-end">
        {/* Spacer */}
      </div>
    </header>
  );
};