import { useState, useRef } from "react";
import CustomSelect from "../../CustomSelect";

interface SystemSettingsProps {
  closeModal: () => void;
}

function SystemSettings({ closeModal }: SystemSettingsProps) {
  const [language, setLanguage] = useState<"en" | "mn">("mn");
  const dropdownRef = useRef<HTMLFieldSetElement>(null);

  return (
    <div className="settings-modal-tabs">
      <div className="modal-title">Системийн тохиргоо</div>
      <fieldset className="language-field" ref={dropdownRef}>
        <CustomSelect
          value={language}
          onChange={setLanguage}
          options={[
            { label: "Монгол", value: "mn" },
            { label: "English", value: "en" },
          ]}
          placeholder="Хэл сонгох"
          label="Программын хэл"
        />
      </fieldset>
      <div className="desktop-settings-button-group">
        <div className="btn">
          <div className="btn-gradient"> Тохиргоо дахин эхлүүлэх </div>
        </div>
        <div className="btn">
          <div className="btn-gradient" onClick={closeModal}>
            Цуцлах
          </div>
        </div>
        <div className="btn">
          <div className="btn-gradient"> Хадгалах </div>
        </div>
      </div>
    </div>
  );
}

export default SystemSettings;
