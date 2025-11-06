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
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background-light/40" />
      </div>

      {/* Content Panel */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative flex flex-col h-full justify-end"
      >
        <div className="w-full bg-background-light min-h-[65%] rounded-t-xl p-6 pt-10 flex flex-col items-center text-center shadow-2xl">
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
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.4, type: "spring" }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-20 h-20 rounded-xl flex items-center justify-center bg-highlight/10">
                    <feature.icon className="w-8 h-8 text-highlight" />
                  </div>
                  <span className="text-primary text-sm font-medium">{feature.label}</span>
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