import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Playfair_Display,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import ClientWrapper from "@/components/client-wrapper";
import { GoogleOAuthProvider } from "@react-oauth/google";

// --- Google OAuth Client ID ---
const GOOGLE_CLIENT_ID = "492792694839-1u57qo3gisg60mc9qdfja2ju5lsn26dt.apps.googleusercontent.com"; // <-- replace this with your actual client ID

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexa | Travel Booking & Management System",
  description:
    "Book flights, hotels, trains, and buses all in one place. Get the best deals on your travel with Nexa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${spaceGrotesk.variable} antialiased min-h-full`}
      >
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <ClientWrapper>{children}</ClientWrapper>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
