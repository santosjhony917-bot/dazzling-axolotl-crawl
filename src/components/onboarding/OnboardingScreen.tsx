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
  children: React.ReactNode;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  title,
  description,
  features,
  backgroundImage,
  children,
}) => {
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <img 
          alt="Background" 
          className="w-full h-full object-cover" 
          src={backgroundImage} // Usa a URL fornecida
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/15 to-[#FAFAFA]" />
      </div>

      {/* Content Panel */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative flex flex-col h-full justify-end"
      >
        <div className="w-full bg-[#FAFAFA] min-h-[65%] rounded-t-[36px] p-6 pt-10 flex flex-col items-center text-center border-t border-slate-100/50 shadow-[0_-12px_40px_rgba(0,0,0,0.05)]">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-primary tracking-tight text-3xl font-bold leading-tight"
          >
            {title}
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-text-secondary text-base font-normal leading-normal max-w-md mt-4 px-4"
          >
            {description}
          </motion.p>

          {/* Features */}
          {features && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex w-full justify-around mt-10 mb-12 max-w-sm"
            >
              {features.map((feature, index) => (
                <motion.div 
                  key={index}
                  initial={{ scale: 0, y: 0 }}
                  animate={{ 
                    scale: 1,
                    y: [0, -8, 0]
                  }}
                  transition={{ 
                    scale: { delay: 0.5 + index * 0.1, duration: 0.4, type: "spring" },
                    y: { 
                      duration: 3, 
                      repeat: Infinity, 
                      ease: "easeInOut",
                      delay: index * 0.5 
                    } 
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-[72px] h-[72px] rounded-[24px] flex items-center justify-center bg-gradient-to-br from-[#EF2A39]/10 to-[#EF2A39]/05 shadow-[0_8px_20px_rgba(239,42,57,0.06)] border border-[#EF2A39]/10 transition-transform hover:scale-105">
                    <feature.icon className="w-7 h-7 text-highlight" />
                  </div>
                  <span className="text-[#3C2F2F] text-xs font-semibold mt-1">{feature.label}</span>
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