import type { Metadata, Viewport } from "next";
import { Inter, Archivo, Montserrat } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { Pwa } from "@/components/Pwa";
import { ChargeurProfil } from "@/components/Profil";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mont = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-mont", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], weight: ["300", "800"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: "Media Booster",
  applicationName: "Media Booster",
  description: "Veille, création et publication des posts de votre média, depuis le téléphone.",
  robots: { index: false, follow: false },
  // iPhone : ouverture en plein écran depuis l'icône de l'écran d'accueil
  appleWebApp: { capable: true, title: "Booster", statusBarStyle: "default" },
  formatDetection: { telephone: false, email: false, address: false },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // utilise tout l'écran (encoche comprise) ; les marges de sécurité sont gérées en CSS
  themeColor: "#F7F6F2", // même teinte que le fond de l'app : la barre du téléphone se fond dans l'écran
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${archivo.variable} ${mont.variable}`}>
      <body>
        <div className="app">
          {children}
          <BottomNav />
        </div>
        <Pwa />
        <ChargeurProfil />
      </body>
    </html>
  );
}
