import React from "react";
import { AiOutlineDollar, AiOutlineUser, AiOutlineSetting } from "react-icons/ai";
import { FaUsers } from "react-icons/fa";
import cat1 from "../assets/image/cat-chip.svg";

type BottomNavProps = {
  activeCategory: "tables" | "cash" | "friends" | "profile" | "settings" | "admin";
  setActiveCategory: (category: "tables" | "cash" | "friends" | "profile" | "settings" | "admin") => void;
};

const BottomNav: React.FC<BottomNavProps> = ({ activeCategory, setActiveCategory }) => {
  const navItems = [
    { key: "cash", icon: <AiOutlineDollar size={20} />, label: "Cash" },
    { key: "friends", icon: <FaUsers size={20} />, label: "Friends" },
    { key: "tables", icon: <img src={cat1} alt="Tables" className="chip-icon" />, label: "Tables" },
    { key: "profile", icon: <AiOutlineUser size={20} />, label: "Profile" },
    { key: "settings", icon: <AiOutlineSetting size={20} />, label: "Settings" },
    { key: "admin", icon: <AiOutlineSetting size={20} />, label: "Admin" },
  ] as const;

  return (
    <div className="mobile-bottom-nav">
      {navItems.map((item) => (
        <div key={item.key} onClick={() => setActiveCategory(item.key)} className="mobile-nav-item">
          <div className={`mobile-nav-inner ${activeCategory === item.key ? "active" : ""}`}>
            {item.icon}
            <div className="mobile-nav-label">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BottomNav;
