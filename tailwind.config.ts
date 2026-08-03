import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          50: "#e6fffa",
          100: "#b2f5ea",
          200: "#81e6d9",
          300: "#4fd1c5",
          400: "#38e8b0",
          500: "#22e87f",
          600: "#10d977",
          700: "#0eaa60",
          800: "#0c7c47",
          900: "#08432a"
        },
        slate: {
          950: "#05070d"
        }
      },
      fontFamily: {
        display: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"]
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(34, 232, 127, 0.45)"
          },
          "50%": {
            boxShadow: "0 0 0 10px rgba(34, 232, 127, 0)"
          }
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" }
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        floaty: "floaty 5s ease-in-out infinite",
        fadeIn: "fadeIn 0.35s ease-out both",
        shimmer: "shimmer 3.2s linear infinite"
      },
      boxShadow: {
        glass: "0 8px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
        neon: "0 0 24px rgba(34,232,127,0.35)"
      }
    }
  },
  plugins: []
};

export default config;
