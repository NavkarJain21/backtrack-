import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Backtrack — Your AI Career Roadmap",
  description:
    "Enter your dream job and get a personalized, AI-generated dependency graph roadmap to get there.",
  keywords: ["career roadmap", "AI learning", "skill graph", "job skills"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#f1f5f9",
              border: "1px solid #334155",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#f1f5f9" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#f1f5f9" },
            },
          }}
        />
      </body>
    </html>
  );
}
