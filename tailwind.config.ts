import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111217",
        paper: "#f7f6f2",
        bronze: "#b08a4a",
        slateblue: "#283046",
        mist: "#e7e3da",
        accent: "#1b5e5a"
      },
      boxShadow: {
        panel: "0 8px 24px rgba(17, 18, 23, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

