import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  targetHours?: number; // Hours until the offer expires (default 48)
  className?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetHours = 48, className }) => {
  const calculateTimeLeft = () => {
    // Get or set the expiry time in localStorage
    const expiryKey = 'premium_offer_expiry';
    let expiryTime = localStorage.getItem(expiryKey);
    
    if (!expiryTime) {
      // Set expiry time to 48 hours from now
      const now = new Date().getTime();
      expiryTime = (now + (targetHours * 60 * 60 * 1000)).toString();
      localStorage.setItem(expiryKey, expiryTime);
    }
    
    const difference = parseInt(expiryTime) - new Date().getTime();
    
    if (difference > 0) {
      return {
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        total: difference
      };
    }
    
    return { hours: 0, minutes: 0, seconds: 0, total: 0 };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number) => String(num).padStart(2, '0');

  if (timeLeft.total === 0) {
    return (
      <div className={cn("flex items-center justify-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg", className)}>
        <Clock className="w-4 h-4" />
        <span className="text-sm font-semibold">Oferta expirada</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center gap-3 bg-gradient-to-r from-highlight/10 to-amber-500/10 px-4 py-3 rounded-xl border-2 border-highlight/20", className)}>
      <Clock className="w-5 h-5 text-highlight animate-pulse" />
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Oferta válida por:</span>
        <div className="flex items-center gap-1">
          <TimeUnit value={timeLeft.hours} label="h" />
          <span className="text-highlight font-bold">:</span>
          <TimeUnit value={timeLeft.minutes} label="m" />
          <span className="text-highlight font-bold">:</span>
          <TimeUnit value={timeLeft.seconds} label="s" />
        </div>
      </div>
    </div>
  );
};

const TimeUnit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <span className="text-lg font-extrabold text-highlight leading-none">{String(value).padStart(2, '0')}</span>
    <span className="text-[10px] text-gray-500 uppercase leading-none mt-0.5">{label}</span>
  </div>
);

export default CountdownTimer;
