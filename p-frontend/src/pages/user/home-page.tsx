import { useState, lazy, useCallback, memo, useEffect, Suspense, useContext, useRef } from "react";
import { useSelector } from "react-redux";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useMyTables } from "../../providers/MyTablesProvider";
import { FaLayerGroup } from "react-icons/fa";
import { useFetchTablesQuery } from "../../api/user";
import type { RootState } from "../../app/store";
import type { GameTable } from "../../api/admin";
import gif2 from "../../assets/image/gifs/telegram-join.gif";
import tablesIcon from "../../assets/image/icons/cash-game-tab-icon-blue.svg";
import tournamentIcon from "../../assets/image/icons/tournaments-game-tab-icon-blue.svg";
import sitgoIcon from "../../assets/image/icons/sit-and-go-game-tab-icon-blue.svg";
import { type TableCategory } from "../../types/gameTypes";
import MainHeader from "../../components/MainHeader";
import AdminChat from "../../components/AdminChat";
import { GlobalWebSocketContext } from "../../providers/GlobalWebSocketProvider";

const TableList = lazy(() => import("../../features/poker/table-list"));
const TablePreview = lazy(() => import("../../features/poker/table-preview"));
const MainFooter = lazy(() => import("../../components/MainFooter"));
const CustomModal = lazy(() => import("../../components/modals/CustomModal"));
const RegisterForm = lazy(() => import("../../features/user/register-form"));
const LoginForm = lazy(() => import("../../features/user/login-form"));
const MobileCategory = lazy(() => import("../../components/MobileCategory"));
const MobileHomePage = lazy(() => import("./MobileHomePage"));
const MyTablesBottomSheet = lazy(() => import("../../components/MyTablesBottomSheet"));
const UserFinanceModal = lazy(() => import("../../components/UserFinanceModal"));

const HomePage = memo(function HomePage() {
  const [modalType, setModalType] = useState<string>("");
  const [selectedTableSecureId, setSelectedTableSecureId] = useState<string | null>(null);
  const [hasSetDefaultTable, setHasSetDefaultTable] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [category, setCategory] = useState<TableCategory>("Home");
  const handleNavigateToTables = () => setCategory("Ширээнүүд");
  const handleNavigateToCashier = () => setCategory("Cashier");
  const handleNavigateToHome = () => setCategory("Home");

  // Track unread chat messages when chat tab is not active
  const { chatMessages } = useContext(GlobalWebSocketContext);
  const prevMsgCount = useRef(chatMessages.length);
  const [chatUnread, setChatUnread] = useState(0);
  useEffect(() => {
    if (category === "Chat") {
      setChatUnread(0);
      prevMsgCount.current = chatMessages.length;
    } else {
      const newCount = chatMessages.length - prevMsgCount.current;
      if (newCount > 0) setChatUnread((prev) => prev + newCount);
      prevMsgCount.current = chatMessages.length;
    }
  }, [chatMessages.length, category]);

  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isMobile = useIsMobile();
  const { data: tableData } = useFetchTablesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [gifSrc, setGifSrc] = useState(gif2);
  const selectedTable = tableData?.find((t) => t.secureId === selectedTableSecureId) || null;
  const totalTables = tableData?.length ?? 0;
  const totalUsers = tableData?.reduce((acc, table) => acc + (table.activePlayers ?? 0), 0) ?? 0;

  const handleTablesLoaded = useCallback(() => {
    if (!isMobile && !hasSetDefaultTable && tableData && tableData.length > 0) {
      setSelectedTableSecureId(tableData[0].secureId);
      setHasSetDefaultTable(true);
    }
  }, [isMobile, hasSetDefaultTable, tableData]);

  const handleTableClick = useCallback((table: GameTable) => {
    setSelectedTableSecureId(table.secureId);
  }, []);

  const { myTables, openSheet } = useMyTables();
  const handleLoginModal = useCallback(() => setModalType("login"), []);
  const handleClosePreview = useCallback(() => setSelectedTableSecureId(null), []);
  const handleCloseModal = useCallback(() => setModalType(""), []);
  const toggleMenu = () => setIsCategoryMenuOpen((prev) => !prev);
  const closeMenu = () => setIsCategoryMenuOpen(false);

  useEffect(() => {
    const timer = setInterval(() => setGifSrc(`${gif2}?t=${Date.now()}`), 7000);
    return () => clearInterval(timer);
  }, []);

  const renderMobileContent = () => {
    switch (category) {
      case "Home":
        return <MobileHomePage handleNavigateToTables={handleNavigateToTables} handleNavigateToCashier={handleNavigateToCashier} />;
      case "Cashier":
        return <UserFinanceModal isModalVisible={true} isAuthenticated={isAuthenticated} />;
      case "Chat":
        return (
          <div className="mobile-chat-page">
            <AdminChat />
          </div>
        );
      case "Games":
        return <div>My Games Page</div>;
      case "Ширээнүүд":
      case "Тэмцээнүүд":
      case "Sit & Go":
      default:
        return (
          <TableList
            isAuthenticated={isAuthenticated}
            showLoginModal={handleLoginModal}
            onTableClick={handleTableClick}
            onTablesLoaded={handleTablesLoaded}
            mobileView={isMobile}
            handleNavigateToHome={handleNavigateToHome}
          />
        );
    }
  };

  return (
    <div className="home-page-layout">
      <MainHeader
        showLoginModal={setModalType}
        totalUsers={totalUsers}
        isMenuOpen={isCategoryMenuOpen}
        totalTables={totalTables}
        onToggleMenu={toggleMenu}
        closeMenu={closeMenu}
        hideHeaderContent={isMobile && category !== "Home"}
      />

      <div className="home-page-container">
        <div className="homepage-grid-layout">
          <div className="main-content">
            {!isMobile ? (
              <div className="table-categories">
                {[
                  { key: "Ширээнүүд", label: "Ширээнүүд", icon: tablesIcon },
                  {
                    key: "Тэмцээнүүд",
                    label: "Тэмцээнүүд",
                    icon: tournamentIcon,
                  },
                  { key: "Sit & Go", label: "Sit & Go", icon: sitgoIcon },
                ].map((c) => (
                  <button key={c.key} className={`category-btn ${category === c.key ? "active" : ""}`} onClick={() => setCategory(c.key as TableCategory)}>
                    <img src={c.icon} alt="" className="category-icon" />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mobile-homepage-imgs">
                <div className="img1"></div>
              </div>
            )}

            <Suspense fallback={null}>
              {isMobile ? (
                renderMobileContent()
              ) : (
                <TableList
                  isAuthenticated={isAuthenticated}
                  showLoginModal={handleLoginModal}
                  onTableClick={handleTableClick}
                  onTablesLoaded={handleTablesLoaded}
                  mobileView={isMobile}
                  handleNavigateToHome={handleNavigateToHome}
                />
              )}
            </Suspense>
          </div>

          {selectedTable && !isMobile && (
            <div className="right-column">
              <div className="contact-admin">
                {/* <a href="https://t.me/fdvmkkkhgvxsgbb" target="_blank" rel="noopener noreferrer"> */}
                <a href="https://t.me/+rDrM6id7dllhM2Q1" target="_blank" rel="noopener noreferrer">
                  <img src={gifSrc} alt="admin-gif-1" className="slide-gif" />
                </a>
              </div>
              <div className="hero-table-preview-container">
                <TablePreview
                  table={selectedTable}
                  onClose={handleClosePreview}
                  isAuthenticated={isAuthenticated}
                  onRequireLogin={handleLoginModal}
                />
              </div>
            </div>
          )}
        </div>

        {isMobile ? (
          <MobileCategory
            category={category}
            onChange={setCategory}
            isMenuOpen={isCategoryMenuOpen}
            onToggleMenu={toggleMenu}
            chatUnread={chatUnread}
          />
        ) : (
          <MainFooter />
        )}
      </div>
      <Suspense fallback={null}>
        {modalType && (
          <CustomModal titleArea={modalType === "login" ? "Нэвтрэх" : "Бүртгүүлэх"} open onClose={handleCloseModal}>
            {modalType === "login" && <LoginForm setModalType={setModalType} />}
            {modalType === "register" && <RegisterForm setModalType={setModalType} />}
          </CustomModal>
        )}
      </Suspense>

      {/* My Tables floating button — only on mobile when user has entered tables */}
      {isMobile && myTables.length > 0 && (
        <button className="my-tables-fab" onClick={openSheet}>
          <FaLayerGroup />
          <span>{myTables.length}</span>
        </button>
      )}

      <Suspense fallback={null}>{isMobile && <MyTablesBottomSheet />}</Suspense>
    </div>
  );
});

export default HomePage;
