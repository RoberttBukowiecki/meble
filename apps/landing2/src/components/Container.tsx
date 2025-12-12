import { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div className={`container p-8 mx-auto xl:px-0 ${className}`}>
      {children}
    </div>
  );
}
