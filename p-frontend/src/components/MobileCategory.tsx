import { memo } from "react";
import { type TableCategory } from "../types/gameTypes";

import home from "../assets/image/icons/home.svg";
import tables from "../assets/image/icons/tables.svg";
import Navbar from "../assets/image/icons/navbar-icon.svg";
import Cashier from "../assets/image/icons/cashier.svg";
import chatIcon from "../assets/image/icons/chat-icon.svg";

import homeActive from "../assets/image/icons/home-active.png";
import tablesActive from "../assets/image/icons/tables-active.png";
import NavbarActive from "../assets/image/icons/navbar-icon.svg";
import CashierActive from "../assets/image/icons/cashier-active.png";

type Props = {
  category: TableCategory;
  onChange: React.Dispatch<React.SetStateAction<TableCategory>>;
  isMenuOpen?: boolean;
  onToggleMenu?: () => void;
  chatUnread?: number;
};

const categories: {
  key: TableCategory;
  label: string;
  icon: string;
  activeIcon: string;
}[] = [
  { key: "Home",      label: "Нүүр",    icon: home,     activeIcon: homeActive   },
  { key: "Cashier",   label: "Касс",    icon: Cashier,  activeIcon: CashierActive},
  { key: "Ширээнүүд", label: "Ширээ",   icon: tables,   activeIcon: tablesActive },
  { key: "Chat",      label: "Чат",     icon: chatIcon, activeIcon: chatIcon     },
  { key: "Settings",  label: "Тохиргоо",icon: Navbar,   activeIcon: NavbarActive },
];

const MobileCategory = memo(function MobileCategory({
  category,
  onChange,
  isMenuOpen = false,
  onToggleMenu,
  chatUnread = 0,
}: Props) {
  return (
    <div className="mobile-category">
      {categories.map((c) => {
        const isActive = category === c.key;

        const handleClick =
          c.key === "Settings" && onToggleMenu
            ? onToggleMenu
            : () => onChange(c.key);

        return (
          <button
            key={c.key}
            className={`mobile-category-btn ${isActive ? "active" : ""} ${c.key === "Settings" && isMenuOpen ? "menu-open" : ""}`}
            onClick={handleClick}
          >
            <div className="mc-icon-wrap">
              <img src={isActive ? c.activeIcon : c.icon} alt={c.label} />
              {c.key === "Chat" && chatUnread > 0 && (
                <span className="mc-badge">{chatUnread > 99 ? "99+" : chatUnread}</span>
              )}
            </div>
            <span>{c.label}</span>
          </button>
        );
      })}
    </div>
  );
});

export default MobileCategory;
