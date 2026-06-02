"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  backLink: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, backLink }) => {
  return (
    <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-50 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to={backLink} className="p-2 -ml-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{title}</h1>
          <div className="w-6"></div> {/* Spacer to help center the title */}
        </div>
      </div>
    </div>
  );
};