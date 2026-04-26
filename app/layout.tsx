import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { OracleAvatar } from "@/components/OracleAvatar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Realm Shapers",
  description: "Pick four ingredients. Shape a realm with the Oracle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <OracleAvatar />
      </body>
    </html>
  );
}
