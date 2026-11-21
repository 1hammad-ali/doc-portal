import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          emerald: "#0B4F32",
          "emerald-dark": "#073622",
          "emerald-light": "#147047",
          "emerald-soft": "#E8F3EE",
          gold: "#C59B27",
          "gold-light": "#FBF6E8",
          slate: "#111C18",
          muted: "#5A6B64",
          canvas: "#F3F5F4",
          surface: "#FFFFFF",
          border: "#E2E8E5",
          crimson: "#B42318",
          "crimson-light": "#FEE4E2",
          amber: "#B54708",
          "amber-light": "#FEF0C7",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        gov: "0 1px 3px rgba(11, 79, 50, 0.05), 0 1px 2px rgba(11, 79, 50, 0.03)",
        "gov-md": "0 4px 12px rgba(11, 79, 50, 0.06), 0 1px 3px rgba(11, 79, 50, 0.04)",
        "gov-lg": "0 12px 32px rgba(11, 79, 50, 0.08), 0 2px 6px rgba(11, 79, 50, 0.04)",
      },
      borderRadius: {
        bento: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
