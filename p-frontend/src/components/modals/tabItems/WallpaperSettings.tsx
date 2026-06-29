interface WallpaperSettingsProps {
  closeModal: () => void;
}

function WallpaperSettings({ closeModal }: WallpaperSettingsProps) {
  return (
    <div className="settings-modal-tabs">
      <div className="modal-title"> Ширээний дэвсгэр</div>
      <div className="wallpaper-main"></div>
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

export default WallpaperSettings;
