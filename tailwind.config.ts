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
        // MT brand colors (matching landing page)
        navy: {
          DEFAULT: "#080c18",
          surface: "#0d1120",
          card: "#111627",
          border: "#1a1f32",
        },
        gold: {
          DEFAULT: "#c9a84c",
          light: "#e2c873",
          dark: "#8a7535",
        },
        cream: "#f0ebe0",
        // Workflow pipeline colors
        workflow: {
          finished: "#E67E22",       // orange
          "needs-checked": "#9C27B0", // purple
          "to-invoice": "#1a73e8",    // blue
          "pending-payment": "#FF9800", // amber
          paid: "#2D8A4E",            // green
        },
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
