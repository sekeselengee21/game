import { useEffect, useState, useRef, useContext } from "react";
import AdminDepositList from "../../features/admin/admin-deposit-list";
import { useCreateDepositMutation, useFetchDepositsQuery, useApproveDepositMutation, useDenyDepositMutation } from "../../api/admin";
import { useSearchUsersQuery, useMeQuery } from "../../api/user";
import { FiPlus, FiX, FiDollarSign, FiUser, FiAlertCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import { GlobalWebSocketContext } from "../../providers/GlobalWebSocketProvider";
import ConfirmActionModal from "../../components/modals/ConfirmActionModal";

function DepositPage() {
  const { data: deposits, refetch } = useFetchDepositsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    pollingInterval: 5000,
  });

  const { data: users } = useSearchUsersQuery();
  const [createDeposit, { isSuccess, isError, error }] = useCreateDepositMutation();
  const [approveDeposit] = useApproveDepositMutation();
  const [denyDeposit] = useDenyDepositMutation();
  const token = localStorage.getItem("accessToken");
  const { refetch: refetchUserInfo } = useMeQuery(undefined, { skip: !token });
  const { adminNotifications, resetAdminNotifications, ws } = useContext(GlobalWebSocketContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ userId: "", amount: "", type: "BANK_TRANSFER" });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    depositId: number | null;
    amount?: number;
    username?: string;
  }>({ isOpen: false, depositId: null });

  useEffect(() => {
    if (isSuccess) {
      refetchUserInfo();
      setIsModalOpen(false);
      setMessage("Deposit created successfully");
      setFormData({ userId: "", amount: "", type: "BANK_TRANSFER" });
      setFormErrors({});
      setUserSearch("");
    }
  }, [isSuccess, refetchUserInfo]);

  useEffect(() => {
    if (isError && error) {
      const errMsg = (error as any)?.data?.errorMessage;
      setMessage("Error: " + errMsg);
    }
  }, [isError, error]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers =
    users?.filter((user) => {
      const searchLower = userSearch.toLowerCase();
      const usernameMatch = user.username.toLowerCase().includes(searchLower);
      const userIdMatch = user.userId.toString().includes(userSearch);
      return usernameMatch || userIdMatch;
    }) ?? [];

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate() {
    const errors: { [key: string]: string } = {};
    if (!formData.userId) errors.userId = "Хэрэглэгчийг сонгоно уу";
    if (!formData.amount || Number(formData.amount) <= 0) errors.amount = "Хэмжээг зөв оруулна уу";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    createDeposit({
      userId: Number(formData.userId),
      amount: Number(formData.amount),
      type: formData.type,
      details: {},
    });
  }

  const selectedUsername = users?.find((u) => u.userId === Number(formData.userId))?.username || userSearch;

  const handleAcceptDeposit = async (depositId: number) => {
    try {
      await approveDeposit({ id: depositId }).unwrap();
      toast.success("Орлого амжилттай зөвшөөрөгдлөө!");
    } catch (error) {
      toast.error("Орлого зөвшөөрөхөд алдаа гарлаа!");
    }
  };

  const handleDenyDeposit = (depositId: number) => {
    const deposit = deposits?.find((d) => d.depositId === depositId);
    setConfirmModal({
      isOpen: true,
      depositId,
      amount: deposit?.amount,
      username: deposit?.user?.username,
    });
  };

  const confirmDenyDeposit = async () => {
    if (!confirmModal.depositId) return;

    try {
      await denyDeposit({ id: confirmModal.depositId }).unwrap();
      toast.success("Орлого татгалзагдлаа!");
    } catch (error) {
      toast.error("Орлого татгалзахад алдаа гарлаа!");
    }
  };

  const pendingDeposits = deposits?.filter((d) => d.status === "PENDING" || (!d.status && !d.approvedBy && !d.approveDate)) ?? [];
  const historyDeposits = deposits?.filter((d) => d.status === "APPROVED" || d.status === "DENIED" || d.approvedBy || d.approveDate) ?? [];
  const pendingCount = pendingDeposits.length;

  useEffect(() => {
    if (adminNotifications > 0) {
      resetAdminNotifications();
    }
  }, [adminNotifications, resetAdminNotifications]);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);

      if (message.type === "ADMIN_DEPOSIT_NOTIFICATION" || message.type === "DEPOSIT_STATUS_UPDATE") {
        toast.info("Deposit list updated");
        refetch();
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws, refetch]);

  return (
    <div className="deposit-page-wrapper">
      {message && <div className="admin-message">{message}</div>}

      <div className="create-button-container">
        <button className="add-deposit-button" onClick={() => setIsModalOpen(true)} title="Шинэ орлого нэмэх">
          <FiPlus size={20} />
          <span>Орлого нэмэх</span>
        </button>
        {pendingCount > 0 && (
          <div className="pending-notification">
            <span className="notification-badge">{pendingCount}</span>
            <span>Хүлээгдэж буй орлого</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="deposit-tabs">
        <button className={`deposit-tab ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")}>
          Хүлээгдэж буй ({pendingCount})
        </button>
        <button className={`deposit-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          Түүх ({historyDeposits.length})
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === "pending" ? (
        <AdminDepositList deposits={pendingDeposits} onAccept={handleAcceptDeposit} onIgnore={handleDenyDeposit} />
      ) : (
        <AdminDepositList deposits={historyDeposits} showHistory={true} />
      )}

      {isModalOpen && (
        <div className="add-deposit-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="add-deposit-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="add-deposit-modal-header">
              <h2 className="add-deposit-modal-title">
                <FiDollarSign size={24} />
                Орлого нэмэх
              </h2>
              <button className="add-deposit-modal-close" onClick={() => setIsModalOpen(false)} type="button">
                <FiX size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="add-deposit-modal-body">
              <form className="add-deposit-form" onSubmit={handleSubmit} noValidate>
                {/* User Selection */}
                <div className="add-deposit-form-group">
                  <label className="add-deposit-form-label">
                    <FiUser size={16} />
                    Хэрэглэгч
                    <span className="add-deposit-form-label-required">*</span>
                  </label>
                  <div className="add-deposit-user-search" ref={wrapperRef}>
                    <input
                      type="text"
                      className="add-deposit-form-input"
                      placeholder="Нэр эсвэл ID-аар хайх..."
                      value={selectedUsername}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setIsUserDropdownOpen(true);
                        setFormData((prev) => ({ ...prev, userId: "" }));
                      }}
                      onFocus={() => setIsUserDropdownOpen(true)}
                      autoComplete="off"
                    />
                    {isUserDropdownOpen && (
                      <ul className="add-deposit-user-dropdown">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <li
                              key={user.userId}
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, userId: String(user.userId) }));
                                setUserSearch(user.username);
                                setIsUserDropdownOpen(false);
                                setFormErrors((prev) => ({ ...prev, userId: "" }));
                              }}
                              className="add-deposit-user-dropdown-item"
                            >
                              <div className="user-dropdown-item-content">
                                <span className="user-dropdown-name">{user.username}</span>
                                <span className="user-dropdown-id">ID: {user.userId}</span>
                              </div>
                            </li>
                          ))
                        ) : (
                          <li className="add-deposit-user-dropdown-no-results">Хэрэглэгч олдсонгүй</li>
                        )}
                      </ul>
                    )}
                  </div>
                  {formErrors.userId && (
                    <div className="add-deposit-form-error">
                      <FiAlertCircle size={14} />
                      {formErrors.userId}
                    </div>
                  )}
                </div>

                {/* Amount Input */}
                <div className="add-deposit-form-group">
                  <label className="add-deposit-form-label">
                    <FiDollarSign size={16} />
                    Дүн
                    <span className="add-deposit-form-label-required">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    className="add-deposit-form-input"
                    placeholder="Жишээ: 50,000"
                    min={1}
                    value={formData.amount}
                    onChange={handleChange}
                    required
                  />
                  {formErrors.amount && (
                    <div className="add-deposit-form-error">
                      <FiAlertCircle size={14} />
                      {formErrors.amount}
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="add-deposit-modal-footer">
              <button type="button" className="add-deposit-btn add-deposit-btn-cancel" onClick={() => setIsModalOpen(false)}>
                Болих
              </button>
              <button type="submit" className="add-deposit-btn add-deposit-btn-submit" onClick={handleSubmit}>
                <FiDollarSign size={18} />
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deny Action */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, depositId: null })}
        onConfirm={confirmDenyDeposit}
        title="Орлого татгалзах"
        message={`Та "${confirmModal.username}" хэрэглэгчийн ${confirmModal.amount?.toLocaleString(
          "mn-MN",
        )}₮ дүнтэй орлогыг татгалзахдаа итгэлтэй байна уу?`}
        confirmText="Татгалзах"
        cancelText="Болих"
        type="danger"
      />
    </div>
  );
}

export default DepositPage;
