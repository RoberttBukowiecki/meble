import * as React from "react";
import { cn } from "../../lib/utils";
import { APP_NAME } from "@meble/constants";

const LOGO_COLOR = "#1a1a2e";

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number | string;
}

const Logo = React.forwardRef<HTMLImageElement, LogoProps>(
  ({ className, size = 32, alt = APP_NAME, ...props }, ref) => {
    return (
      <img
        ref={ref}
        src="/logo.webp"
        alt={alt}
        width={size}
        height={size}
        className={cn("shrink-0", className)}
        {...props}
      />
    );
  }
);

Logo.displayName = "Logo";

export { Logo, LOGO_COLOR };
