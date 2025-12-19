import * as React from "react";

interface PayULogoProps extends React.SVGProps<SVGSVGElement> {
  variant?: "default" | "white";
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { width: 60, height: 24 },
  md: { width: 80, height: 32 },
  lg: { width: 100, height: 40 },
};

/**
 * PayU Logo component
 * Official PayU brand logo for payment integration
 */
export function PayULogo({
  variant = "default",
  size = "md",
  className,
  ...props
}: PayULogoProps) {
  const { width, height } = sizeMap[size];
  const fillColor = variant === "white" ? "#FFFFFF" : "#A6C307";
  const textColor = variant === "white" ? "#FFFFFF" : "#1A1A1A";

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PayU"
      role="img"
      {...props}
    >
      {/* Pay text */}
      <path
        d="M8.5 10h7.2c4.2 0 6.8 2.4 6.8 6.2 0 3.8-2.6 6.2-6.8 6.2h-3.4v7.6H8.5V10zm7 9.2c2 0 3.2-1.1 3.2-3 0-1.9-1.2-3-3.2-3h-3.2v6h3.2z"
        fill={textColor}
      />
      <path
        d="M25.5 15.5c2.4 0 4.1.8 5.2 2.2v-2h3.6v14.3h-3.6v-2c-1.1 1.4-2.8 2.2-5.2 2.2-4 0-7.2-3.2-7.2-7.4 0-4.2 3.2-7.3 7.2-7.3zm.7 11.7c2.4 0 4.5-1.8 4.5-4.4 0-2.6-2.1-4.4-4.5-4.4-2.4 0-4.4 1.8-4.4 4.4 0 2.6 2 4.4 4.4 4.4z"
        fill={textColor}
      />
      <path
        d="M36.2 15.7h3.8l4.2 9.6 4.2-9.6h3.8l-7.8 17.6h-3.9l2.4-5.2-6.7-12.4z"
        fill={textColor}
      />
      {/* U box */}
      <rect x="58" y="8" width="34" height="24" rx="4" fill={fillColor} />
      <path
        d="M71 14v9.5c0 2.2 1.2 3.5 3.2 3.5 2 0 3.2-1.3 3.2-3.5V14h3.6v9.8c0 4.2-2.8 6.7-6.8 6.7-4 0-6.8-2.5-6.8-6.7V14H71z"
        fill={variant === "white" ? "#A6C307" : "#FFFFFF"}
      />
    </svg>
  );
}

export { type PayULogoProps };
