import CustomModal from "./CustomModal";

interface InfoInterface {
  isModalVisible: boolean;
  closeModal: () => void;
}

function InfoModal({ isModalVisible, closeModal }: InfoInterface) {
  return (
    <CustomModal open={isModalVisible} onClose={closeModal} titleArea="Мэдээлэл">
      <div className="info-modal-wrapper">
        <div className="info-modal-logo" />
        <div className="info-modal-header">Хувилбар 25.10.1.hd255d13-pe2fda50-b9e43486</div>
        <div className="info-modal-copyright">Зохиогчийн эрх © 2026 E5A покер сервер. Бүх эрхийг хуулиар хамгаалсан.</div>
        <div className="info-modal-aboutContainer">
          <span>Хөгжүүлсэн</span>
          <a href="">Poker-Server.com</a>
        </div>
        <div className="info-modal-feedback">Help & Feedback</div>
        <div className="info-modal-aboutContainer">
          <span>Тусламжийн асуулгыг илгээнэ үү</span>
          <a href="">support@qgames.biz</a>
        </div>
        <div className="info-modal-certificates">Help & Feedback</div>
        <div className="info-modal-emoji">
          <a href="">Хөдөлгөөнтэй Эможи</a>
          <span> дагуу лицензтэй</span>
          <a href=""> CC BY 4.0</a>
        </div>
        <div className="info-modal-yes-btn" onClick={closeModal}>
          Тийм
        </div>
      </div>
    </CustomModal>
  );
}

export default InfoModal;
