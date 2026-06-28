import { Bebas_Neue } from "next/font/google";

import "./globals-v3.css";

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
});

export default function LandingV3GroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className={`landing-v3 ${bebasNeue.variable}`}>{children}</div>;
}
