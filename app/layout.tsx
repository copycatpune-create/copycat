import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "COPYCAT COPIERS",
  description: "Printing and stationery ordering platform with in-shop pickup.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
