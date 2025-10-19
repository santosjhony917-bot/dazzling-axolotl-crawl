import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils/url';

export default function Welcome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const user = await base44.auth.me();
      
      if (user.user_role === 'customer') {
          navigate(createPageUrl('find-restaurants'));
      } else if (user.user_role === 'restaurant') {
          navigate(createPageUrl('restaurant-dashboard'));
      }
    } catch (error) {
      // User is not logged in or has no role, stay on this page
      console.log('User has no role, staying on welcome page.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = async (role: 'customer' | 'restaurant') => {
    try {
      await base44.auth.updateMe({ user_role: role });
      
      if (role === 'customer') {
        navigate(createPageUrl('onboarding'));
      } else {
        navigate(createPageUrl('restaurant-signup'));
      }
    } catch (error) {
      console.error('Error saving user role:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-[#E47948]/20 rounded-full" />
          <div className="h-4 w-32 bg-[#022D68]/20 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-white">
      <div className="flex flex-col items-center justify-center flex-grow p-4">
        {/* Logo and Icon */}
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="flex flex-col items-center mb-8"
        >
          <div className="mb-4">
            <svg viewBox="0 0 350 183.60675332915818" className="w-40 h-auto">
              <g transform="matrix(-1.0220321318817829,0,0,1.0220321318817829,227.93973924314477,-1.79366748310062)" fill="#032d63">
                <path d="M51.798,25.546c-5.767,0-10.458,4.692-10.458,10.459c0,4.981,3.971,14.129,10.458,14.129  c6.488,0,10.458-9.147,10.458-14.129C62.256,30.239,57.564,25.546,51.798,25.546z M51.798,44.633c-1.992,0-4.956-5.162-4.956-8.627  c0-2.732,2.224-4.957,4.956-4.957s4.957,2.225,4.957,4.957C56.755,39.471,53.79,44.633,51.798,44.633z"></path>
                <path d="M82.882,50.348c2.082-4.465,3.162-9.322,3.162-14.342c0-18.886-15.363-34.251-34.246-34.251  c-18.882,0-34.245,15.365-34.245,34.251c0,4.167,0.753,8.22,2.198,12.034c0.645,1.572,3.26,7.376,8.777,13.01  c0.22,0.206,0.422,0.43,0.646,0.628l19.662,20.885c0.03,0.033,3.075,3.029,5.928-0.001l3.655-3.883h10.836  c0.903,0.112,2.088,0.546,2.644,2.031c0.003,0.009,0.007,0.012,0.009,0.019l2.966,7.907H74.87c0,0,0.003,0.009,0.003,0.01  l0.219,0.568c0.317,1.13,0.398,3.528-4.688,3.528H31.886c-4.293,0-3.763-2.433-3.555-3.059l3.068-8.18  c0.057-0.113,0.114-0.233,0.173-0.392c0.676-1.76,1.363-2.29,1.834-2.434h2.09c3.04,0,0.711-2.465,0.711-2.465h0.002l-1.082-1.147  c0-0.003-0.002-0.003-0.003-0.004c-1.411-1.496-3.1-1.825-4.066-1.886h-0.963c-0.645,0.116-1.703,0.681-2.563,2.966l-6.275,16.733  c-0.009,0.03-1.386,5.368,7.131,5.368h46.542c0,0,8.987-1.14,6.504-7.775L76.254,76.66c0-0.005-0.004-0.01-0.004-0.015  c-1.331-3.548-5.043-3.469-5.043-3.469h-7.61L74.515,61.58l3.555-3.793C80.358,54.923,81.921,52.239,82.882,50.348z M54.487,74.825  c-0.003,0.003-0.004,0.003-0.007,0.009c-2.351,2.497-4.419,0.939-5.114,0.267l-0.242-0.257c-0.002-0.004-0.009-0.01-0.009-0.01  L33.089,57.81l-0.191-0.186c-1.336-1.168-2.575-2.473-3.68-3.882l-0.271-0.354c-3.854-5.062-5.89-11.07-5.89-17.38  c0-15.852,12.895-28.749,28.742-28.749c15.85,0,28.742,12.896,28.742,28.749c0,6.31-2.035,12.32-5.891,17.38L54.487,74.825z"></path>
              </g>
              <g transform="matrix(2.2247506810980866,0,0,2.2247506810980866,-5.07243148925301,94.08279067435136)" fill="#032d63">
                <path d="M2.28 15.52 l18.2 0 l0 5.56 l-12.2 0 l0 3.92 l9.8 0 l0 5.56 l-9.8 0 l0 9.44 l-6 0 l0 -24.48 z M20.929000000000006 20 l6 0 l0 20 l-6 0 l0 -20 z M23.929000000000006 18.12 c-2.04 0 -3.48 -1.44 -3.48 -3.48 c0 -2.08 1.44 -3.44 3.48 -3.44 c2.08 0 3.44 1.36 3.44 3.44 c0 2.12 -1.32 3.48 -3.44 3.48 z M28.418000000000006 12 l6 0 l0 28 l-6 0 l0 -28 z M47.507000000000005 20.68 l0 5.56 l-5.6 0 l0 3.76 c0 3.08 2.04 4.64 5 4.64 c0.36 0 0.68 -0.04 0.96 -0.08 s0.52 -0.08 0.8 -0.12 l0 5.56 c-0.36 0.04 -0.64 0.12 -0.84 0.16 c-0.24 0.04 -0.64 0.04 -1.16 0.04 c-6.04 0 -10.76 -4.12 -10.76 -10.2 l0 -14.8 l6 0 l0 5.48 l5.6 0 z M53.956 27.6 c0.6 0.2 1.28 0.36 2 0.44 c0.72 0.12 1.4 0.16 2.04 0.16 c0.8 0 2.84 -0.16 2.84 -1.32 c0 -1.24 -1.76 -1.28 -2.64 -1.28 c-1.76 0 -3.28 0.4 -4.24 2 z M65.27600000000001 33.76 l0 5.6 c-2.24 0.52 -4.48 0.88 -6.8 0.88 c-6.36 0 -11.08 -3.72 -11.08 -10.16 c0 -6.36 4.56 -10.28 10.6 -10.28 c4.12 0 8.88 1.96 8.88 6.64 c0 4.64 -5.04 6.36 -8.92 6.36 c-1.48 0 -2.96 -0.4 -4.32 -0.96 c0.8 2.24 3.2 2.6 5.28 2.6 c1.08 0 2.16 -0.04 3.24 -0.2 c1 -0.08 2.16 -0.2 3.12 -0.48 z M73.44500000000001 30 l0 10 l-6 0 l0 -9.96 c0 -6.64 4.88 -10.24 11.04 -10.24 c0.2 0 0.48 0 0.76 0.04 s0.6 0.12 0.88 0.16 l0 5.8 c-0.2 -0.04 -0.44 -0.08 -0.72 -0.12 s-0.52 -0.08 -0.72 -0.08 c-1 0 -1.8 0.12 -2.48 0.32 c-1.12 0.4 -2.12 1.16 -2.48 2.36 c-0.2 0.52 -0.28 1.12 -0.28 1.72 z M80.614 15.52 l18.2 0 l0 5.56 l-12.2 0 l0 3.92 l9.8 0 l0 5.56 l-9.8 0 l0 9.44 l-6 0 l0 -24.48 z M108.02300000000001 34.64 c2.92 0 4.6 -1.72 4.6 -4.64 s-1.68 -4.64 -4.6 -4.64 s-4.6 1.72 -4.6 4.64 s1.68 4.64 4.6 4.64 z M108.02300000000001 40.2 c-6.16 0 -10.6 -4.08 -10.6 -10.2 c0 -6.32 4.6 -10.2 10.6 -10.2 c6.2 0 10.6 4.08 10.6 10.2 c0 6.28 -4.64 10.2 -10.6 10.2 z M128.512 34.64 c2.92 0 4.6 -1.72 4.6 -4.64 s-1.68 -4.64 -4.6 -4.64 s-4.6 1.72 -4.6 4.64 s1.68 4.64 4.6 4.64 z M128.512 40.2 c-6.16 0 -10.6 -4.08 -10.6 -10.2 c0 -6.32 4.6 -10.2 10.6 -10.2 c6.2 0 10.6 4.08 10.6 10.2 c0 6.28 -4.64 10.2 -10.6 10.2 z M153.601 30 c0 -3 -1.48 -4.64 -4.52 -4.64 c-0.84 0 -1.56 0.12 -2.16 0.36 c-1.12 0.52 -1.88 1.28 -2.24 2.48 c-0.2 0.56 -0.28 1.16 -0.28 1.8 s0.08 1.24 0.28 1.8 c0.32 1.16 1.16 2 2.24 2.44 c0.6 0.28 1.32 0.4 2.16 0.4 c3.04 0 4.52 -1.64 4.52 -4.64 z M153.601 22 l0 -10 l6 0 l0 18 c0 6.36 -4.52 10.2 -10.56 10.2 c-6.16 0 -10.64 -4 -10.64 -10.12 c0 -5.64 4.16 -10.28 9.84 -10.28 c2.12 0 3.96 0.6 5.36 2.2 z"></path>
              </g>
            </svg>
          </div>
        </motion.div>

        {/* Welcome Text */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-md text-center"
        >
          <h1 className="text-[#032d63] tracking-light text-[32px] font-bold leading-tight pb-3 pt-6">
            Bem-vindo!
          </h1>
          <p className="text-[#032d63] text-base font-normal leading-normal pb-3 pt-1">
            Escolha como deseja usar o FilterFood
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col gap-4 w-full max-w-md px-4 py-3 mt-8"
        >
          <Button
            onClick={() => handleRoleSelection('customer')}
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-5 bg-[#E47948] hover:bg-[#E47948]/90 text-white text-base font-bold leading-normal tracking-[0.015em] w-full transition-all hover:shadow-lg"
          >
            <span className="truncate">Quero encontrar restaurantes e pratos</span>
          </Button>

          <Button
            onClick={() => handleRoleSelection('restaurant')}
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-5 bg-transparent border-2 border-[#E47948] text-[#E47948] hover:bg-[#E47948]/10 text-base font-bold leading-normal tracking-[0.015em] w-full transition-all"
          >
            <span className="truncate">Sou restaurante</span>
          </Button>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="w-full py-6">
        <p className="text-[#5f728c] text-sm font-normal leading-normal text-center">
          © 2025 FilterFood - Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
}