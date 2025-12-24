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
 * Features a floating animation with fade-in/fade-out.
 */
function CreditsAnimation({
  amount,
  show,
  onAnimationEnd,
  className,
}: CreditsAnimationProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    if (show && amount > 0) {
      setIsVisible(true);
      setIsAnimating(true);

      // Animation duration - total 2s
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => {
          setIsVisible(false);
          onAnimationEnd?.();
        }, 300); // Fade out duration
      }, 1700); // Main animation duration

      return () => clearTimeout(timer);
    }
  }, [show, amount, onAnimationEnd]);

  if (!isVisible) return null;

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 inline-flex items-center justify-center",
        "px-1.5 py-0.5 text-xs font-bold rounded-full",
        "bg-green-500 text-white shadow-lg",
        "transition-all duration-300",
        isAnimating
          ? "animate-credits-pop opacity-100"
          : "opacity-0 translate-y-2",
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

function AnimatedCredits({
  currentCredits,
  children,
  className,
}: AnimatedCreditsProps) {
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
    <div className={cn("relative inline-flex", className)}>
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
