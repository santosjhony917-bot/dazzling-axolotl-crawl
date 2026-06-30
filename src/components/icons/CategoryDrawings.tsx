import React from 'react';

interface IllustrationProps {
  className?: string;
  isSelected?: boolean;
}

// 1. TUDO - Chef Platter / Cloche with Sparkles
export const ChefPlatterIllustration: React.FC<IllustrationProps> = ({ className = "w-11 h-11" }) => {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="clocheGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF8A65" />
          <stop offset="100%" stopColor="#df4b1c" />
        </linearGradient>
        <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="100%" stopColor="#F57C00" />
        </linearGradient>
      </defs>
      {/* Sparkles */}
      <path d="M46 16L47.5 19L50.5 20.5L47.5 22L46 25L44.5 22L41.5 20.5L44.5 19L46 16Z" fill="url(#sparkleGrad)" />
      <path d="M16 18L17 20L19 21L17 22L16 24L15 22L13 21L15 20L16 18Z" fill="url(#sparkleGrad)" />
      
      {/* Plate Base */}
      <path d="M8 44H56C57.6569 44 59 45.3431 59 47C59 47.5523 58.5523 48 58 48H6C5.44772 48 5 47.5523 5 47C5 45.3431 6.34315 44 8 44Z" fill="#3C2F2F" />
      
      {/* Dome Cloche */}
      <path d="M14 40C14 24 22 14 32 14C42 14 50 24 50 40H14Z" fill="url(#clocheGrad)" />
      {/* Cloche Highlight/Reflex */}
      <path d="M18 40C18 26.5 24.5 18 32 18V14C22 14 14 24 14 40H18Z" fill="white" opacity="0.15" />
      
      {/* Handle */}
      <circle cx="32" cy="11" r="3.5" fill="#3C2F2F" />
      <path d="M28 14H36" stroke="#3C2F2F" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* Steam / Aroma */}
      <path d="M26 8C26 8 27 5 29 5C31 5 32 8 32 8" stroke="#FF8A65" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M34 7C34 7 35 4 37 4C39 4 40 7 40 7" stroke="#df4b1c" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
};

// 2. COMBOS - Burger + Drink Cup
export const ComboIllustration: React.FC<IllustrationProps> = ({ className = "w-11 h-11" }) => {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="cupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFA726" />
          <stop offset="100%" stopColor="#df4b1c" />
        </linearGradient>
        <linearGradient id="bunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="100%" stopColor="#FB8C00" />
        </linearGradient>
      </defs>
      
      {/* Soda Cup */}
      <path d="M38 24L41 46C41.5 48 43 49 45 49H51C53 49 54.5 48 55 46L58 24H38Z" fill="url(#cupGrad)" />
      {/* Cup Lid */}
      <path d="M36 21C36 19.9 36.9 19 38 19H58C59.1 19 60 19.9 60 21V24H36V21Z" fill="#3C2F2F" />
      {/* Straw */}
      <path d="M49 8L46 19" stroke="#E8EAED" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M49 8H53" stroke="#df4b1c" strokeWidth="3.5" strokeLinecap="round" />
      
      {/* Burger */}
      {/* Bottom Bun */}
      <path d="M8 44C8 42.5 9.5 41 11 41H29C30.5 41 32 42.5 32 44V46C32 48.2 30.2 50 28 50H12C9.8 50 8 48.2 8 46V44Z" fill="url(#bunGrad)" />
      {/* Cheese */}
      <path d="M7 36H33L30 41H10L7 36Z" fill="#FFD54F" />
      {/* Burger Patty */}
      <rect x="7" y="37" width="26" height="5" rx="2.5" fill="#5D4037" />
      {/* Lettuce */}
      <path d="M6 33C6 33 9 31 12 33C15 35 18 32 21 34C24 36 27 33 30 35C32 34 34 35 34 35" stroke="#4CAF50" strokeWidth="3.5" strokeLinecap="round" />
      {/* Top Bun */}
      <path d="M8 30C8 20 12 16 20 16C28 16 32 20 32 30H8Z" fill="url(#bunGrad)" />
      {/* Sesame Seeds */}
      <circle cx="14" cy="22" r="0.8" fill="white" />
      <circle cx="20" cy="20" r="0.8" fill="white" />
      <circle cx="26" cy="23" r="0.8" fill="white" />
    </svg>
  );
};

// 3. LANCHES - Premium double-layer Burger
export const BurgerIllustration: React.FC<IllustrationProps> = ({ className = "w-11 h-11" }) => {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="burgerBunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="100%" stopColor="#E67E22" />
        </linearGradient>
        <linearGradient id="pattyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6D4C41" />
          <stop offset="100%" stopColor="#3E2723" />
        </linearGradient>
        <linearGradient id="cheeseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
      </defs>
      
      {/* Shadow */}
      <ellipse cx="32" cy="53" rx="20" ry="3" fill="#E8EAED" />
      
      {/* Bottom Bun */}
      <path d="M12 45C12 42.8 13.8 41 16 41H48C50.2 41 52 42.8 52 45V46C52 49.9 48.9 53 45 53H19C15.1 53 12 49.9 12 46V45Z" fill="url(#burgerBunGrad)" />
      
      {/* Patty */}
      <rect x="9" y="34" width="46" height="8" rx="4" fill="url(#pattyGrad)" />
      
      {/* Cheese Melt */}
      <path d="M8 34L14 40L20 34H32L38 40L44 34H56V36C56 36 50 39 46 40H18C14 40 8 36 8 36V34Z" fill="url(#cheeseGrad)" />
      
      {/* Tomato Slices */}
      <rect x="13" y="27" width="16" height="6" rx="3" fill="#df4b1c" />
      <rect x="35" y="27" width="16" height="6" rx="3" fill="#df4b1c" />
      
      {/* Lettuce */}
      <path d="M7 26C7 26 11 22 16 25C21 28 27 23 32 26C37 29 43 24 48 26C53 28 57 26 57 26" stroke="#2ECC71" strokeWidth="4.5" strokeLinecap="round" />
      
      {/* Top Bun */}
      <path d="M12 22C12 10 20 7 32 7C44 7 52 10 52 22H12Z" fill="url(#burgerBunGrad)" />
      
      {/* Sesame Seeds */}
      <circle cx="22" cy="13" r="1" fill="white" />
      <circle cx="28" cy="11" r="1" fill="white" />
      <circle cx="36" cy="12" r="1" fill="white" />
      <circle cx="42" cy="15" r="1" fill="white" />
      <circle cx="20" cy="17" r="1" fill="white" />
      <circle cx="32" cy="16" r="1" fill="white" />
    </svg>
  );
};

// 4. SOBREMESAS - Cupcake with Frosting and Cherry
export const CupcakeIllustration: React.FC<IllustrationProps> = ({ className = "w-11 h-11" }) => {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="cupcakeBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFAB91" />
          <stop offset="100%" stopColor="#D84315" />
        </linearGradient>
        <linearGradient id="creamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="50%" stopColor="#F48FB1" />
          <stop offset="100%" stopColor="#F06292" />
        </linearGradient>
      </defs>
      
      {/* Shadow */}
      <ellipse cx="32" cy="54" rx="15" ry="2.5" fill="#E8EAED" />
      
      {/* Cupcake Wrapper */}
      <path d="M18 35L22 51C22.5 53 24.5 54 26.5 54H37.5C39.5 54 41.5 53 42 51L46 35H18Z" fill="url(#cupcakeBaseGrad)" />
      {/* Wrapper Lines */}
      <path d="M25 35L27 54" stroke="#7B1FA2" strokeWidth="1.5" opacity="0.15" />
      <path d="M32 35V54" stroke="#7B1FA2" strokeWidth="1.5" opacity="0.15" />
      <path d="M39 35L37 54" stroke="#7B1FA2" strokeWidth="1.5" opacity="0.15" />
      
      {/* Frosting / Cream */}
      <rect x="14" y="28" width="36" height="9" rx="4.5" fill="url(#creamGrad)" />
      <rect x="18" y="21" width="28" height="9" rx="4.5" fill="url(#creamGrad)" />
      <rect x="23" y="14" width="18" height="9" rx="4.5" fill="url(#creamGrad)" />
      
      {/* Cherry */}
      <circle cx="32" cy="10" r="4.5" fill="#df4b1c" />
      <path d="M34 9C36 5 39 4 41 6" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Sprinkles */}
      <rect x="20" y="32" width="2.5" height="1" rx="0.5" transform="rotate(30 20 32)" fill="#FFD700" />
      <rect x="38" y="31" width="2.5" height="1" rx="0.5" transform="rotate(-45 38 31)" fill="#00E676" />
      <rect x="28" y="24" width="2.5" height="1" rx="0.5" transform="rotate(15 28 24)" fill="#00E5FF" />
      <rect x="44" y="25" width="2.5" height="1" rx="0.5" transform="rotate(60 44 25)" fill="#FFFFFF" />
    </svg>
  );
};

// 5. PIZZA - Pepperoni Pizza Slice
export const PizzaIllustration: React.FC<IllustrationProps> = ({ className = "w-11 h-11" }) => {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="crustGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
        <linearGradient id="cheesePizzaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF59D" />
          <stop offset="100%" stopColor="#F57C00" />
        </linearGradient>
      </defs>
      
      {/* Crust (back curved border) */}
      <path d="M14 17C23 13 41 13 50 17L46 23C38 20 26 20 18 23L14 17Z" fill="url(#crustGrad)" />
      
      {/* Cheese Triangle */}
      <path d="M16 21L32 53L48 21Z" fill="url(#cheesePizzaGrad)" />
      
      {/* Pepperoni slices */}
      <circle cx="26" cy="27" r="4.5" fill="#df4b1c" />
      <circle cx="26" cy="27" r="2.5" fill="#C62828" opacity="0.6" />
      
      <circle cx="38" cy="31" r="4" fill="#df4b1c" />
      <circle cx="38" cy="31" r="2" fill="#C62828" opacity="0.6" />
      
      <circle cx="30" cy="41" r="3.5" fill="#df4b1c" />
      <circle cx="30" cy="41" r="1.5" fill="#C62828" opacity="0.6" />
      
      {/* Oregano and green peppers */}
      <rect x="21" y="35" width="3" height="1" rx="0.5" transform="rotate(45 21 35)" fill="#4CAF50" />
      <rect x="36" y="23" width="3" height="1" rx="0.5" transform="rotate(-30 36 23)" fill="#4CAF50" />
      <rect x="31" y="47" width="3" height="1" rx="0.5" transform="rotate(15 31 47)" fill="#4CAF50" />
    </svg>
  );
};

// 6. SAUDAVEL - Salad Bowl
export const SaladIllustration: React.FC<IllustrationProps> = ({ className = "w-11 h-11" }) => {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="bowlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4DB6AC" />
          <stop offset="100%" stopColor="#00796B" />
        </linearGradient>
        <linearGradient id="avocadoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C5E1A5" />
          <stop offset="100%" stopColor="#558B2F" />
        </linearGradient>
      </defs>
      
      {/* Salad Bowl Base */}
      <path d="M12 32C12 43.5 21 51 32 51C43 51 52 43.5 52 32H12Z" fill="url(#bowlGrad)" />
      {/* Bowl Rim */}
      <rect x="10" y="29" width="44" height="4" rx="2" fill="#004D40" />
      
      {/* Lettuce Leaves peeking out */}
      <path d="M13 29C11 25 14 20 17 22C20 19 24 21 25 25" fill="#81C784" />
      <path d="M39 29C38 25 41 20 44 21C47 19 50 24 48 29" fill="#81C784" />
      <path d="M26 29C25 24 29 20 32 21C35 20 38 24 37 29" fill="#66BB6A" />
      
      {/* Avocado Slice */}
      <path d="M21 23C24 19 29 20 31 24L24 29C22 27 20 25 21 23Z" fill="url(#avocadoGrad)" />
      <circle cx="26" cy="24" r="2" fill="#4E342E" />
      
      {/* Cherry Tomatoes */}
      <circle cx="36" cy="26" r="4.5" fill="#df4b1c" />
      <circle cx="34.5" cy="24.5" r="1" fill="white" opacity="0.6" />
      
      {/* Egg slice */}
      <ellipse cx="44" cy="27" rx="5.5" ry="4" fill="white" transform="rotate(-15 44 27)" />
      <ellipse cx="43.5" cy="27" rx="2.5" ry="1.8" fill="#FFD54F" transform="rotate(-15 43.5 27)" />
    </svg>
  );
};
