"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { RightTimelineRail } from "@/components/layout/RightTimelineRail";
import { BarcodeScannerModal } from "@/components/scanner/BarcodeScannerModal";
import { LetterSplitDrawer } from "@/components/letters/LetterSplitDrawer";
import { Letter } from "@/types";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("govedms_token");
    if (!token) {
      router.push("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  const handleItemFound = (item: { type: "FILE" | "LETTER"; data: any }) => {
    if (item.type === "LETTER") {
      setSelectedLetter(item.data);
    } else if (item.type === "FILE") {
      window.location.href = `/files/${item.data.id}`;
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gov-canvas flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gov-emerald border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gov-canvas">
      {/* Zone 1: Left Navigation Rail */}
      <Sidebar />

      {/* Zone 2: Fluid Center Canvas */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header onOpenScanner={() => setIsScannerOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 bg-transparent">
          {children}
        </main>
      </div>

      {/* Zone 3: Right Live Timeline Rail */}
      <RightTimelineRail />

      {/* Modals & Drawers */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onItemFound={handleItemFound}
      />

      <LetterSplitDrawer
        letter={selectedLetter}
        isOpen={!!selectedLetter}
        onClose={() => setSelectedLetter(null)}
      />
    </div>
  );
}
