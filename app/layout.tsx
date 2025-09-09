import { Navbar } from "@/components/navbar";
import { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { ChatWidget } from "../components/chat-widget";
import { FileViewerOverlay } from "@/components/file-viewer-overlay";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://ai-sdk-preview-internal-knowledge-base.vercel.app",
  ),
  title: "Governance OS",
  description:
    "Governance operating system for startups",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Toaster position="top-center" />
        <Navbar />
        {children}
        <FileViewerOverlay />
        <ChatWidget />
      </body>
    </html>
  );
}
