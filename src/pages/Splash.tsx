import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";

export default function Splash() {
  const navigate = useNavigate();

  // Auto-navigate after 2 seconds
  useEffect(() => {
    console.log("Splash screen loaded. Redirecting to onboarding in 2 seconds...");
    const timer = setTimeout(() => {
      navigate(createPageUrl("onboarding"));
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="h-screen w-full relative flex items-center justify-center bg-[#E47948]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
        className="text-center px-8"
      >
        <div className="mx-auto max-w-[520px]">
          {/* Full Filter Food logo (icon + text) */}
          <div className="w-full max-w-md mx-auto">
            <svg 
              width="100%" 
              height="auto" 
              viewBox="0 0 369.6666666666667 82.17734484153205" 
              className="w-64 h-16 mx-auto"
            >
              <defs id="SvgjsDefs1021"></defs>
              <g 
                id="SvgjsG1022" 
                transform="matrix(-0.8516934432348191,0,0,0.8516934432348191,73.28311603595398,-1.4947229025838524)" 
                fill="#ffffff"
              >
                <path 
                  fill="#ffffff" 
                  d="M51.798,25.546c-5.767,0-10.458,4.692-10.458,10.459c0,4.981,3.971,14.129,10.458,14.129 c6.488,0,10.458-9.147,10.458-14.129C62.256,30.239,57.564,25.546,51.798,25.546z M51.798,44.633c-1.992,0-4.956-5.162-4.956-8.627 c0-2.732,2.224-4.957,4.956-4.957s4.957,2.225,4.957,4.957C56.755,39.471,53.79,44.633,51.798,44.633z"
                ></path>
                <path 
                  fill="#ffffff" 
                  d="M82.882,50.348c2.082-4.465,3.162-9.322,3.162-14.342c0-18.886-15.363-34.251-34.246-34.251 c-18.882,0-34.245,15.365-34.245,34.251c0,4.167,0.753,8.22,2.198,12.034c0.645,1.572,3.26,7.376,8.777,13.01 c0.22,0.206,0.422,0.43,0.646,0.628l19.662,20.885c0.03,0.033,3.075,3.029,5.928-0.001l3.655-3.883h10.836 c0.903,0.112,2.088,0.546,2.644,2.031c0.003,0.009,0.007,0.012,0.009,0.019l2.966,7.907H74.87c0,0,0.003,0.009,0.003,0.01 l0.219,0.568c0.317,1.13,0.398,3.528-4.688,3.528H31.886c-4.293,0-3.763-2.433-3.555-3.059l3.068-8.18 c0.057-0.113,0.114-0.233,0.173-0.392c0.676-1.76,1.363-2.29,1.834-2.434h2.09c3.04,0,0.711-2.465,0.711-2.465h0.002l-1.082-1.147 c0-0.003-0.002-0.003-0.003-0.004c-1.411-1.496-3.1-1.825-4.066-1.886h-0.963c-0.645,0.116-1.703,0.681-2.563,2.966l-6.275,16.733 c-0.009,0.03-1.386,5.368,7.131,5.368h46.542c0,0,8.987-1.14,6.504-7.775L76.254,76.66c0-0.005-0.004-0.01-0.004-0.015 c-1.331-3.548-5.043-3.469-5.043-3.469h-7.61L74.515,61.58l3.555-3.793C80.358,54.923,81.921,52.239,82.882,50.348z M54.487,74.825 c-0.003,0.003-0.004,0.003-0.007,0.009c-2.351,2.497-4.419,0.939-5.114,0.267l-0.242-0.257c-0.002-0.004-0.009-0.01-0.009-0.01 L33.089,57.81l-0.191-0.186c-1.336-1.168-2.575-2.473-3.68-3.882l-0.271-0.354c-3.854-5.062-5.89-11.07-5.89-17.38 c0-15.852,12.895-28.749,28.742-28.749c15.85,0,28.742,12.896,28.742,28.749c0,6.31-2.035,12.32-5.891,17.38L54.487,74.825z"
                ></path>
              </g>
              {/* Adicionando o texto "Filter Food" ao SVG para garantir que ele apareça */}
              <text 
                x="100" 
                y="45" 
                fontFamily="Plus Jakarta Sans, sans-serif" 
                fontSize="40" 
                fontWeight="800" 
                fill="#ffffff"
                transform="scale(0.8516934432348191)"
              >
                Filter Food
              </text>
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Loading dots animation at the bottom */}
      <motion.div 
        className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex justify-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 bg-white/70 rounded-full"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}