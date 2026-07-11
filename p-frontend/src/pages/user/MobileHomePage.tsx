import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import heroBg from "../../assets/image/header.png";
import bonusBg from "../../assets/image/icons/cash_animation.webp";
import gif2 from "../../assets/image/gifs/telegram-join.gif";

interface MobileHomePageProps {
  handleNavigateToTables: () => void;
  handleNavigateToCashier?: () => void;
}

const MobileHomePage = ({ handleNavigateToTables, handleNavigateToCashier }: MobileHomePageProps) => {
  const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);
  const userBalance = useSelector((state: any) => state.auth.userBalance);
  const [gifSrc, setGifSrc] = useState(gif2);

  useEffect(() => {
    const timer = setInterval(() => setGifSrc(`${gif2}?t=${Date.now()}`), 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mhp-container">
      {/* ── HERO ── */}
      <div className="mhp-hero" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="mhp-hero-overlay" />
        <div className="mhp-hero-content">
          .
          <div className="contact-admin">
            {/* <a href="https://t.me/fdvmkkkhgvxsgbb" target="_blank" rel="noopener noreferrer"> */}
            <a href="https://t.me/+rDrM6id7dllhM2Q1" target="_blank" rel="noopener noreferrer">
              <img src={gifSrc} alt="admin-gif-1" className="slide-gif" />
            </a>
          </div>
          <div className="mhp-hero-eyebrow">
            <span className="mhp-live-dot" />
            <span className="mhp-live-label">LIVE</span>
          </div>
          <h1 className="mhp-brand-title">
            APEX
            <br />
            POKER
          </h1>
          <p className="mhp-brand-tagline">Хаана ч, хэзээ ч тоглоорой</p>
          {isAuthenticated ? (
            <div className="mhp-balance-strip">
              <span className="mhp-balance-label">Үлдэгдэл</span>
              <span className="mhp-balance-value">
                {(userBalance ?? 0).toLocaleString("mn-MN")}
                <span className="mhp-balance-currency"> ₮</span>
              </span>
              <button className="mhp-cashier-btn" onClick={handleNavigateToCashier}>
                Касс
              </button>
            </div>
          ) : (
            <div className="mhp-hero-actions">
              <div className="mhp-hero-cta-glow" />
              <span className="mhp-hero-cta-hint">Нэвтрэн тоглоорой</span>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION LABEL ── */}
      <div className="mhp-section-label">
        <span>ТОГЛООМЫН ГОРИМ</span>
        <div className="mhp-label-line" />
      </div>

      {/* ── GAME CARDS ── */}
      <div className="mhp-games">
        {/* Cash Tables */}
        <div className="mhp-game-card mhp-card-featured" onClick={handleNavigateToTables}>
          <div className="mhp-card-glow" />
          <div className="mhp-game-icon-wrap">
            <div className="mhp-game-icon cash-icon" />
          </div>
          <div className="mhp-game-info">
            <span className="mhp-game-name">Ширээнүүд</span>
            <span className="mhp-game-sub">Cash Games</span>
          </div>
          <div className="mhp-live-badge">LIVE</div>
          <div className="mhp-chevron" />
        </div>

        {/* Tournaments */}
        <div className="mhp-game-card">
          <div className="mhp-game-icon-wrap">
            <div className="mhp-game-icon tourney-icon" />
          </div>
          <div className="mhp-game-info">
            <span className="mhp-game-name">Тэмцээнүүд</span>
            <span className="mhp-game-sub">Tournaments</span>
          </div>
          <div className="mhp-coming-badge">УДАХГҮЙ</div>
          <div className="mhp-chevron" />
        </div>

        {/* Sit & Go */}
        <div className="mhp-game-card">
          <div className="mhp-game-icon-wrap mhp-icon-sitgo">
            <span className="mhp-sitgo-label">S&G</span>
          </div>
          <div className="mhp-game-info">
            <span className="mhp-game-name">Sit &amp; Go</span>
            <span className="mhp-game-sub">Хурдан тоглоом</span>
          </div>
          <div className="mhp-coming-badge">УДАХГҮЙ</div>
          <div className="mhp-chevron" />
        </div>
      </div>

      {/* ── PROMO BANNER ── */}
      <div className="mhp-promo" style={{ backgroundImage: `url(${bonusBg})` }}>
        <div className="mhp-promo-overlay" />
        <div className="mhp-promo-inner">
          <span className="mhp-promo-tag">ОНЦГОЙ САНАЛ</span>
          <h3 className="mhp-promo-title">Шинэ тоглогчдод</h3>
          <p className="mhp-promo-desc">Эхний оролтоос бонус авах боломж</p>
          {isAuthenticated && (
            <button className="mhp-promo-btn" onClick={handleNavigateToCashier}>
              Касс руу →
            </button>
          )}
        </div>
        <div className="mhp-promo-chip" />
      </div>

      <div className="mhp-bottom-spacer" />
    </div>
  );
};

export default MobileHomePage;
