import { useState } from "react";

interface ChatSettingsProps {
  closeModal: () => void;
}

function ChatSettings({ closeModal }: ChatSettingsProps) {
  const options = [
    { id: "1", label: "Дилерийн чат мессежийг идэвхгүй болгох" },
    { id: "2", label: "Бүх тоглогчдоос ирэх чатыг унтраах" },
    { id: "3", label: "Поп мессежүүдийг унтраах" },
  ];

  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>(options.reduce((acc, option) => ({ ...acc, [option.id]: false }), {}));

  const handleChange = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  return (
    <div className="settings-modal-tabs">
      <div className="modal-title">Чатын тохиргоо</div>
      <div className="checkbox-group">
        {options.map((option) => (
          <label key={option.id} className="checkbox-item">
            <input type="checkbox" checked={checkedItems[option.id]} onChange={() => handleChange(option.id)} />
            <span className="custom-checkbox" />
            <span className="checkbox-label">{option.label}</span>
          </label>
        ))}
      </div>
      <div className="desktop-settings-button-group">
        <div className="btn">
          <div className="btn-gradient"> Тохиргоо дахин эхлүүлэх </div>
        </div>
        <div className="btn">
          <div className="btn-gradient" onClick={closeModal}>
            {" "}
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

export default ChatSettings;
