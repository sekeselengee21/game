import { useState } from "react";
import DesktopSettings from "./tabItems/DesktopSettings";
import SoundSettings from "./tabItems/SoundSettings";

interface SettingsInterface {
  isModalVisible: boolean;
  closeModal: () => void;
  isAuthenticated: boolean;
}

function SettingsModal({ closeModal }: SettingsInterface) {
  const [activeTab, setActiveTab] = useState<"Ширээний тохиргоо" | "Дууны тохиргоо">("Ширээний тохиргоо");

  return (
    <div className="ufm-bottom-sheet">
      <div className="utf-header">
        <div className="utf-header-icon logo"></div>
        <div className="utf-header-name">Тохиргоо</div>
        <div className="utf-header-icon close" onClick={closeModal}></div>
      </div>
      <div className="bottom-wrapper">
        <div className="ufm-tabs">
          <div className={`ufm-tab ${activeTab === "Ширээний тохиргоо" ? "active" : ""}`} onClick={() => setActiveTab("Ширээний тохиргоо")}>
            Ширээний тохиргоо
          </div>
          <div className={`ufm-tab ${activeTab === "Дууны тохиргоо" ? "active" : ""}`} onClick={() => setActiveTab("Дууны тохиргоо")}>
            Дууны тохиргоо
          </div>
        </div>

        <div className="ufm-content-anim">
          {activeTab === "Ширээний тохиргоо" && <DesktopSettings closeModal={closeModal} />}
          {activeTab === "Дууны тохиргоо" && <SoundSettings closeModal={closeModal} />}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
