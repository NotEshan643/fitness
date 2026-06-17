/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Premium dark, masculine palette
        ink: {
          900: "#080A0F", // app background
          850: "#0B0E15",
          800: "#10141D", // surface
          750: "#151A26",
          700: "#1B2230", // raised surface
          600: "#232C3D",
          500: "#2E3848",
        },
        line: "#222A38",
        ember: {
          400: "#FF8A4C",
          500: "#FF6B2C", // primary accent (forge / fire)
          600: "#F2560E",
        },
        steel: {
          300: "#9FB0C9",
          400: "#7A8AA3",
          500: "#5C6B82",
        },
        good: "#34D399",
        warn: "#FBBF24",
        bad: "#F87171",
        info: "#60A5FA",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(255,107,44,0.25), 0 8px 30px -8px rgba(255,107,44,0.35)",
      },
      borderRadius: { xl2: "1.25rem" },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease both",
      },
    },
  },
  plugins: [],
};
