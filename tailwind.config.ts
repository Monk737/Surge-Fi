import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neo: {
          black: "#0a0a0a",
          yellow: "#FFE500",
          red: "#FF2E2E",
          green: "#00C853"
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        accent: "#FFE500" // kept for legacy
      },
      boxShadow: {
        'neo': '4px 4px 0px #0a0a0a',
        'neo-sm': '2px 2px 0px #0a0a0a',
        'neo-lg': '8px 8px 0px #0a0a0a',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ["JetBrains Mono", 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
