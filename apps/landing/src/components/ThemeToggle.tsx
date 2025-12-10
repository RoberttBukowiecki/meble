"use client";

import { FiMonitor, FiMoon, FiSun } from "react-icons/fi";

import { useTheme } from "./ThemeProvider";

const ThemeToggle: React.FC = () => {
  const { theme, resolvedTheme, cycleTheme } = useTheme();

  const icon =
    theme === "system" ? (
      <FiMonitor className="w-5 h-5" />
    ) : resolvedTheme === "dark" ? (
      <FiMoon className="w-5 h-5" />
    ) : (
      <FiSun className="w-5 h-5" />
    );

  const label =
    theme === "system"
      ? "System theme"
      : resolvedTheme === "dark"
        ? "Dark theme"
        : "Light theme";

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="p-2 rounded-full border border-border hover:border-primary transition-colors text-foreground bg-card"
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
};

export default ThemeToggle;
