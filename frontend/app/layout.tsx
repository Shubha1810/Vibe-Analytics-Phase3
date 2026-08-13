import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MainContent from "@/components/layout/MainContent";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vibe Analytics — Demand Sensing Intelligence",
  description: "Snowflake Cortex AI-powered analytics for Demand Sensing and Forecasting",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <AppProvider>
          <Header />
          <Sidebar />
          <MainContent>
            {children}
          </MainContent>
        </AppProvider>
      </body>
    </html>
  );
}
