"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface StrengthLevel {
  score: number;
  label: string;
  color: string;
}

function calculatePasswordStrength(password: string): StrengthLevel {
  if (!password) {
    return { score: 0, label: "", color: "" };
  }

  let score = 0;

  // Length checks
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Penalty for common patterns
  if (/^[a-zA-Z]+$/.test(password)) score -= 1;
  if (/^[0-9]+$/.test(password)) score -= 2;
  if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters

  // Normalize score to 0-4 range
  const normalizedScore = Math.max(0, Math.min(4, Math.floor(score / 2)));

  const levels: StrengthLevel[] = [
    { score: 0, label: "Bardzo slabe", color: "bg-red-500" },
    { score: 1, label: "Slabe", color: "bg-orange-500" },
    { score: 2, label: "Srednie", color: "bg-yellow-500" },
    { score: 3, label: "Silne", color: "bg-lime-500" },
    { score: 4, label: "Bardzo silne", color: "bg-green-500" },
  ];

  return levels[normalizedScore] || levels[0];
}

function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const strength = calculatePasswordStrength(password);

  if (!password) {
    return null;
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-200",
              index < strength.score ? strength.color : "bg-muted"
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          "text-xs transition-colors",
          strength.score <= 1
            ? "text-red-600"
            : strength.score === 2
              ? "text-yellow-600"
              : "text-green-600"
        )}
      >
        {strength.label}
      </p>
    </div>
  );
}

export { PasswordStrength, calculatePasswordStrength };
