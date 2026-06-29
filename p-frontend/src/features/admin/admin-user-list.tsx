import { useState, useMemo } from "react";
import type { User } from "../../api/user";
import banks from "../../assets/data/banks";
import { MdDelete } from "react-icons/md";
import { toast } from "react-toastify";

type AdminUserListProps = {
  users: User[];
  deleteUser: (userId: number) => void;
  updateUserRole: (args: { userId: number; role: "USER" | "ADMIN" }) => any;
  updateUserBalance: (args: { userId: number; balance: number }) => any;
};

function AdminUserList({ users, deleteUser, updateUserRole, updateUserBalance }: AdminUserListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newBalance, setNewBalance] = useState<number>(0);

  const openBalanceModal = (user: User) => {
    setEditingUser(user);
    setNewBalance(user.userBalance?.balance ?? 0);
  };

  const formatNumber = (num: number) => num.toLocaleString("en-US");

  const saveNewBalance = () => {
    if (!editingUser) return;

    updateUserBalance({ userId: editingUser.userId, balance: newBalance })
      .unwrap()
      .then(() => {
        toast.success("Үлдэгдэл амжилттай шинэчлэгдлээ!");
        setEditingUser(null);
      })
      .catch(() => toast.error("Алдаа гарлаа!"));
  };

  const filteredUsers = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return users.filter((u) => {
      const usernameMatch = u.username.toLowerCase().includes(lower);
      const userIdMatch = u.userId.toString().includes(searchTerm);
      return usernameMatch || userIdMatch;
    });
  }, [searchTerm, users]);

  const sortedUsers = useMemo(() => filteredUsers.slice().sort((a, b) => b.userId - a.userId), [filteredUsers]);

  const paginatedData = sortedUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(sortedUsers.length / pageSize);
  console.log("Rendering AdminUserList with users:", users);
  return (
    <div className="admin-table-wrapper">
      <input
        type="text"
        className="admin-search-input"
        placeholder="Хайлт (Нэр эсвэл ID)"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <table className="admin-table">
        <thead>
          <tr>
            <th>№</th>
            <th>ID</th>
            <th>Нэр</th>
            <th>Дансны дугаар</th>
            <th>Банк</th>
            <th>Үлдэгдэл</th>
            <th>Эрх</th>
            <th>Үйлдэл</th>
          </tr>
        </thead>

        <tbody>
          {paginatedData.map((user, index) => (
            <tr className="admin-userList" key={user.userId}>
              <td className="table-index">{(currentPage - 1) * pageSize + index + 1}</td>
              <td className="table-id">{user.userId}</td>
              <td className="table-user">{user.username}</td>
              <td>{user.accountNumber}</td>
              <td>{banks.find((b) => b.value === user.bankName)?.label || user.bankName}</td>

              <td className="table-amount">
                <button className="btn-edit" onClick={() => openBalanceModal(user)}>
                  {formatNumber(user.userBalance?.balance ?? 0)}₮
                </button>
              </td>

              <td className="table-role">
                <select
                  value={user.role}
                  onChange={(e) =>
                    updateUserRole({ userId: user.userId, role: e.target.value as "USER" | "ADMIN" })
                      .unwrap()
                      .then(() => toast.success("Эрх амжилттай шинэчлэгдлээ!"))
                      .catch(() => toast.error("Алдаа гарлаа!"))
                  }
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </td>

              <td className="table-action">
                <button className="btn-action btn-danger" onClick={() => deleteUser(user.userId)}>
                  <MdDelete />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination-controls">
        <span>
          Хуудас {currentPage} of {totalPages}
        </span>

        <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
          Өмнөх
        </button>

        <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
          Дараагийнх
        </button>

        <label>
          <select className="custom-select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {[10, 20, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>

        <span>Нийт: {users.length} </span>
      </div>

      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>Үлдэгдэл засах</h2>
            <p>{editingUser.username}</p>

            <input
              type="text"
              className="modal-input"
              value={formatNumber(newBalance)}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                const num = Number(raw);
                if (isNaN(num)) return;

                setNewBalance(num);
              }}
            />

            <div style={{ marginTop: "6px", fontWeight: "bold" }}>{formatNumber(newBalance)} ₮</div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setEditingUser(null)}>
                Болих
              </button>
              <button className="btn-save" onClick={saveNewBalance}>
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserList;
