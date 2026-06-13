/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        bg: {
          primary: "#0B1120",
          secondary: "#1A2332",
          tertiary: "#2A3A4E",
        },
        accent: {
          primary: "#00D4FF",
          secondary: "#00E676",
          warning: "#FFD600",
          danger: "#FF6B35",
        },
        border: {
          primary: "#2A3A4E",
          secondary: "#3D5272",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#A0AEC0",
          muted: "#718096",
        },
      },
      fontFamily: {
        display: ["Rajdhani", "DIN Alternate", "sans-serif"],
        body: ["Noto Sans SC", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "marquee": "marquee 30s linear infinite",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(0, 212, 255, 0.5)" },
          "100%": { boxShadow: "0 0 20px rgba(0, 212, 255, 0.8)" },
        },
        marquee: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
      boxShadow: {
        "glow-primary": "0 0 20px rgba(0, 212, 255, 0.3)",
        "glow-danger": "0 0 20px rgba(255, 107, 53, 0.4)",
        "card": "0 4px 20px rgba(0, 0, 0, 0.3)",
        "inner-glow": "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      },
    },
  },
  plugins: [],
};
