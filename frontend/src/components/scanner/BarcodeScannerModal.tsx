"use client";

import { useEffect, useState, useRef } from "react";
import { QrCode, X, Camera, Keyboard, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { api } from "@/lib/api";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemFound: (item: { type: "FILE" | "LETTER"; data: any }) => void;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onItemFound,
}: BarcodeScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "usb">("usb");
  const [manualCode, setManualCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  // USB hardware scanner listener
  useBarcodeScanner({
    enabled: isOpen,
    onScan: (code) => {
      handleLookup(code);
    },
  });

  const handleLookup = async (code: string) => {
    if (!code || code.trim().length === 0) return;
    setStatus("loading");
    setLastScanned(code);
    setErrorMessage("");

    try {
      const res = await api.lookupBarcode(code.trim());
      setStatus("success");
      onItemFound(res);
      setTimeout(() => {
        onClose();
        setStatus("idle");
      }, 500);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || `No document or file found with barcode: ${code}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gov-slate/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-gov-lg border border-gov-border max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gov-border flex items-center justify-between bg-gov-canvas/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gov-emerald text-gov-gold flex items-center justify-center shadow-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gov-slate">Dual-Mode Barcode Scanner</h3>
              <p className="text-xs text-gov-muted">Instant File Jacket & Dak Correspondence Lookup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gov-muted hover:text-gov-slate hover:bg-gov-canvas transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gov-border bg-gov-canvas/20 px-5 pt-3 space-x-2">
          <button
            onClick={() => setActiveTab("usb")}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === "usb"
                ? "bg-white border-gov-emerald text-gov-emerald shadow-sm"
                : "border-transparent text-gov-muted hover:text-gov-slate"
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>USB Hardware Scanner</span>
          </button>
          <button
            onClick={() => setActiveTab("camera")}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === "camera"
                ? "bg-white border-gov-emerald text-gov-emerald shadow-sm"
                : "border-transparent text-gov-muted hover:text-gov-slate"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Device Camera (QR / Code-128)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {activeTab === "usb" ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gov-emerald-soft border border-gov-emerald/20 flex items-center justify-center mx-auto text-gov-emerald">
                <Keyboard className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gov-slate">USB Hardware Wedge Ready</h4>
                <p className="text-xs text-gov-muted max-w-xs mx-auto mt-1">
                  Point any handheld USB laser/CCD scanner at the physical letter or file sticker and pull the trigger.
                </p>
              </div>

              {/* Manual Input Fallback */}
              <div className="max-w-xs mx-auto pt-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLookup(manualCode);
                  }}
                  className="flex space-x-2"
                >
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="or type e.g. LTR-2026-001001"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-gov-border bg-gov-canvas font-mono focus:outline-none focus:ring-2 focus:ring-gov-emerald/30"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-gov-emerald text-white hover:bg-gov-emerald-dark"
                  >
                    Go
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <div className="aspect-video w-full rounded-xl bg-gov-slate flex flex-col items-center justify-center text-white/70 border border-gov-border relative overflow-hidden">
                <div className="border-2 border-dashed border-gov-gold/70 w-48 h-32 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-gov-gold font-medium">Align Barcode in Box</span>
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-emerald-400 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Webcam Viewfinder</span>
                </div>
              </div>
              <p className="text-xs text-gov-muted">Supports scanning physical covers using webcam or tablet camera.</p>
            </div>
          )}

          {/* Status Banners */}
          {status === "loading" && (
            <div className="p-3 rounded-xl bg-gov-canvas border border-gov-border text-xs text-gov-slate flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full border-2 border-gov-emerald border-t-transparent animate-spin" />
              <span>Resolving government barcode &quot;{lastScanned}&quot;...</span>
            </div>
          )}

          {status === "success" && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Record located! Opening document drawer...</span>
            </div>
          )}

          {status === "error" && (
            <div className="p-3 rounded-xl bg-gov-crimson-light border border-gov-crimson/30 text-xs text-gov-crimson flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gov-border bg-gov-canvas/30 flex justify-between items-center text-xs text-gov-muted">
          <span>Supported: Code-128, Code-39, QR Code</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-gov-border bg-white hover:bg-gov-canvas text-gov-slate font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
