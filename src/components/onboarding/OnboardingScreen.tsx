import React from 'react';
import { motion } from 'framer-motion';
import type { LucideProps } from 'lucide-react';

interface Feature {
  icon: React.ElementType<LucideProps>;
  label: string;
}

interface OnboardingScreenProps {
  title: string;
  description: string;
  features: Feature[] | null;
  backgroundImage: string; // Agora aceita uma URL
  accentImage?: string;
  children: React.ReactNode;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  title,
  description,
  features,
  backgroundImage,
  accentImage,
  children,
}) => {
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#FAFAFA]">
      <div className="absolute inset-x-0 top-0 h-[42%] min-h-[280px]">
        <img
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
          src={backgroundImage}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-[#FAFAFA]" />
      </div>

      {accentImage && (
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            opacity: { duration: 0.35 },
            y: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
          }}
          className="absolute left-1/2 top-[7%] w-[74%] max-w-[292px] -translate-x-1/2 rounded-[28px] border border-white/80 bg-white/85 p-2.5 shadow-soft backdrop-blur-sm"
        >
          <img
            src={accentImage}
            alt=""
            className="h-[172px] w-full rounded-[22px] object-cover"
          />
        </motion.div>
      )}

      {/* Content Panel */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative flex h-full flex-col justify-end"
      >
        <div className="flex min-h-[58%] w-full flex-col items-center rounded-t-[32px] border-t border-slate-100/70 bg-[#FAFAFA] px-5 pb-4 pt-7 text-center shadow-[0_-10px_34px_rgba(15,23,42,0.04)]">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-[#3C2F2F] tracking-tight text-[22px] font-semibold leading-tight"
          >
            {title}
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-text-secondary mt-2 max-w-[320px] px-2 text-sm font-normal leading-relaxed"
          >
            {description}
          </motion.p>

          {/* Features */}
          {features && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-8 mb-8 flex w-full max-w-sm justify-center gap-4"
            >
              {features.map((feature, index) => (
                <motion.div 
                  key={index}
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    delay: 0.45 + index * 0.08,
                    duration: 0.28,
                    ease: "easeOut",
                  }}
                  className="flex min-w-0 flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <feature.icon className="h-5 w-5 text-highlight" />
                  </div>
                  <span className="text-[11px] font-medium leading-tight text-[#3C2F2F]">{feature.label}</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingScreen;
