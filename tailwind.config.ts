import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { ink: "#12233f", orange: "#f47b20", cream: "#fffaf5" }, boxShadow: { card: "0 12px 40px rgba(18,35,63,.08)" } } },
  plugins: [],
};
export default config;
