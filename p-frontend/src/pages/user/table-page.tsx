import { useLocation, useNavigate, useParams } from "react-router";
import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { GlobalWebSocketProvider } from "../../providers/GlobalWebSocketProvider";
import { GameProvider, useGame } from "../../providers/GameProvider";
import { useMyTables } from "../../providers/MyTablesProvider";
import LoadingSpinner from "../../components/LoadingSpinner";
import MyTablesBottomSheet from "../../components/MyTablesBottomSheet";
import { useFetchTableBySecureIdQuery } from "../../api/user";

const TexasTableGame = lazy(
  () => import("../../features/poker/texas/texas-table-game"),
);

const SWIPE_THRESHOLD = 60;
const SWIPE_ANGLE_LIMIT = 1.5;

function TablePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { myTables, addTable } = useMyTables();

  const urlSecureId = params.id ?? "";
  const {
    data: fetchedTable,
    isFetching: isFetchingTable,
    isError: isFetchTableError,
  } = useFetchTableBySecureIdQuery(urlSecureId, {
    skip:
      !urlSecureId ||
      location.state?.table?.secureId === urlSecureId ||
      myTables.some((t) => t.secureId === urlSecureId),
  });

  const table = useMemo(() => {
    // Prefer fresh table data passed via navigate state.
    if (location.state?.table?.secureId === urlSecureId)
      return location.state.table;
    // Fall back to a previously joined table so refresh works.
    const fromMyTables = myTables.find((t) => t.secureId === urlSecureId);
    if (fromMyTables) return fromMyTables;
    if (fetchedTable) return fetchedTable;
    return null;
  }, [location.state, myTables, fetchedTable, urlSecureId]);

  const secureId: string = urlSecureId;
  const tableId: string = table ? String(table.tableId) : "";

  // Persist the full table object once it's known so future tabs/refreshes can resolve it.
  useEffect(() => {
    if (table && table.tableName) addTable(table);
  }, [table?.secureId, table?.tableName]);

  useEffect(() => {
    if (!urlSecureId) {
      navigate("/", { replace: true });
      return;
    }

    if (!isFetchingTable && !table && isFetchTableError) {
      navigate("/", { replace: true });
    }
  }, [urlSecureId, isFetchingTable, isFetchTableError, table, navigate]);

  // Swipe-to-switch gesture
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;

    if (
      Math.abs(dx) < SWIPE_THRESHOLD ||
      Math.abs(dx) < Math.abs(dy) * SWIPE_ANGLE_LIMIT
    )
      return;

    const currentIdx = myTables.findIndex((mt) => mt.secureId === secureId);
    if (currentIdx === -1) return;

    // Swipe LEFT → next table (right in list); Swipe RIGHT → previous
    const targetIdx =
      dx < 0
        ? Math.min(currentIdx + 1, myTables.length - 1)
        : Math.max(currentIdx - 1, 0);

    if (targetIdx === currentIdx) return;

    const target = myTables[targetIdx];
    navigate(`/table/${target.secureId}`, { state: { table: target } });
  };

  if (!tableId) {
    return <LoadingSpinner message="" />;
  }

  return (
    <div
      className="table-page"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <GlobalWebSocketProvider>
        <GameProvider tableId={tableId}>
          <TableContent />
        </GameProvider>
      </GlobalWebSocketProvider>

      <MyTablesBottomSheet currentSecureId={secureId} />
    </div>
  );
}

function TableContent() {
  const { isReady, socketReady } = useGame();

  return (
    <>
      {!isReady ? (
        <LoadingSpinner message="" />
      ) : (
        <Suspense fallback={<LoadingSpinner message="" />}>
          <TexasTableGame />
        </Suspense>
      )}
      {!socketReady && <div className="modal-overlay" />}
    </>
  );
}

export default TablePage;
