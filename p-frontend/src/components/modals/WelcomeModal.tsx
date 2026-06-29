type Props = {
  open: boolean;
  onClose: () => void;
};

const WelcomeModal: React.FC<Props> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content welcome-modal">
        <div className="welcome-modal-img" />
        <div className="welcome-close-btn" onClick={onClose}>
          Хаах
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
