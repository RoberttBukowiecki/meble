import type { Config } from "tailwindcss";
import sharedConfig from "@meble/ui/tailwind.config";

const config: Config = {
  ...sharedConfig,
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    ...sharedConfig.theme,
    extend: {
      ...sharedConfig.theme?.extend,
      colors: {
        ...(sharedConfig.theme?.extend?.colors as Record<string, unknown>),
        // Zone type colors for interior configurator
        "zone-empty": "hsl(var(--zone-empty))",
        "zone-shelves": "hsl(var(--zone-shelves))",
        "zone-drawers": "hsl(var(--zone-drawers))",
        "zone-nested": "hsl(var(--zone-nested))",
      },
    },
  },
};

export default config;
