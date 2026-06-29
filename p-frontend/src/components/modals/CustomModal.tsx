import React from "react";

interface CustomModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  titleArea: string;
}

export default function CustomModal({ open, onClose, children, titleArea }: CustomModalProps) {
  if (!open) return null;

  return (
    <div className="custom-modal-overlay" onClick={onClose}>
      <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="utf-header">
          <div className="utf-header-icon logo"></div>
          <div className="utf-header-name">{titleArea}</div>
          <div className="utf-header-icon close" onClick={onClose}></div>
        </div>{" "}
        {children}
      </div>
    </div>
  );
}
