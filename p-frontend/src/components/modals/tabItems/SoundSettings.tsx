import { useState } from "react";
import { setMuted, isMuted, setVolume, getVolume } from "../../../utils/sounds";

interface SoundSettingsProps {
  closeModal: () => void;
}

function SoundSettings({ closeModal }: SoundSettingsProps) {
  const [soundOn, setSoundOn] = useState(() => !isMuted());
  const [volume, setVolumeState] = useState(() => Math.round(getVolume() * 100));

  const handleToggle = () => {
    const next = !soundOn;
    setSoundOn(next);
    setMuted(!next);
  };

  const handleVolume = (v: number) => {
    setVolumeState(v);
    setVolume(v / 100);
  };

  return (
    <div className="settings-modal-tabs">
      <div className="modal-title">Дууны тохиргоо</div>

      <div className="sound-slide-box">
        <label className="checkbox-item">
          <input type="checkbox" checked={soundOn} onChange={handleToggle} />
          <span className="custom-checkbox" />
          <span className="checkbox-label">Дуугаралт</span>
        </label>

        <div className="volume-slider-container">
          <div className="volume-btn less" onClick={() => handleVolume(Math.max(0, volume - 5))} />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            disabled={!soundOn}
            className="volume-slider"
            onChange={(e) => handleVolume(Number(e.target.value))}
            style={{ "--volume-percent": `${volume}%` } as React.CSSProperties}
          />
          <div className="volume-btn plus" onClick={() => handleVolume(Math.min(100, volume + 5))} />
        </div>
      </div>

      <div className="desktop-settings-button-group">
        <div className="btn">
          <div className="btn-gradient" onClick={closeModal}>Цуцлах</div>
        </div>
        <div className="btn">
          <div className="btn-gradient" onClick={closeModal}>Хадгалах</div>
        </div>
      </div>
    </div>
  );
}

export default SoundSettings;
