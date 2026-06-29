import { useContext } from "react";
import { GlobalWebSocketContext } from "../../providers/GlobalWebSocketProvider";
import { PokerCardImage } from "../../assets/card1/index";

interface JackpotModalProps {
  onClose: () => void;
}

const RULES = [
  {
    rank: "Роял Флаш",
    sub: "Royal Flush",
    percentage: 100,
    cards: [
      PokerCardImage.SPADES.ACE,
      PokerCardImage.SPADES.KING,
      PokerCardImage.SPADES.QUEEN,
      PokerCardImage.SPADES.JACK,
      PokerCardImage.SPADES.TEN,
    ],
  },
  {
    rank: "Стрейт Флаш",
    sub: "Straight Flush",
    percentage: 50,
    cards: [
      PokerCardImage.HEARTS.NINE,
      PokerCardImage.HEARTS.EIGHT,
      PokerCardImage.HEARTS.SEVEN,
      PokerCardImage.HEARTS.SIX,
      PokerCardImage.HEARTS.FIVE,
    ],
  },
  {
    rank: "Покер",
    sub: "Four of a Kind",
    percentage: 20,
    cards: [
      PokerCardImage.SPADES.ACE,
      PokerCardImage.HEARTS.ACE,
      PokerCardImage.DIAMONDS.ACE,
      PokerCardImage.CLUBS.ACE,
      PokerCardImage.SPADES.KING,
    ],
  },
];

export default function JackpotModal({ onClose }: JackpotModalProps) {
  const { jackpotAmount } = useContext(GlobalWebSocketContext);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="jp-overlay" onClick={onClose}>
      <div className="jp-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="jp-header">
          <button className="jp-close-btn" onClick={onClose} aria-label="Close">✕</button>
          <div className="jp-header-label">Монте Карло</div>
          <div className="jp-header-title">ЖЕКПОТ</div>
          <div className="jp-header-amount">{fmt(jackpotAmount)}</div>
          <div className="jp-header-glow" />
        </div>

        {/* ── BODY ── */}
        <div className="jp-body">
          <p className="jp-section-label">Ялалтын хослолууд</p>

          <div className="jp-rules">
            {RULES.map((rule) => {
              const prize = jackpotAmount * (rule.percentage / 100);
              return (
                <div className="jp-rule" key={rule.rank}>
                  <div className="jp-rule-left">
                    <div className="jp-pct-badge">{rule.percentage}%</div>
                    <div className="jp-rule-text">
                      <span className="jp-rule-name">{rule.rank}</span>
                      <span className="jp-rule-sub">{rule.sub}</span>
                    </div>
                  </div>

                  <div className="jp-hand">
                    {rule.cards.map((src, i) => (
                      <img key={i} src={src} alt="" className="jp-card-img" />
                    ))}
                  </div>

                  <div className="jp-rule-prize">{fmt(prize)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="jp-footer">
          <button className="jp-ok-btn" onClick={onClose}>OK</button>
        </div>

      </div>
    </div>
  );
}
