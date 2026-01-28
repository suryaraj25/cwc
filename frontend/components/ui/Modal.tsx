import React, { useEffect, useState } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle,
  Info,
  AlertOctagon,
  HelpCircle,
} from "lucide-react";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: React.ReactNode;
  type?: "success" | "error" | "warning" | "info" | "confirm";
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "destructive";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => setShow(false), 200); // Animation duration
      document.body.style.overflow = "unset";
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!show && !isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="text-cwc-success w-12 h-12" />;
      case "error":
        return <AlertOctagon className="text-cwc-danger w-12 h-12" />;
      case "warning":
        return <AlertTriangle className="text-yellow-500 w-12 h-12" />; // Yellow manual fallback if no cwc-warning
      case "confirm":
        return <HelpCircle className="text-cwc-primary w-12 h-12" />;
      default:
        return <Info className="text-cwc-accent w-12 h-12" />;
    }
  };

  const isConfirm = !!onConfirm && !!confirmLabel;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 
      ${isOpen ? "bg-black/60 backdrop-blur-sm opacity-100" : "bg-black/0 backdrop-blur-none opacity-0 pointer-events-none"}`}
    >
      <div
        className={`bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 relative transition-all duration-300 transform 
        ${isOpen ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-4 opacity-0"}`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-full"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 bg-slate-900/50 p-4 rounded-full border border-slate-700 shadow-inner">
            {getIcon()}
          </div>

          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <div className="text-slate-300 mb-8 w-full">{message}</div>

          <div className="flex gap-3 w-full justify-center">
            {isConfirm ? (
              <>
                <Button
                  variant="secondary"
                  onClick={onClose}
                  className="w-1/2 bg-slate-700 hover:bg-slate-600 text-white border-none"
                >
                  {cancelLabel}
                </Button>
                <Button
                  onClick={() => {
                    if (onConfirm) onConfirm();
                    onClose();
                  }}
                  className={`w-1/2 text-white ${
                    confirmVariant === "destructive"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {confirmLabel}
                </Button>
              </>
            ) : (
              <Button
                onClick={onClose}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white border-none"
              >
                OK
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
