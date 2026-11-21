import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "GovEDMS — National Government Document & e-File Management System",
  description: "Enterprise multi-user sovereign document and e-file management system for Prime Minister Secretariat, Ministerial, and Departmental governance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased font-sans text-gov-slate bg-gov-canvas">
        {children}
      </body>
    </html>
  );
}
