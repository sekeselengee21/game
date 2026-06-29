import { useDesktopSettings } from "../../context/DesktopSettingsContext";

interface DesktopSettingsProps {
  closeModal: () => void;
}

function DesktopSettings({ closeModal }: DesktopSettingsProps) {
  const { localSettings, setLocalSetting, saveSettings, resetLocalSettings } = useDesktopSettings();

  const options = [
    { id: "showCashInBB", label: "Стекийг BB-ээр харуулах" },
    { id: "highlightBestHand", label: "Хожсон хөзрийг тодруулах" },
    { id: "confirmCheckFold", label: "Хаяхаас өмнө баталгаажуулах" },
  ];

  return (
    <div className="settings-modal-tabs">
      <div className="modal-title">Ширээний тохиргоо</div>

      <div className="checkbox-group">
        {options.map((option) => (
          <label key={option.id} className="checkbox-item">
            <input
              type="checkbox"
              checked={!!localSettings[option.id]}
              onChange={(e) => setLocalSetting(option.id, e.target.checked)}
            />
            <span className="custom-checkbox" />
            <span className="checkbox-label">{option.label}</span>
          </label>
        ))}
      </div>

      <div className="desktop-settings-button-group">
        <div className="btn">
          <div className="btn-gradient" onClick={resetLocalSettings}>Тохиргоо дахин эхлүүлэх</div>
        </div>
        <div className="btn">
          <div className="btn-gradient" onClick={closeModal}>Цуцлах</div>
        </div>
        <div className="btn">
          <div className="btn-gradient" onClick={() => { saveSettings(); closeModal(); }}>Хадгалах</div>
        </div>
      </div>
    </div>
  );
}

export default DesktopSettings;
