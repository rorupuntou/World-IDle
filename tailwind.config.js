// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@worldcoin/mini-apps-ui-kit-react/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 1. Sobrescribimos la altura para usar 'dvh' (esto ya estaba bien)
      minHeight: {
        screen: "100dvh",
      },
      height: {
        screen: "100dvh",
      },
      // 2. NUEVO: Añadimos espaciado para las áreas seguras de iOS
      // Esto nos permitirá usar clases como 'pt-safe', 'pb-safe', etc.
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
    },
  },
  plugins: [
    require("@worldcoin/mini-apps-ui-kit-react/tailwind"),
  ],
};