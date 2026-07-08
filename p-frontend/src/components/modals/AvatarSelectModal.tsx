import React, { useState } from "react";
import avatar1 from "../../assets/image/avatar/6820.png";
import avatar2 from "../../assets/image/avatar/6821.png";
import avatar3 from "../../assets/image/avatar/6825.png";
import avatar6 from "../../assets/image/avatar/6838.png";
import avatar5 from "../../assets/image/avatar/6834.png";
import avatar7 from "../../assets/image/avatar/6836.png";
import avatar8 from "../../assets/image/avatar/6837.png";

interface AvatarSelectModalProps {
  currentAvatar: string | null;
  onClose: () => void;
  isModalVisible: boolean;
  isAuthenticated: boolean;
  onSave: (data: { avatar: string | null }) => void;
}

const avatarOptions = [avatar1, avatar2, avatar3, avatar5, avatar6, avatar7, avatar8];
const AvatarSelectModal: React.FC<AvatarSelectModalProps> = ({ currentAvatar, onClose, isModalVisible, onSave }) => {
  const [avatar, setAvatar] = useState<string | null>(currentAvatar);
  const [activeTab, setActiveTab] = useState<"Тогтсон" | "Тохируулах" | "Миний аватар">("Тогтсон");
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("Зургаа чирээд оруулна уу эсвэл Ctrl+V дарна уу.");

  if (!isModalVisible) return null;

  const tabs = ["Тогтсон", "Тохируулах", "Миний аватар"] as const;
  const setUploadedAvatar = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadMessage("Зөвхөн зураг файл оруулна уу.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") {
        setAvatar(ev.target.result);
        setUploadMessage("Зураг бэлэн боллоо. Хадгалах дарна уу.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    setUploadedAvatar(e.dataTransfer.files?.[0]);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const imageFile =
      e.clipboardData.files?.[0] ??
      Array.from(e.clipboardData.items)
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();

    if (!imageFile) return;
    e.preventDefault();
    setUploadedAvatar(imageFile);
  };

  const pasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) {
        setUploadMessage("Энэ browser clipboard image уншихгүй байна. Зургаа copy хийгээд Ctrl+V дарна уу.");
        return;
      }

      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;

        const blob = await item.getType(imageType);
        setUploadedAvatar(new File([blob], "avatar", { type: imageType }));
        return;
      }

      setUploadMessage("Clipboard дотор зураг алга байна.");
    } catch {
      setUploadMessage("Clipboard зөвшөөрөл хаагдлаа. Зургаа copy хийгээд энэ хэсэг дээр Ctrl+V дарна уу.");
    }
  };

  return (
    <div className="avatar-modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="utf-header">
        <div className="utf-header-icon logo"></div>
        <div className="utf-header-name">Аватар солих</div>
        <div className="utf-header-icon close" onClick={onClose}></div>
      </div>

      <div className="bottom-wrapper">
        <div className="ufm-tabs">
          {tabs.map((tab) => (
            <div key={tab} className={`ufm-tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
              {tab}
            </div>
          ))}
        </div>

        <div className="ufm-content-anim">
          {activeTab === "Тогтсон" && (
            <div className="avatar-tab-content">
              <div className="avatar-select-grid">
                {avatarOptions.map((img) => (
                  <img
                    key={img}
                    src={img}
                    alt="Avatar Option"
                    className={`avatar-option ${avatar === img ? "active" : ""}`}
                    onClick={() => setAvatar(img)}
                    loading="lazy"
                  />
                ))}
              </div>

              <button onClick={() => onSave({ avatar })} className="avatar-select-save" disabled={avatar === currentAvatar}>
                Хадгалах
              </button>
            </div>
          )}
          {activeTab === "Тохируулах" && (
            <div
              className={`avatar-upload-wrapper ${isDragActive ? "drag-active" : ""}`}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragActive(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={handleDrop}
              onPaste={handlePaste}
              tabIndex={0}
            >
              {avatar && (
                <div className="avatar-upload-preview">
                  <img src={avatar} alt="Uploaded Avatar" className="avatar-preview-img" />
                </div>
              )}

              <button type="button" className="avatar-upload-button" onClick={pasteFromClipboard}>
                Paste image
              </button>
              <div className="avatar-upload-hint">{uploadMessage}</div>

              <button onClick={() => onSave({ avatar })} className="avatar-select-save" disabled={avatar === currentAvatar}>
                Хадгалах
              </button>
            </div>
          )}
          {activeTab === "Миний аватар" && (
            <div className="avatar-upload-wrapper">
              {avatar && (
                <div className="avatar-upload-preview">
                  <img src={avatar} alt="Uploaded Avatar" className="avatar-preview-img" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarSelectModal;
