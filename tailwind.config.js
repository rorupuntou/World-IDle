// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
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
  // 3. Eliminamos la sección de plugins que hacía referencia al paquete incompatible
  plugins: [],
};