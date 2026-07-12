import { useState, useEffect, lazy, Suspense, useContext } from "react";
import ConfirmFoldModal from "../../components/modals/ConfirmFoldModal";
import { useParams } from "react-router";
import { useSelector } from "react-redux";
import { GlobalWebSocketContext } from "../../providers/GlobalWebSocketProvider";

import { MdWallet, MdArrowUpward, MdSettings, MdHistory } from "react-icons/md";
import { FaUsers, FaHome, FaLayerGroup } from "react-icons/fa";
import { useMyTables } from "../../providers/MyTablesProvider";
import { useKickPlayerMutation } from "../../api/admin";
import { useMeQuery } from "../../api/user";
import type { GameState } from "../../types/gameTypes";
import type { RootState } from "../../app/store";
import { PokerCardImage } from "../../assets/card";
import type { GameCard } from "../../api/game";

const PlayersModal = lazy(() => import("../../components/modals/PlayersModal"));
const SettingsModal = lazy(() => import("../../components/modals/SettingsModal"));
const InfoModal = lazy(() => import("../../components/modals/InfoModal"));
const HandHistoryList = lazy(() => import("../../components/modals/HandHistoryList"));
const JackpotModal = lazy(() => import("../../components/modals/JackpotModal"));

import { useFetchHandHistoryQuery } from "../../api/tablesApi";
import { type HandHistory } from "../../api/game";
import JackpotText from "../../components/JackpotText";

import { toggleMute, isMuted } from "../../utils/sounds";
import { useIsMobile } from "../../hooks/useIsMobile";
import type { NavigateFunction } from "react-router-dom";

type ModalType = "PLAYERS" | "CONFIRM_LEAVE" | "SETTINGS" | "INFO" | "HISTORY" | "JACKPOT" | null;

interface ModalState {
  type: ModalType;
  props?: Record<string, unknown>;
}

interface DesktopTableActionButtonsProps {
  navigate: NavigateFunction;
  gameState: GameState;
  tableId: string;
  userHasSeat: boolean;
  setModalType: (type: string) => void;
  leaveSeat: (seat: number) => void;
  userSeatIndex: number;
  setShowHistory: (open: boolean) => void;
}

export default function DesktopTableActionButtons({
  navigate,
  gameState,
  tableId,
  userHasSeat,
  setModalType,
  leaveSeat,
  userSeatIndex,
}: DesktopTableActionButtonsProps) {
  const { jackpotAmount } = useContext(GlobalWebSocketContext);
  const jackpotFormatted = jackpotAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [modalState, setModalState] = useState<ModalState>({ type: null });
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [rightExpanded, setRightExpanded] = useState(false);

  const [kickPlayer] = useKickPlayerMutation();
  const token = localStorage.getItem("accessToken");
  const { data: me } = useMeQuery(undefined, { skip: !token });
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const { myTables, removeTable, tableCards, setTableCards, openSheet } = useMyTables();
  // Use the URL secureId directly so the active tab updates immediately on switch,
  // even before addTable() has had a chance to run.
  const params = useParams();
  const currentSecureId = params.id ?? "";

  // Sync current player's hole cards into shared context so other tabs can display them.
  // Only write when the gameState belongs to the URL's table (tableId prop matches a
  // myTables entry whose secureId equals the URL secureId) — otherwise we'd briefly
  // smear the previous table's cards onto the new tab during a route transition.
  const myGameSeat = gameState.seats?.find((s) => s?.user?.userId === me?.userId);
  const myHoleCardsJson = JSON.stringify(myGameSeat?.holeCards ?? []);
  const gameStateMatchesUrl = !!currentSecureId && myTables.some((t) => t.secureId === currentSecureId && String(t.tableId) === tableId);
  const isHandOver = gameState.state === "FINISHED" || gameState.state === "WAITING_FOR_PLAYERS";
  useEffect(() => {
    if (!currentSecureId || !gameStateMatchesUrl) return;
    // Once the hand is over the previous hand's hole cards still sit on the
    // seat (so the showdown reveal can keep them visible). Don't carry that
    // into the tab — clear it until the next hand deals new cards.
    if (isHandOver) {
      setTableCards(currentSecureId, []);
      return;
    }
    setTableCards(currentSecureId, JSON.parse(myHoleCardsJson));
  }, [currentSecureId, gameStateMatchesUrl, myHoleCardsJson, isHandOver, setTableCards]);
  // const mySeat = gameState.seats?.find((s) => s?.user?.userId === me?.userId);
  // const myStack = mySeat?.stack ?? 0;
  const isAdmin = me?.role === "ADMIN";
  const seats = gameState.seats?.filter((s) => s?.user) || [];
  const [allHands, setAllHands] = useState<HandHistory[]>([]);
  const [offset, setOffset] = useState(0);
  const limit = 10;
  const isMobile = useIsMobile();

  const [, forceSoundUpdate] = useState(0);

  const onToggleSound = () => {
    toggleMute();
    forceSoundUpdate((n) => n + 1);
  };

  const {
    data: fetchedHands = [],
    isLoading,
    isFetching,
  } = useFetchHandHistoryQuery({ tableId: Number(tableId), limit, offset }, { skip: modalState.type !== "HISTORY" });

  useEffect(() => {
    if (fetchedHands.length > 0) {
      setAllHands((prev) => [...prev, ...fetchedHands]);
    }
  }, [fetchedHands]);

  const openHistoryModal = () => {
    setAllHands([]);
    setOffset(0);
    openModal("HISTORY");
  };

  const loadMoreHands = () => setOffset((prev) => prev + limit);

  const openModal = (type: ModalType, props?: Record<string, unknown>) => setModalState({ type, props });
  const closeModal = () => setModalState({ type: null });

  const leaveSeatModal = () => {
    if (userHasSeat) openModal("CONFIRM_LEAVE", { leaveType: "LEAVE_SEAT" });
    else leaveSeat(userSeatIndex);
  };

  const navigateAfterLeave = () => {
    if (!currentSecureId) {
      navigate("/");
      return;
    }
    const remaining = myTables.filter((t) => t.secureId !== currentSecureId);
    removeTable(currentSecureId);
    if (remaining.length === 0) {
      navigate("/");
    } else {
      const currentIdx = myTables.findIndex((t) => t.secureId === currentSecureId);
      const target = remaining[Math.max(0, currentIdx - 1)] ?? remaining[0];
      navigate(`/table/${target.secureId}`, { state: { table: target } });
    }
  };

  const leaveAndGoHome = () => {
    if (userHasSeat) {
      openModal("CONFIRM_LEAVE", { leaveType: "GO_HOME" });
      return;
    }
    navigateAfterLeave();
  };

  const confirmLeave = () => {
    if (modalState.props?.leaveType === "LEAVE_SEAT") leaveSeat(userSeatIndex);
    else if (modalState.props?.leaveType === "GO_HOME") {
      if (userHasSeat) leaveSeat(userSeatIndex);
      navigateAfterLeave();
    }
    closeModal();
  };

  const doKick = (uid: number) => kickPlayer({ tableId: Number(tableId), userId: uid });

  const openMenu = () => {
    setShouldRender(true);
    requestAnimationFrame(() => setIsVisible(true));
  };
  const closeMenu = () => {
    setIsVisible(false);
    setTimeout(() => setShouldRender(false), 320);
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const renderTabCards = (secureId: string) => {
    const cards = tableCards[secureId] ?? [];
    const src = (c?: GameCard) => (c && !c.secret && c.suit && c.rank ? PokerCardImage[c.suit][c.rank] : null);
    const visible = cards.map((c, i) => ({ c, i, url: src(c) })).filter((x) => x.url);
    if (visible.length === 0) return <div className="tts-tab-cards" />;
    return (
      <div className={`tts-tab-cards count-${visible.length}`}>
        {visible.map((x) => (
          <img key={x.i} className={`tts-card tts-card-${x.i}`} src={x.url!} alt="" />
        ))}
      </div>
    );
  };

  // const renderTabLabel = (t: { tableName?: string; smallBlind?: number; bigBlind?: number }) => {
  //   const name = t.tableName?.trim();
  //   if (name) return name.length > 14 ? `${name.slice(0, 13)}…` : name;
  //   if (t.smallBlind && t.bigBlind) return `${t.smallBlind}/${t.bigBlind}`;
  //   return "Ширээ";
  // };

  return (
    <div className="desktop-table-action-wrapper">
      {shouldRender && (
        <div className="mobile-menu-modal-overlay" onClick={closeMenu}>
          <div className={`mobile-menu-modal-content ${isVisible ? "slide-in" : ""}`} onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-close-btn" onClick={closeMenu} />

            <div className="mobile-menu-buttons-grid">
              {isAdmin && (
                <button
                  className="mobile-menu-modal-btn players-btn"
                  onClick={() => {
                    openModal("PLAYERS");
                    closeMenu();
                  }}
                >
                  <FaUsers className="icon" />
                  <span>Тоглогчид</span>
                </button>
              )}

              {userHasSeat && (
                <button
                  className="mobile-menu-modal-btn recharge-btn"
                  onClick={() => {
                    setModalType("RECHARGE");
                    closeMenu();
                  }}
                >
                  <MdWallet className="icon" />
                  <span>Цэнэглэх</span>
                </button>
              )}
              <button
                className="mobile-menu-modal-btn settings-btn"
                onClick={() => {
                  openModal("SETTINGS");
                  closeMenu();
                }}
              >
                <MdSettings className="icon" />
                <span>Тохиргоо</span>
              </button>

              {userHasSeat && (
                <button
                  className="mobile-menu-modal-btn sitout-btn"
                  onClick={() => {
                    leaveSeatModal();
                    closeMenu();
                  }}
                >
                  <MdArrowUpward className="icon" />
                  <span>Босох</span>
                </button>
              )}

              <button className="mobile-menu-modal-btn home-btn" onClick={leaveAndGoHome}>
                <FaHome className="icon" />
                <span>Тоглоомыг орхих</span>
              </button>

              {myTables.length > 0 && (
                <button
                  className="mobile-menu-modal-btn mytables-btn"
                  onClick={() => {
                    openSheet();
                    closeMenu();
                  }}
                >
                  <FaLayerGroup className="icon" />
                  <span>Миний ширээ ({myTables.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isMobile ? (
        <div className="mobile-buttons-container">
          {/* ── LEFT: tabs only (no menu button) ── */}
          <div className="mobile-btn-left">
            {myTables.length > 0 && (
              <div className="inline-tts-tabs">
                {myTables.map((t) => {
                  const isActive = t.secureId === currentSecureId;
                  return (
                    <button
                      key={t.secureId}
                      className={`tts-tab ${isActive ? "tts-tab--active" : ""}`}
                      title={t.tableName}
                      onClick={() => {
                        if (!isActive) navigate(`/table/${t.secureId}`, { state: { table: t } });
                      }}
                    >
                      {renderTabCards(t.secureId)}
                    </button>
                  );
                })}
              </div>
            )}
            <button className="inline-tts-add" onClick={() => navigate("/")}>+</button>
          </div>

          {/* ── RIGHT: fullscreen + network + expand toggle ── */}
          <div className="mobile-btn-right-col">
            <div className="mobile-btn-right">
              <button className="desktop-action-btn fullscreen" data-name="Бүтэн дэлгэц" onClick={toggleFullscreen}>
                <div className="icon fullscreen" />
              </button>
              <div className="desktop-network-quality" />
              <button
                className={`desktop-action-btn mobile-expand-btn ${rightExpanded ? "active" : ""}`}
                onClick={() => setRightExpanded((p) => !p)}
              >
                <span className="mobile-expand-dots">{rightExpanded ? "✕" : "···"}</span>
              </button>
            </div>

            {/* Jackpot always visible below buttons */}
            <button className="mobile-jackpot-badge" onClick={() => openModal("JACKPOT")}>
              <span className="mobile-jackpot-label">BAD BEAT JACKPOT</span>
              <span className="mobile-jackpot-amount">{jackpotFormatted}</span>
            </button>

            {/* Expanded panel — all actions */}
            {rightExpanded && (
              <div className="mobile-action-panel">
                <button className="mobile-panel-row" onClick={() => { onToggleSound(); setRightExpanded(false); }}>
                  <div className={`icon mute mobile-panel-icon-css ${isMuted() ? "muted" : ""}`} />
                  <span>{isMuted() ? "Дуу асаах" : "Дуу унтраах"}</span>
                </button>

                {userHasSeat && (
                  <button className="mobile-panel-row" onClick={() => { setModalType("RECHARGE"); setRightExpanded(false); }}>
                    <MdWallet className="mobile-panel-icon" />
                    <span>Цэнэглэх</span>
                  </button>
                )}

                {userHasSeat && (
                  <button className="mobile-panel-row" onClick={() => { leaveSeatModal(); setRightExpanded(false); }}>
                    <MdArrowUpward className="mobile-panel-icon" />
                    <span>Босох</span>
                  </button>
                )}

                <button className="mobile-panel-row" onClick={() => { openModal("SETTINGS"); setRightExpanded(false); }}>
                  <MdSettings className="mobile-panel-icon" />
                  <span>Тохиргоо</span>
                </button>

                <button className="mobile-panel-row" onClick={() => { openHistoryModal(); setRightExpanded(false); }}>
                  <MdHistory className="mobile-panel-icon" />
                  <span>Түүх</span>
                </button>

                {isAdmin && (
                  <button className="mobile-panel-row" onClick={() => { openModal("PLAYERS"); setRightExpanded(false); }}>
                    <FaUsers className="mobile-panel-icon" />
                    <span>Тоглогчид</span>
                  </button>
                )}

                {myTables.length > 0 && (
                  <button className="mobile-panel-row" onClick={() => { openSheet(); setRightExpanded(false); }}>
                    <FaLayerGroup className="mobile-panel-icon" />
                    <span>Миний ширээ ({myTables.length})</span>
                  </button>
                )}

                <div className="mobile-panel-divider" />

                <button className="mobile-panel-row mobile-panel-row--danger" onClick={() => { leaveAndGoHome(); setRightExpanded(false); }}>
                  <FaHome className="mobile-panel-icon" />
                  <span>Тоглоомыг орхих</span>
                </button>
              </div>
            )}
          </div>

          {rightExpanded && (
            <div className="mobile-panel-overlay" onClick={() => setRightExpanded(false)} />
          )}
        </div>
      ) : (
        <div className={`desktop-menu-buttons-wrapper ${isVisible ? "visible" : "hidden"}`}>
          <button className="desktop-action-btn menu" data-name="Цэс" onClick={openMenu}>
            <div className="icon menu" />
          </button>
          <button className="desktop-action-btn" data-name="Гарах" onClick={leaveAndGoHome}>
            <div className="icon leave" />
          </button>
          {userHasSeat && (
            <button className="desktop-action-btn" data-name="Босох" onClick={leaveSeatModal}>
              <div className="icon stand" />
            </button>
          )}
          <button className="desktop-action-btn" data-name="Цэс">
            <div className="icon history" onClick={openHistoryModal} />
          </button>

          {isAdmin && (
            <button className="desktop-action-btn" data-name="Тоглогчид" onClick={() => openModal("PLAYERS")}>
              <div className="icon players" />
            </button>
          )}

          <button className="desktop-action-btn" data-name="Дуу" onClick={onToggleSound}>
            <div className={`icon mute ${isMuted() ? "muted" : ""}`} />
          </button>

          {myTables.length > 0 && (
            <div className="inline-tts-tabs">
              {myTables.map((t) => {
                const isActive = t.secureId === currentSecureId;
                return (
                  <button
                    key={t.secureId}
                    className={`tts-tab ${isActive ? "tts-tab--active" : ""}`}
                    title={t.tableName}
                    onClick={() => {
                      if (!isActive) navigate(`/table/${t.secureId}`, { state: { table: t } });
                    }}
                  >
                    {renderTabCards(t.secureId)}
                    {/* <span className="tts-tab-label">{renderTabLabel(t)}</span> */}
                  </button>
                );
              })}
            </div>
          )}
          <button className="inline-tts-add" title="Шинэ ширээ нэмэх" onClick={() => navigate("/")}>
            +
          </button>

          <div className="jackpot-box-action-btn">
            <div className="jackpot-box-icon" />
            <div className="jackpot-text">
              <span>Монте Карло</span>
              <span>Жекпот</span>
            </div>
            <JackpotText />
          </div>
          <button className="desktop-action-btn settings" data-name="Тохиргоо" onClick={() => openModal("SETTINGS")}>
            <div className="icon settings" />
          </button>
          <button
            className={`desktop-action-btn recharge-btn ${!userHasSeat ? "disabled" : ""}`}
            disabled={!userHasSeat}
            data-name="Цэнэглэлт"
            onClick={() => userHasSeat && setModalType("RECHARGE")}
          >
            <div className="icon recharge" />
          </button>

          <button className="desktop-action-btn" data-name="Мэдээлэл" onClick={() => openModal("INFO")}>
            <div className="icon info" />
          </button>
          <button className="desktop-action-btn" data-name="Бүтэн дэлгэц" onClick={toggleFullscreen}>
            <div className="icon fullscreen" />
          </button>
          <div className="desktop-network-quality" data-name="Сүлжээ" />
        </div>
      )}

      <Suspense fallback={null}>
        {modalState.type === "PLAYERS" && <PlayersModal seats={seats} isAdmin={isAdmin} onKick={doKick} onClose={closeModal} />}
        {modalState.type === "CONFIRM_LEAVE" && (
          <ConfirmFoldModal
            open={true}
            onConfirm={confirmLeave}
            onCancel={closeModal}
            title={
              modalState.props?.leaveType === "LEAVE_SEAT" ? "Та ширээнээс босохдоо итгэлтэй байна уу?" : "Та өрөөнөөс гарахдаа итгэлтэй байна уу?"
            }
            confirmText="Тийм"
            cancelText="Цуцлах"
          />
        )}
        {modalState.type === "SETTINGS" && (
          <div className="modal-overlay">
            <div className="finance-modal-container" onClick={(e) => e.stopPropagation()}>
              <SettingsModal isAuthenticated={isAuthenticated} isModalVisible closeModal={closeModal} />
            </div>
          </div>
        )}
        {modalState.type === "INFO" && <InfoModal isModalVisible closeModal={closeModal} />}
        {modalState.type === "JACKPOT" && <JackpotModal onClose={closeModal} />}
        {modalState.type === "HISTORY" && (
          <HandHistoryList
            handHistory={allHands}
            isLoading={isLoading || isFetching}
            open={modalState.type === "HISTORY"}
            onClose={() => {
              closeModal();
              setAllHands([]);
              setOffset(0);
            }}
            loadMore={loadMoreHands}
            hasMore={fetchedHands.length === limit}
          />
        )}
      </Suspense>
    </div>
  );
}
