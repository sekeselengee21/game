import React from "react";
import CustomModal from "../../components/modals/CustomModal";

interface PlayersModalProps {
  seats: any[];
  isAdmin: boolean;
  onKick: (uid: number) => void;
  onClose: () => void;
}

const PlayerItem = ({ seat, isAdmin, onKick }: { seat: any; isAdmin: boolean; onKick: (uid: number) => void }) => (
  <div className="playersmodal-row">
    <span className="playersmodal-name">{seat.user.username}</span>
    <span className="playersmodal-balance">{seat.stack?.toLocaleString() ?? 0}</span>
    {isAdmin && (
      <button className="playersmodal-kickbtn" onClick={() => onKick(seat.user.userId)}>
        Босгох
      </button>
    )}
  </div>
);

const PlayersModal: React.FC<PlayersModalProps> = ({ seats, isAdmin, onKick, onClose }) => {
  return (
    <CustomModal open={true} onClose={onClose} titleArea="Тоглогчид">
      <div className="player-modal-wrapper">
        {!seats.length ? (
          <p className="playersmodal-empty">Ширээнд суусан тоглогч байхгүй байна.</p>
        ) : (
          <div className="playersmodal-table">
            <div className="playersmodal-header">
              <span className="header-name">Тоглогч</span>
              <span className="header-balance">Баланс</span>
              {isAdmin && <span className="header-action">Үйлдэл</span>}
            </div>

            <div className="playersmodal-rows">
              {seats.map((s) => {
                return <PlayerItem key={s.user.userId} seat={s} isAdmin={isAdmin} onKick={onKick} />;
              })}
            </div>
          </div>
        )}
      </div>
    </CustomModal>
  );
};

export default PlayersModal;
