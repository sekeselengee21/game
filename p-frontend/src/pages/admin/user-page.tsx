import { useState } from "react";
import AdminUserList from "../../features/admin/admin-user-list";
import { useAdminSearchUsersQuery, useDeleteUserMutation, useUpdateUserRoleMutation, useUpdateUserBalanceMutation } from "../../api/admin";

function UserPage() {
  const { data: users } = useAdminSearchUsersQuery();
  const [updateUserRole] = useUpdateUserRoleMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [updateUserBalance] = useUpdateUserBalanceMutation();

  const [filterRole, setFilterRole] = useState<"ALL" | "ADMIN" | "USER">("ALL");

  const filteredUsers = (users || []).filter((user) => {
    if (filterRole === "ALL") return true;
    return user.role?.toUpperCase() === filterRole;
  });

  return (
    <div className="user-page-wrapper">
      <select
        id="role-filter"
        className="user-page-select"
        value={filterRole}
        onChange={(e) => setFilterRole(e.target.value as "ALL" | "ADMIN" | "USER")}
      >
        <option value="ALL">Бүх хэрэглэгч</option>
        <option value="ADMIN">Зөвхөн админ</option>
        <option value="USER">Зөвхөн хэрэглэгч</option>
      </select>

      <AdminUserList users={filteredUsers} deleteUser={deleteUser} updateUserRole={updateUserRole} updateUserBalance={updateUserBalance} />
    </div>
  );
}

export default UserPage;
