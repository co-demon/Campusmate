import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: "#202023",
        canvas: "#E9E9E9",
        lime: {
          DEFAULT: "#D7F45A",
          accent: "#D7F45A",
          pale: "#E5F79E",
          light: "#F0FAC7",
        },
        lavender: {
          DEFAULT: "#B8AAF5",
          light: "#EAE5FC",
          dark: "#8F7CE0",
        },
        muted: "#85858A",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'panel': '0 25px 60px -15px rgba(0, 0, 0, 0.12)',
        'pill': '0 2px 8px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
} satisfies Config;
