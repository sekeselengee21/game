import { useState, useMemo, useCallback, useEffect, memo } from "react";
import { useFetchTablesQuery } from "../../api/user";
import type { GameTable } from "../../api/admin";
import CustomSelect from "../../components/CustomSelect";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useNavigate } from "react-router";
import DesktopTableCard from "../../components/TableCard/DesktopTableCard";
import MobileTableCard from "../../components/TableCard/MobileTableCard";

interface TableListProps {
  isAuthenticated: boolean;
  showLoginModal?: () => void;
  onTableClick?: (table: GameTable) => void;
  onTablesLoaded?: (tables: GameTable[]) => void;
  mobileView?: boolean;
  handleNavigateToHome: () => void;
}

const TableList = memo(function TableList({
  isAuthenticated,
  showLoginModal,
  onTableClick,
  onTablesLoaded,
  mobileView = false,
  handleNavigateToHome,
}: TableListProps) {
  const { data: tableData } = useFetchTablesQuery(undefined, { skip: false });
  const [selectedCategory, setSelectedCategory] = useState<"all" | "texas" | "omaha">("all");
  const [country, setCountry] = useState("all");
  const [search, setSearch] = useState("");

  type TableStatus = "all" | "running" | "hideFull" | "runningAndHideFull";

  const [tableStatus, setTableStatus] = useState<TableStatus>("all");

  const getTableTier = (record: GameTable) => {
    const sb = record.smallBlind;
    const variant = record.gameVariant?.toLowerCase() || "texas";

    if (variant === "texas") {
      if (sb <= 100) return "texas-micro";
      if (sb <= 250) return "texas-low";
      if (sb <= 500) return "texas-medium";
      if (sb <= 1000) return "texas-high";
      if (sb <= 2000) return "texas-super-high";
      if (sb <= 5000) return "texas-mega";
      if (sb <= 10000) return "texas-ultra";
      if (sb <= 20000) return "texas-titan";
      return "texas-legendary";
    }

    if (variant === "omaha") {
      if (sb <= 100) return "omaha-micro";
      if (sb <= 250) return "omaha-low";
      if (sb <= 500) return "omaha-medium";
      if (sb <= 1000) return "omaha-high";
      if (sb <= 2500) return "omaha-super-high";
      if (sb <= 5000) return "omaha-mega";
      if (sb <= 10000) return "omaha-ultra";
      if (sb <= 20000) return "omaha-titan";
      return "omaha-legendary";
    }

    return "unknown-tier";
  };

  const filteredAndSortedTables = useMemo(() => {
    if (!tableData) return [];

    const countActive = (table: GameTable) => Object.values(table.seats || {}).filter((p) => p && !p.isFolded && !p.isDisconnected).length;

    return tableData
      .filter((table) => {
        const variant = table.gameVariant?.toLowerCase();
        const seatsCount = Object.keys(table.seats || {}).length;

        if (selectedCategory !== "all" && variant !== selectedCategory) return false;

        if (search && !table.tableName?.toLowerCase().includes(search.toLowerCase())) return false;

        if (country !== "all") return false;

        if (tableStatus === "running" && seatsCount === 0) return false;
        if (tableStatus === "hideFull" && seatsCount >= table.maxPlayers) return false;
        if (tableStatus === "runningAndHideFull" && (seatsCount === 0 || seatsCount >= table.maxPlayers)) return false;

        return true;
      })

      .slice()
      .sort((a, b) => {
        const activeA = countActive(a);
        const activeB = countActive(b);
        if (activeA !== activeB) return activeB - activeA;
        return a.bigBlind - b.bigBlind;
      });
  }, [tableData, selectedCategory, search, country, tableStatus]);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const handleTableClick = useCallback(
    (record: GameTable) => {
      if (!isAuthenticated) {
        showLoginModal?.();
        return;
      }
      if (isMobile) {
        navigate(`/table/${record.secureId}`, { state: { table: record } });
        return;
      }
      onTableClick?.(record);
    },
    [isAuthenticated, showLoginModal, onTableClick, isMobile, navigate],
  );

  useEffect(() => {
    if (tableData?.length) {
      onTablesLoaded?.(tableData);
    }
  }, [tableData, onTablesLoaded]);

  return (
    <div className="table-list-container">
      {isMobile && (
        <div className="table-list-header-2">
          <div className="back-arrow" onClick={handleNavigateToHome} />
          <span>Ширээнүүд</span>
          <div className="search-btn-2"></div>
        </div>
      )}
      <div className="table-filters">
        <input type="text" className="table-search" placeholder="Ширээ хайх..." value={search} onChange={(e) => setSearch(e.target.value)} />

        <CustomSelect
          value={selectedCategory}
          onChange={setSelectedCategory}
          options={[
            { label: "Бүх", value: "all" },
            { label: "Холдем", value: "texas" },
            { label: "Омаха", value: "omaha" },
          ]}
          placeholder="Бүх"
          label="Тоглоомын төрөл"
        />

        {!isMobile && (
          <CustomSelect
            value={country}
            onChange={setCountry}
            options={[
              // { label: "Бүгд", value: "all" },
              { label: "Монгол", value: "MN" },
            ]}
            placeholder="Бүх"
            label="Улс сонгох"
          />
        )}

        <CustomSelect
          value={tableStatus}
          onChange={setTableStatus}
          options={[
            { label: "Бүх", value: "all" },
            { label: "Явж буй ширээ", value: "running" },
            { label: "Дүүрсэн ширээг нуух", value: "hideFull" },
            {
              label: "Явж байгаа дүүрээгүй ширээ",
              value: "runningAndHideFull",
            },
          ]}
          placeholder="Бүх"
          label="Төлөв сонгох"
        />
      </div>

      <div className={`table-list-header ${mobileView ? "mobile" : "desktop"}`}>
        {mobileView ? (
          <div className="phone-filter">
            <div className="sort" />
            <span className="table-count">{filteredAndSortedTables.length} ширээнүүд</span>
            <div className="filter" />
          </div>
        ) : (
          <>
            <span className="th-variant">Ширээний нэр</span>
            <span className="th-table">Тоглоом</span>
            <span className="th-players">Стек</span>
            <span className="th-buyin">Төрөл</span>
            <span className="th-buyin">Дундаж Пот</span>
            <span className="th-buyin">Тоглогчид</span>
            <span className="th-buyin">Мин/Макс</span>
          </>
        )}
      </div>
      <div className="table-card-container">
        {filteredAndSortedTables.map((record) => {
          const activePlayers = Object.keys(record.seats || {}).length;
          const variantMap: Record<string, string> = {
            texas: "Хязгааргүй Холдем",
            omaha: "Пот лимит Омаха",
          };

          const variantLabel = variantMap[record.gameVariant?.toLowerCase() ?? ""] ?? "Unknown";

          return mobileView ? (
            <MobileTableCard
              key={record.tableId}
              record={record}
              activePlayers={activePlayers}
              variantLabel={variantLabel}
              mobileView={mobileView}
              onClick={() => handleTableClick(record)}
              className={getTableTier(record)}
            />
          ) : (
            <DesktopTableCard
              key={record.tableId}
              record={record}
              activePlayers={activePlayers}
              variantLabel={variantLabel}
              mobileView={mobileView}
              onClick={() => handleTableClick(record)}
              className={getTableTier(record)}
            />
          );
        })}
      </div>
    </div>
  );
});

export default TableList;
