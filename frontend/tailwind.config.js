/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@material-tailwind/react/**/*.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        bounce1: "bounce 1s infinite",
        bounce2: "bounce 1s infinite 0.2s",
        bounce3: "bounce 1s infinite 0.4s",
      },
    },
  },
  plugins: [],
}