import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CurvedBottomNavItem {
  icon: React.ElementType;
  path: string;
  label: string;
  shortLabel?: string;
  isSelected: boolean;
}

interface CurvedBottomNavProps {
  ariaLabel: string;
  items: [CurvedBottomNavItem, CurvedBottomNavItem, CurvedBottomNavItem, CurvedBottomNavItem];
  centerAction: React.ReactNode;
  indicatorLayoutId: string;
}

const NavItem = memo(({ item, indicatorLayoutId }: { item: CurvedBottomNavItem; indicatorLayoutId: string }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      aria-label={item.label}
      aria-current={item.isSelected ? 'page' : undefined}
      className="relative flex h-14 w-full max-w-[64px] flex-col items-center justify-center gap-0.5 rounded-2xl pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Icon
        className={cn(
          'h-5 w-5 transition-colors duration-200',
          item.isSelected ? 'fill-highlight text-highlight' : 'text-slate-400 stroke-[2.5]',
        )}
        aria-hidden="true"
      />
      <span className={cn(
        'max-w-full truncate px-1 text-[8px] font-bold leading-none transition-colors duration-200',
        item.isSelected ? 'text-highlight' : 'text-slate-400',
      )}>
        {item.shortLabel || item.label}
      </span>
      {item.isSelected && (
        <motion.span
          layoutId={indicatorLayoutId}
          className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-highlight"
          aria-hidden="true"
        />
      )}
    </Link>
  );
});

export function CurvedBottomNav({ ariaLabel, items, centerAction, indicatorLayoutId }: CurvedBottomNavProps) {
  return (
    <nav aria-label={ariaLabel} className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center">
      <div className="pointer-events-auto relative mx-auto h-[calc(70px+env(safe-area-inset-bottom))] w-full max-w-[448px] bg-transparent">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-white/95"
          style={{ height: 'env(safe-area-inset-bottom)' }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[70px] translate-y-2 backdrop-blur-md">
          <svg
            width="100%"
            height="70"
            viewBox="0 0 450 70"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible object-fill drop-shadow-[0px_-8px_22px_rgba(15,23,42,0.08)]"
            aria-hidden="true"
          >
            <path
              d="M 0 0 L 170 0 C 177 0, 183 4, 186 10 C 193 25, 207 35, 225 35 C 243 35, 257 25, 264 10 C 267 4, 273 0, 280 0 L 450 0 L 450 70 L 0 70 Z"
              fill="rgba(255, 255, 255, 0.96)"
            />
          </svg>
        </div>

        <div className="absolute inset-x-0 top-0 z-10 grid h-[70px] translate-y-2 grid-cols-5">
          <div className="flex items-center justify-center"><NavItem item={items[0]} indicatorLayoutId={indicatorLayoutId} /></div>
          <div className="flex items-center justify-center"><NavItem item={items[1]} indicatorLayoutId={indicatorLayoutId} /></div>
          <div aria-hidden="true" />
          <div className="flex items-center justify-center"><NavItem item={items[2]} indicatorLayoutId={indicatorLayoutId} /></div>
          <div className="flex items-center justify-center"><NavItem item={items[3]} indicatorLayoutId={indicatorLayoutId} /></div>
        </div>

        <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
          {centerAction}
        </div>
      </div>
    </nav>
  );
}

export const curvedCenterActionClassName =
  'relative flex h-[64px] w-[64px] items-center justify-center rounded-full border border-white/70 bg-highlight text-white shadow-[0px_10px_24px_rgba(223,75,28,0.28)] transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 focus-visible:ring-offset-background';
