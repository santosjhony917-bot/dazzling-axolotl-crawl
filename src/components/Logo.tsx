import React from 'react';

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="200"
    height="50"
    viewBox="0 0 200 50"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <text
      x="50%"
      y="50%"
      dominantBaseline="middle"
      textAnchor="middle"
      fontFamily="Arial, sans-serif"
      fontSize="24"
      fontWeight="bold"
      fill="#E47948"
    >
      Achei
    </text>
  </svg>
);

export default Logo;