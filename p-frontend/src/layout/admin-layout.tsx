import React, { useState } from "react";
import AdminSidebar from "../features/admin/AdminSidebar";
import AdminHeader from "../components/admin-header";

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  const toggleCollapse = () => setCollapsed((prev) => !prev);

  return (
    <div className="admin-layout">
      {/* Pass toggleCollapse to AdminSidebar */}
      <AdminSidebar collapsed={collapsed} toggleCollapse={toggleCollapse} />

      <div className="admin-main">
        <AdminHeader collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
};

export default AdminLayout;
