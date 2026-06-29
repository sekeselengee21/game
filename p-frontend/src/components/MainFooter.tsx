import { useState, useEffect } from "react";
import AdminChat from "./AdminChat";

export default function MainFooter() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [networkQuality, setNetworkQuality] = useState("good");

  const handleChatClick = () => {
    setIsChatOpen((prev) => !prev);
  };

  useEffect(() => {
    const qualities = ["good", "middle", "bad"];
    let i = 0;

    const interval = setInterval(() => {
      setNetworkQuality(qualities[i % qualities.length]);
      i++;
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="footer-bottom">
        <div className="footer-container">
          <div className="network-quality">
            <div className={`quality-icon ${networkQuality}`} />
            <p className="copyright">v 25.10.1.hd255d13-pe2fda50-b9e43486</p>
          </div>
          <div className="android-icon">
            <div className="icon-svg" />
          </div>
          <div className="footer-left">
            <div className="footer-item language-select">
              <div className="icon language-icon" />
              <span>Монгол</span>
            </div>

            <div className="footer-item active-tables">
              <div className="icon tables-icon"></div>
              <span>0</span>
            </div>

            <div className="footer-item lobby-chat" onClick={handleChatClick}>
              <div className="icon chat-icon"></div>
              <span>0</span>
            </div>
          </div>
        </div>
        <div className={`admin-chat-overlay ${isChatOpen ? "show" : ""}`} onClick={() => setIsChatOpen(false)}>
          <div className="admin-chat-wrapper" onClick={(e) => e.stopPropagation()}>
            <AdminChat onClose={() => setIsChatOpen(false)} />
          </div>
        </div>
      </div>
    </>
  );
}
