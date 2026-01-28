import React, { useEffect, useState } from "react";
import { useToastStore, Toast } from "../../stores/useToastStore";
import {
  CheckCircle,
  AlertOctagon,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const { removeToast } = useToastStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => removeToast(toast.id), 300); // Wait for exit animation
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle className="text-green-400 w-5 h-5 flex-shrink-0" />;
      case "error":
        return <AlertOctagon className="text-red-400 w-5 h-5 flex-shrink-0" />;
      case "warning":
        return (
          <AlertTriangle className="text-yellow-400 w-5 h-5 flex-shrink-0" />
        );
      default:
        return <Info className="text-blue-400 w-5 h-5 flex-shrink-0" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return "bg-slate-800 border-green-500/30";
      case "error":
        return "bg-slate-800 border-red-500/30";
      case "warning":
        return "bg-slate-800 border-yellow-500/30";
      default:
        return "bg-slate-800 border-blue-500/30";
    }
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-xl w-80 
        transition-all duration-300 transform 
        ${getStyles()}
        ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
      role="alert"
    >
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 text-sm text-slate-200 font-medium leading-relaxed">
        {toast.message}
      </div>
      <button
        onClick={handleClose}
        className="text-slate-500 hover:text-white transition-colors ml-2"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
};
