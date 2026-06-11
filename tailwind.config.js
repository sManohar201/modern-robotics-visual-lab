/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090a0f",
        panel: "#111422",
        foreground: "#d2d9ef",
        muted: "#5f6b8d",
        accentBody: "#00e5ff",
        accentSpace: "#ff3d6e",
        accentJoint: "#b5ff4b",
        accentOmega: "#ff6b35",
      },
    },
  },
  plugins: [],
};
