"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

interface CreditsAnimationProps {
  amount: number;
  show: boolean;
  onAnimationEnd?: () => void;
  className?: string;
}

/**
 * Animated credits indicator that shows +X when credits are added.
 * Features a floating animation that flies off screen.
 */
function CreditsAnimation({ amount, show, onAnimationEnd, className }: CreditsAnimationProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (show && amount > 0) {
      setIsVisible(true);

      // Animation duration matches tailwind config (1.5s)
      const timer = setTimeout(() => {
        setIsVisible(false);
        onAnimationEnd?.();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [show, amount, onAnimationEnd]);

  if (!isVisible) return null;

  return (
    <span
      className={cn(
        "absolute -top-2 -right-2 z-50 inline-flex items-center justify-center",
        "px-2.5 py-1 text-base font-bold rounded-full",
        "bg-green-500 text-white shadow-xl",
        "ring-2 ring-green-300/50",
        "animate-credits-pop",
        className
      )}
    >
      +{amount}
    </span>
  );
}

/**
 * Wrapper component that tracks credit changes and shows animation.
 */
interface AnimatedCreditsProps {
  currentCredits: number;
  children: React.ReactNode;
  className?: string;
}

function AnimatedCredits({ currentCredits, children, className }: AnimatedCreditsProps) {
  const [prevCredits, setPrevCredits] = React.useState(currentCredits);
  const [creditsDelta, setCreditsDelta] = React.useState(0);
  const [showAnimation, setShowAnimation] = React.useState(false);

  React.useEffect(() => {
    // Only animate on increases (not on initial load or decreases)
    if (currentCredits > prevCredits && prevCredits !== 0) {
      const delta = currentCredits - prevCredits;
      setCreditsDelta(delta);
      setShowAnimation(true);
    }
    setPrevCredits(currentCredits);
  }, [currentCredits, prevCredits]);

  const handleAnimationEnd = () => {
    setShowAnimation(false);
    setCreditsDelta(0);
  };

  return (
    <div className={cn("relative inline-flex overflow-visible", className)}>
      {children}
      <CreditsAnimation
        amount={creditsDelta}
        show={showAnimation}
        onAnimationEnd={handleAnimationEnd}
      />
    </div>
  );
}

export { CreditsAnimation, AnimatedCredits };
