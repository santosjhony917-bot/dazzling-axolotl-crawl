import React from 'react';

interface FilterFoodLogoProps {
  /** Tamanho do ícone (quadrado vermelho). Default: 32 */
  iconSize?: number;
  /** Tamanho da fonte em px. Default: 26 */
  fontSize?: number;
  /** Classe CSS extra no container */
  className?: string;
}

const FilterFoodLogo: React.FC<FilterFoodLogoProps> = ({
  iconSize = 32,
  fontSize = 26,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* Ícone: quadrado vermelho arredondado com garfo branco */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Fundo vermelho arredondado */}
        <rect width="32" height="32" rx="8" fill="#EF2A39" />

        {/* Garfo estilizado — minimalista */}
        {/* Cabo */}
        <rect x="15" y="16" width="2" height="9" rx="1" fill="white" />
        {/* Dentes do garfo */}
        <rect x="11" y="7"  width="1.5" height="7" rx="0.75" fill="white" />
        <rect x="14" y="7"  width="1.5" height="7" rx="0.75" fill="white" />
        <rect x="17" y="7"  width="1.5" height="7" rx="0.75" fill="white" />
        <rect x="20" y="7"  width="1.5" height="7" rx="0.75" fill="white" />
        {/* Base dos dentes */}
        <rect x="11" y="13" width="10.5" height="2" rx="1" fill="white" />
      </svg>

      {/* Texto: Filter (escuro) + Food (vermelho) */}
      <span
        style={{ fontSize, lineHeight: 1, fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}
        className="tracking-tight"
      >
        <span style={{ color: '#1C1C1E' }}>Filter</span>
        <span style={{ color: '#EF2A39' }}>Food</span>
      </span>
    </div>
  );
};

export default FilterFoodLogo;
