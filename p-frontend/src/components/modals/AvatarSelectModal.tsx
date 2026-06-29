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

  if (!isModalVisible) return null;

  const tabs = ["Тогтсон", "Тохируулах", "Миний аватар"] as const;

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
            <div className="avatar-upload-wrapper">
              {avatar && (
                <div className="avatar-upload-preview">
                  <img src={avatar} alt="Uploaded Avatar" className="avatar-preview-img" />
                </div>
              )}
              <input
                type="file"
                id="avatarUpload"
                accept="image/*"
                className="avatar-upload-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setAvatar(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />

              <label htmlFor="avatarUpload" className="avatar-upload-button">
                Browse
              </label>

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
