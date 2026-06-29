import { useEffect, useState } from "react";
import {
  useCreateTableMutation,
  useDeleteTableMutation,
  useUpdateTableMutation,
  useStartSimulationMutation,
  useStopSimulationMutation,
  type GameTable,
} from "../../api/admin";
import AdminTableList from "../../features/admin/admin-table-list";
import { useFetchTablesQuery } from "../../api/user";
import { FiPlus, FiX, FiInfo, FiUsers, FiDollarSign, FiActivity } from "react-icons/fi";

function AdminTable() {
  const { data, refetch: fetchTables } = useFetchTablesQuery();

  const [modalType, setModalType] = useState<"create" | "edit" | "">("");
  const [createTable, { isError: isCreateError, error: createError, isSuccess: isCreateSuccess }] = useCreateTableMutation();
  const [updateTable, { isError: isUpdateError, error: updateError, isSuccess: isUpdateSuccess }] = useUpdateTableMutation();
  const [deleteTable, { isError: isDeleteError, error: deleteError, isSuccess: isDeleteSuccess }] = useDeleteTableMutation();
  const [startSimulation] = useStartSimulationMutation();
  const [stopSimulation] = useStopSimulationMutation();

  const [message, setMessage] = useState<string | null>(null);
  const [editTable, setEditTable] = useState<GameTable | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formValues, setFormValues] = useState<
    Partial<GameTable> & { rakePercent?: number; smallBlind?: number; bigBlind?: number; minBuyIn?: number; maxBuyIn?: number }
  >({ rakePercent: 0.01, maxPlayers: 6 });

  useEffect(() => {
    if (modalType === "edit" && editTable) {
      setFormValues(editTable);
    } else if (modalType === "create") {
      setFormValues({ rakePercent: 0.01, maxPlayers: 6 });
    }
  }, [modalType, editTable]);

  useEffect(() => {
    if (isCreateError) {
      const msg = "data" in createError && (createError as any).data?.errorMessage;
      setMessage(msg);
      setIsSubmitting(false);
    } else if (isCreateSuccess) {
      setMessage("Ширээ амжилттай үүслээ");
      setModalType("");
      fetchTables();
      setIsSubmitting(false);
    }
  }, [isCreateError, createError, isCreateSuccess, fetchTables]);

  useEffect(() => {
    if (isUpdateError) {
      const msg =
        "data" in updateError && (updateError as any).data?.errorMessage
          ? "Засахад алдаа гарлаа: " + (updateError as any).data.errorMessage
          : "Засахад алдаа гарлаа";
      setMessage(msg);
      setIsSubmitting(false);
    } else if (isUpdateSuccess) {
      setMessage("Ширээ амжилттай засагдлаа");
      setModalType("");
      fetchTables();
      setIsSubmitting(false);
    }
  }, [isUpdateError, updateError, isUpdateSuccess, fetchTables]);

  useEffect(() => {
    if (isDeleteError) {
      const msg =
        "data" in deleteError && (deleteError as any).data?.errorMessage
          ? "Устгахад алдаа гарлаа: " + (deleteError as any).data.errorMessage
          : "Устгахад алдаа гарлаа";
      setMessage(msg);
    } else if (isDeleteSuccess) {
      setMessage("Ширээ амжилттай устгагдлаа");
      fetchTables();
    }
  }, [isDeleteError, deleteError, isDeleteSuccess, fetchTables]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;

    setFormValues((prev) => {
      const numericFields = ["smallBlind", "maxPlayers"];

      const updated: typeof formValues = {
        ...prev,
        [name]: numericFields.includes(name) ? Number(value) : value,
      };

      if (name === "rakePercent") {
        updated.rakePercent = parseFloat(value) / 100;
      }

      if (name === "smallBlind") {
        const sb = Number(value);
        updated.bigBlind = sb * 2;
        updated.minBuyIn = sb * 40;
        updated.maxBuyIn = sb * 4000;
      }

      return updated;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    const payload: GameTable = { ...formValues, tableId: editTable?.tableId } as GameTable;

    if (modalType === "edit" && editTable) {
      updateTable(payload);
    } else if (modalType === "create") {
      createTable(payload);
    }
  }

  return (
    <div className="admin-table-container">
      {message && <div className="admin-message">{message}!!!</div>}

      <div className="create-button-container button">
        <button className="create-table-button" onClick={() => setModalType("create")} title="Ширээ нэмэх">
          <FiPlus size={20} />
          <span>Ширээ үүсгэх</span>
        </button>
      </div>

      {modalType && (
        <div className="create-table-modal-overlay" onClick={() => setModalType("")}>
          <div className="create-table-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="create-table-modal-header">
              <h2 className="create-table-modal-title">
                <FiActivity size={24} />
                {modalType === "create" ? "Ширээ үүсгэх" : "Ширээ засах"}
              </h2>
              <button className="create-table-modal-close" onClick={() => setModalType("")} type="button">
                <FiX size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="create-table-modal-body">
              <form className="create-table-form" onSubmit={handleSubmit} noValidate>
                {/* Table Name */}
                <div className="create-table-form-group create-table-form-group-full">
                  <label className="create-table-form-label">
                    <FiActivity size={16} />
                    Ширээний нэр
                    <span className="create-table-form-label-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="tableName"
                    value={formValues.tableName || ""}
                    onChange={handleChange}
                    placeholder="Жишээ: VIP Ширээ, Анхан шат, Pro ширээ"
                    required
                    className="create-table-form-input"
                  />
                  <span className="create-table-helper-text">
                    <FiInfo size={12} />
                    Тоглогчид харах нэр
                  </span>
                </div>

                {/* Game Variant & Max Players Row */}
                <div className="create-table-form-row">
                  <div className="create-table-form-group">
                    <label className="create-table-form-label">
                      <FiActivity size={16} />
                      Тоглоомын төрөл
                      <span className="create-table-form-label-required">*</span>
                    </label>
                    <select
                      name="gameVariant"
                      value={formValues.gameVariant || ""}
                      onChange={handleChange}
                      required
                      className="create-table-form-select"
                    >
                      <option value="" disabled>
                        Сонгох...
                      </option>
                      <option value="TEXAS">Texas Hold'em</option>
                      <option value="OMAHA">Omaha</option>
                    </select>
                  </div>

                  <div className="create-table-form-group">
                    <label className="create-table-form-label">
                      <FiUsers size={16} />
                      Тоглогчдын тоо
                      <span className="create-table-form-label-required">*</span>
                    </label>
                    <select
                      name="maxPlayers"
                      value={formValues.maxPlayers ?? 6}
                      onChange={handleChange}
                      className="create-table-form-select"
                      required
                    >
                      <option value={6}>6 тоглогч</option>
                      <option value={8}>8 тоглогч</option>
                      <option value={9}>9 тоглогч</option>
                    </select>
                  </div>
                </div>

                {/* Small Blind & Rake Row */}
                <div className="create-table-form-row">
                  <div className="create-table-form-group">
                    <label className="create-table-form-label">
                      <FiDollarSign size={16} />
                      Small Blind
                      <span className="create-table-form-label-required">*</span>
                    </label>
                    <input
                      type="number"
                      name="smallBlind"
                      value={formValues.smallBlind ?? ""}
                      onChange={handleChange}
                      min={1}
                      placeholder="Жишээ: 50, 100, 500"
                      required
                      className="create-table-form-input"
                    />
                    <span className="create-table-helper-text">
                      <FiInfo size={12} />
                      Бусад утга автоматаар тооцоологдоно
                    </span>
                  </div>

                  <div className="create-table-form-group">
                    <label className="create-table-form-label">
                      <FiDollarSign size={16} />
                      Rake хувь
                      <span className="create-table-form-label-required">*</span>
                    </label>
                    <input
                      type="number"
                      name="rakePercent"
                      value={parseFloat(((formValues.rakePercent ?? 0.01) * 100).toFixed(4))}
                      onChange={handleChange}
                      min="0.1"
                      max="20"
                      step="0.1"
                      required
                      className="create-table-form-input"
                    />
                    <span className="create-table-helper-text">
                      <FiInfo size={12} />
                      Хувиар оруулна уу (жишээ: 1, 1.5, 2.5)
                    </span>
                  </div>
                </div>

                {/* Hidden fields for auto-calculated values */}
                <input type="hidden" name="bigBlind" value={formValues.bigBlind ?? 0} />
                <input type="hidden" name="minBuyIn" value={formValues.minBuyIn ?? 0} />
                <input type="hidden" name="maxBuyIn" value={formValues.maxBuyIn ?? 0} />

                {/* Auto-calculated values display */}
                {formValues.smallBlind && (
                  <div className="create-table-info-box">
                    <div className="create-table-info-title">
                      <FiInfo size={16} />
                      Автоматаар тооцоологдсон утгууд
                    </div>
                    <div className="create-table-info-grid">
                      <div className="create-table-info-item">
                        <span className="create-table-info-label">Big Blind</span>
                        <span className="create-table-info-value">{formValues.bigBlind?.toLocaleString("mn-MN") || 0}₮</span>
                      </div>
                      <div className="create-table-info-item">
                        <span className="create-table-info-label">Min Buy-in</span>
                        <span className="create-table-info-value">{formValues.minBuyIn?.toLocaleString("mn-MN") || 0}₮</span>
                      </div>
                      <div className="create-table-info-item">
                        <span className="create-table-info-label">Max Buy-in</span>
                        <span className="create-table-info-value">{formValues.maxBuyIn?.toLocaleString("mn-MN") || 0}₮</span>
                      </div>
                      <div className="create-table-info-item">
                        <span className="create-table-info-label">Rake</span>
                        <span className="create-table-info-value">{parseFloat(((formValues.rakePercent ?? 0.01) * 100).toFixed(2))}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="create-table-modal-footer">
              <button type="button" className="create-table-btn create-table-btn-cancel" onClick={() => setModalType("")}>
                Болих
              </button>
              <button type="submit" className="create-table-btn create-table-btn-submit" onClick={handleSubmit} disabled={isSubmitting}>
                <FiActivity size={18} />
                {modalType === "create" ? "Ширээ үүсгэх" : "Ширээ шинэчлэх"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminTableList
        fetchTables={fetchTables}
        tables={data ?? []}
        deleteTable={(table) => deleteTable(table?.tableId)}
        editTable={(table) => {
          setEditTable(table);
          setModalType("edit");
        }}
        startSimulation={startSimulation}
        stopSimulation={stopSimulation}
      />
    </div>
  );
}

export default AdminTable;
