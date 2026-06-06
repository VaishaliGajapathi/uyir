/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        uyir: {
          50: "#fff1f1",
          100: "#ffe1e1",
          200: "#ffc7c7",
          300: "#ffa0a0",
          400: "#ff5f5f",
          500: "#f52828",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        ping2: { "75%, 100%": { transform: "scale(2)", opacity: "0" } },
        slidein: { from: { transform: "translateY(100%)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
      },
      animation: {
        ping2: "ping2 1.8s cubic-bezier(0,0,0.2,1) infinite",
        slidein: "slidein 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
