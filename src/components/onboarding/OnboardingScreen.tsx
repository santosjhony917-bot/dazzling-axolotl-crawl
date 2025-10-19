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
  backgroundImage: string;
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
      {/* BACKGROUND (Image and Gradient) */}
      <div className="absolute inset-0 w-full h-full">
        <img
          alt={title}
          className="w-full h-full object-cover"
          src={backgroundImage}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
      </div>

      {/* SCREEN CONTENT */}
      <div className="relative flex flex-col h-full p-6 pt-10 text-white">
        <div className="flex-grow"></div>

        {/* MAIN TEXT BLOCK */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col justify-end items-center text-center pb-8"
        >
          <h1 className="text-white tracking-tight text-4xl md:text-5xl font-bold leading-tight">
            {title}
          </h1>
          <p className="text-white/90 text-lg font-normal leading-normal max-w-md mt-4 px-4">
            {description}
          </p>

          {features && (
            <div className="mt-8 flex justify-center gap-6 md:gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white/90">{feature.label}</span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Children will render the footer here */}
        {children}
      </div>
    </div>
  );
};

export default OnboardingScreen;