import { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  closable?: boolean; // if false, no close button or backdrop click
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, closable = true, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !closable) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && onClose) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, closable, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={closable ? onClose : undefined}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(44, 36, 24, 0.5)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />

      {/* Content */}
      <div
        ref={ref}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          backgroundColor: "#FFFFFF",
          border: "1px solid #DDD5C0",
          borderRadius: 10,
          boxShadow: "0 8px 32px rgba(44, 36, 24, 0.15)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Pre-built modal layouts ────────────────────────────

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div style={{ padding: "24px 24px 20px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#2C2418", margin: "0 0 8px" }}>
          {title}
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#5C5040", margin: 0, whiteSpace: "pre-line" }}>
          {message}
        </p>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 24px 20px",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={onCancel}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 500,
            border: "1px solid #DDD5C0",
            borderRadius: 6,
            backgroundColor: "#FFFFFF",
            color: "#5C5040",
            cursor: "pointer",
            transition: "background-color 150ms",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#FAF7F0"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#FFFFFF"; }}
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 500,
            border: "none",
            borderRadius: 6,
            backgroundColor: destructive ? "#963D0E" : "#C85A1A",
            color: "#FDF0E8",
            cursor: "pointer",
            transition: "background-color 150ms",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = destructive ? "#7A3008" : "#A84E16"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = destructive ? "#963D0E" : "#C85A1A"; }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

interface ProgressModalProps {
  isOpen: boolean;
  title: string;
  steps?: { name: string; status: "pending" | "running" | "done" | "failed"; detail?: string }[];
  detail?: string;
  onClose?: () => void;
  closable?: boolean;
}

export function ProgressModal({
  isOpen,
  title,
  steps,
  detail,
  onClose,
  closable = false,
}: ProgressModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} closable={closable}>
      <div style={{ padding: "24px 24px 20px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#2C2418", margin: "0 0 4px" }}>
          {title}
        </h3>
        {detail && (
          <p style={{ fontSize: 12, color: "#C85A1A", margin: "0 0 12px", fontStyle: "italic" }}>
            {detail}
          </p>
        )}
        {steps && steps.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {steps.map((step) => (
              <div key={step.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 14, textAlign: "center", fontSize: 12 }}>
                  {step.status === "done" && <span style={{ color: "#7A9E68" }}>✓</span>}
                  {step.status === "running" && <span style={{ color: "#D4A827", animation: "pulse 1.5s infinite" }}>●</span>}
                  {step.status === "failed" && <span style={{ color: "#C85A1A" }}>✗</span>}
                  {step.status === "pending" && <span style={{ color: "#B0A090" }}>○</span>}
                </span>
                <span style={{
                  fontSize: 12,
                  flex: 1,
                  color: step.status === "running" ? "#2C2418" : "#8A7860",
                  fontWeight: step.status === "running" ? 500 : 400,
                }}>
                  {step.name}
                </span>
                {step.detail && (
                  <span style={{ fontSize: 11, color: "#B0A090" }}>{step.detail}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {closable && onClose && (
        <div style={{ padding: "0 24px 20px", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              border: "1px solid #DDD5C0",
              borderRadius: 6,
              backgroundColor: "#FFFFFF",
              color: "#5C5040",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      )}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
    </Modal>
  );
}
