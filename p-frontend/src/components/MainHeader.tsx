import React, { useEffect, useState, useMemo, Suspense, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMeQuery, useUpdateAvatarMutation } from "../api/user";
import {
  setAuthenticated,
  setUserInfo,
  setUserBalance,
} from "../providers/auth-slice";
import useLogout from "../hooks/useLogout";
import JackpotText from "./JackpotText";

import Avatar from "../assets/image/avatar/6820.png";
import { useIsMobile } from "../hooks/useIsMobile";
import Menu from "./Menu";

const UserFinanceModal = React.lazy(
  () => import("../components/UserFinanceModal"),
);
const AdminChat = React.lazy(() => import("../components/AdminChat"));
const BonusModal = React.lazy(() => import("./modals/BonusModal"));
const MyRegisterModal = React.lazy(() => import("./modals/MyRegisterModal"));
const SettingsModal = React.lazy(() => import("./modals/SettingsModal"));
const InfoModal = React.lazy(() => import("./modals/InfoModal"));
const AvatarSelectModal = React.lazy(
  () => import("./modals/AvatarSelectModal"),
);
const JackpotModal = React.lazy(() => import("./modals/JackpotModal"));
import { GlobalWebSocketContext } from "../providers/GlobalWebSocketProvider";

interface MainHeaderProps {
  showLoginModal?: (type: "login" | "register") => void;
  totalUsers?: number;
  totalTables?: number;
  isMenuOpen?: boolean;
  onToggleMenu?: () => void;
  closeMenu?: () => void;
  hideHeaderContent?: boolean;
}

const MainHeader: React.FC<MainHeaderProps> = ({
  showLoginModal,
  hideHeaderContent = false,
  totalUsers,
  totalTables,
  isMenuOpen,
  onToggleMenu,
  closeMenu,
}) => {
  const dispatch = useDispatch();
  const handleLogout = useLogout();

  const [activeModal, setActiveModal] = useState<
    "finance" | "bonus" | "myRegister" | "settings" | "info" | "userInfo" | "jackpot" | null
  >(null);
  const isModal =
    activeModal === "finance" ||
    activeModal === "bonus" ||
    activeModal === "myRegister" ||
    activeModal === "settings" ||
    activeModal === "userInfo";

  const [isAdminChatOpen, setIsAdminChatOpen] = useState(false);
  const { unreadChatCount, resetUnreadChatCount } = useContext(GlobalWebSocketContext);

  const openChat = () => {
    setIsAdminChatOpen(true);
    resetUnreadChatCount();
  };
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString("mn-MN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString("mn-MN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);
  const token = localStorage.getItem("accessToken");
  const { data: userInfo, refetch } = useMeQuery(undefined, { skip: !token });
  const [updateAvatar] = useUpdateAvatarMutation();
  const userBalance = useSelector((state: any) => state.auth.userBalance);
  const currentAvatar = userInfo && userInfo.avatar ? userInfo.avatar : Avatar;
  const isAuthenticated = useSelector(
    (state: any) => state.auth.isAuthenticated,
  );
  const isMobile = useIsMobile();
  const username = useMemo(() => {
    const name = userInfo?.username ?? "";
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [userInfo]);

  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message}`,
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

  const toggleBalanceVisibility = () => {
    setIsBalanceVisible((prev) => !prev);
  };
  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const userId = useMemo(() => {
    const id = userInfo?.userId ?? 0;
    return id.toString().padStart(6, "0");
  }, [userInfo]);

  const isAdmin = userInfo?.role === "ADMIN";

  useEffect(() => {
    if (userInfo) {
      dispatch(setAuthenticated(true));
      dispatch(setUserInfo(userInfo));
      dispatch(setUserBalance(userInfo.userBalance?.balance ?? 0));
    }
  }, [userInfo, dispatch]);

  useEffect(() => {
    if (!token) {
      dispatch(setAuthenticated(false));
      dispatch(setUserInfo(null));
      dispatch(setUserBalance(0));
      setActiveModal(null);
    }
  }, [token, dispatch]);

  useEffect(() => {
    if (!isAuthenticated) setActiveModal(null);
  }, [isAuthenticated]);

  const openFinanceModal = () => {
    if (!isAuthenticated) return;
    closeMenu?.();
    refetch();
    setActiveModal("finance");
  };

  const openSettingsModal = () => {
    closeMenu?.();
    setActiveModal("settings");
  };
  const openInfoModal = () => {
    closeMenu?.();
    setActiveModal("info");
  };

  const openBonusModal = () => {
    if (!isAuthenticated) return;
    closeMenu?.();
    refetch();
    setActiveModal("bonus");
  };

  const profileEdit = () => {
    if (!isAuthenticated) return;
    setActiveModal("userInfo");
  };

  const openMyRegisterModal = () => {
    if (!isAuthenticated) return;
    closeMenu?.();
    setActiveModal("myRegister");
  };

  const closeModal = () => setActiveModal(null);

  return (
    <header className="main-header">
      {!hideHeaderContent && (
        <div className="header-top">
          {isMobile && (
            <div className="logo-svg">
              <div className="icon-box"></div>
            </div>
          )}
          <div className="header-top-left">
            <div className="left-side time">
              <div className="left-sideIcon"></div>
              <div className="left-sideText">{currentTime}</div>
            </div>

            <div className="left-side users">
              <div className="left-sideIcon"></div>
              <div className="left-sideText">
                {totalUsers?.toLocaleString("mn-MN") ?? 0}
              </div>
            </div>

            <div className="left-side tables">
              <div className="left-sideIcon"></div>
              <div className="left-sideText">
                {totalTables?.toLocaleString("mn-MN") ?? 0}
              </div>
            </div>
          </div>

          {isAuthenticated ? (
            <div className="user-header-inner">
              <div className="user-picture" onClick={profileEdit}>
                <img
                  src={currentAvatar}
                  alt="User Avatar"
                  className="user-avatar-image"
                  loading="lazy"
                />
              </div>
              <div className="profile-text-wrapper">
                <span className="username-text">{username}</span>
                <p>#{userId}</p>
              </div>
              <div className="profile-wrapper">
                <div className="profile-text-header">
                  <div className="balance-inner">
                    <div
                      className={`balance-visible ${isBalanceVisible ? "expanded" : "collapsed"}`}
                      onClick={toggleBalanceVisibility}
                    >
                      <div className="inner-balance-visible"></div>
                    </div>

                    <span className="user-balance">
                      {(userBalance ?? 0).toLocaleString("mn-MN")}
                    </span>
                    <div className="dropdown-icon" onClick={toggleDropdown} />

                    <div
                      className={`balance-dropdown ${isDropdownOpen ? "open" : ""}`}
                    >
                      <div className="balance-row">
                        <span>Balance</span>
                        <span>
                          {(userBalance ?? 0).toLocaleString("mn-MN")}
                        </span>
                      </div>
                      <div className="balance-row">
                        <span>CGP</span>
                        <span>{userInfo?.cgpScore ?? 0}</span>
                      </div>
                    </div>
                  </div>
                  {!isMobile && (
                    <div onClick={openFinanceModal} className="cashier-btn">
                      <div className="cashier-gradient-bg">
                        <span>Касс</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="user-header-inner-login">
              {/* <div className="logo-svg">
              <div className="icon-box"></div>
            </div> */}
              <div
                onClick={() => showLoginModal?.("login")}
                className="login-btn"
              >
                <span>Нэвтрэх</span>
              </div>
              <div
                onClick={() => showLoginModal?.("register")}
                className="register-btn"
              >
                <span>Бүртгүүлэх</span>
              </div>
            </div>
          )}

          {!isMobile && (
            <div className="header-top-right">
              {isAuthenticated && (
                <div className="right-side chat-toggle" onClick={openChat}>
                  <div className="right-sideIcon chat-icon" />
                  {!isAdminChatOpen && unreadChatCount > 0 && (
                    <span className="chat-unread-badge">
                      {unreadChatCount > 99 ? "99+" : unreadChatCount}
                    </span>
                  )}
                </div>
              )}
              <div className="right-side fullscreen">
                <div
                  className="right-sideIcon"
                  onClick={toggleFullscreen}
                ></div>
              </div>
              <div className="right-side settings" onClick={openSettingsModal}>
                <div className="right-sideIcon"></div>
              </div>
            </div>
          )}
        </div>
      )}

      <Menu
        isMenuOpen={isMenuOpen}
        closeMenu={closeMenu}
        openSettingsModal={openSettingsModal}
        isAuthenticated={isAuthenticated}
        isProfileExpanded={isProfileExpanded}
        setIsProfileExpanded={setIsProfileExpanded}
        openBonusModal={openBonusModal}
        openInfoModal={openInfoModal}
        openMyRegisterModal={openMyRegisterModal}
        handleLogout={handleLogout}
        isAdmin={isAdmin}
      />

      {!hideHeaderContent && (
        <div className="user-section-wrapper">
          <div className="user-header">
            {!isMobile && (
              <div className="header-menu" onClick={onToggleMenu} />
            )}
            <div className="header-menu-logo">
              {!isMobile && (
                <div className="logo-svg">
                  <div className="icon-box"></div>
                </div>
              )}
              <div className="poker-global-icon">
                <div className="icon-box"></div>
                <span>Покер</span>
              </div>
              <div className="jackpot-box" onClick={() => setActiveModal("jackpot")} style={{ cursor: "pointer" }}>
                <div className="jackpot-text">
                  <span>Монте Карло</span>
                  <span>Жекпот</span>
                </div>
                <JackpotText />
              </div>
            </div>
          </div>
        </div>
      )}

      {isModal && (
        <div className="modal-overlay">
          <div
            className="finance-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <Suspense
              fallback={
                <div className="modal-spinner-wrapper">
                  <div className="modal-spinner" />
                </div>
              }
            >
              {activeModal === "finance" && (
                <UserFinanceModal
                  isModalVisible
                  isAuthenticated={isAuthenticated}
                  closeModal={closeModal}
                  userBalance={userBalance}
                />
              )}

              {activeModal === "bonus" && (
                <BonusModal
                  isModalVisible
                  isAuthenticated={isAuthenticated}
                  closeModal={closeModal}
                  userInfo={userInfo}
                  refetch={refetch}
                />
              )}

              {activeModal === "myRegister" && (
                <MyRegisterModal
                  isModalVisible
                  isAuthenticated={isAuthenticated}
                  closeModal={closeModal}
                  userInfo={userInfo}
                />
              )}

              {activeModal === "settings" && (
                <SettingsModal
                  isAuthenticated={isAuthenticated}
                  isModalVisible
                  closeModal={closeModal}
                />
              )}
              {activeModal === "userInfo" && (
                <AvatarSelectModal
                  currentAvatar={currentAvatar}
                  isAuthenticated={isAuthenticated}
                  isModalVisible
                  onClose={closeModal}
                  onSave={async (data) => {
                    try {
                      if (!data.avatar) return;
                      const updatedUser = await updateAvatar({
                        avatar: data.avatar,
                        avatarBorder: null,
                      }).unwrap();
                      dispatch(setUserInfo(updatedUser));
                      closeModal();
                    } catch (err) {
                      console.error("Failed to update avatar:", err);
                    }
                  }}
                />
              )}
            </Suspense>
          </div>
        </div>
      )}
      <Suspense fallback={null}>
        {activeModal === "info" && (
          <InfoModal isModalVisible closeModal={closeModal} />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {activeModal === "jackpot" && (
          <JackpotModal onClose={closeModal} />
        )}
      </Suspense>

      {isAdminChatOpen && isAuthenticated && (
        <Suspense fallback={null}>
          <AdminChat onClose={() => { setIsAdminChatOpen(false); resetUnreadChatCount(); }} />
        </Suspense>
      )}
    </header>
  );
};

export default React.memo(MainHeader);
