import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import SiteFooter from "@/components/SiteFooter";
import SceneGate from "@/components/space/SceneGate";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const spaceGrotesk = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });
const jetBrainsMono = JetBrains_Mono({ variable: "--font-data", subsets: ["latin"] });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Star Detective: the astronomy academy",
  description: "An academy that takes anyone from zero to examining real NASA data in five steps.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, inter.variable, spaceGrotesk.variable, jetBrainsMono.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col">
        <SceneGate />
        <div className="app-layer">
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
