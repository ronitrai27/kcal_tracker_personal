import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "Kcal",
  description: "Your private calorie tracker",
  appleWebApp: { capable: true, title: "Kcal", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={grotesk.variable}>
      {/* Phone-sized column; on desktop it floats on black like a phone. */}
      <body className="min-h-dvh md:flex md:items-center md:justify-center md:p-8">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white md:min-h-[820px] md:rounded-[44px] md:shadow-2xl">
          {children}
        </div>
      </body>
    </html>
  );
}
