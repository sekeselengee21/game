import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { CiBank } from "react-icons/ci";
import { FaRegUser } from "react-icons/fa";
import { MdAccountBalanceWallet, MdDriveFileRenameOutline } from "react-icons/md";
import {
  useFetchDataBlocksQuery,
  useCreateDataBlockMutation,
  useUpdateDataBlockMutation,
} from "../../api/admin";
import banks from "../../assets/data/banks";

interface CashierSettings {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

const BLOCK_NAME = "cashier_settings";

const DEFAULT_SETTINGS: CashierSettings = {
  bankName: "Хаан банк",
  accountNumber: "",
  accountHolder: "",
};

function AdminSettingsForm() {
  const { data: blocks, isLoading } = useFetchDataBlocksQuery();
  const [createBlock] = useCreateDataBlockMutation();
  const [updateBlock] = useUpdateDataBlockMutation();

  const [form, setForm] = useState<CashierSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [blockExists, setBlockExists] = useState(false);

  useEffect(() => {
    if (!blocks) return;
    const cashierBlock = blocks.find((b) => b.name === BLOCK_NAME);
    if (cashierBlock) {
      try {
        const parsed: CashierSettings = JSON.parse(cashierBlock.value);
        setForm(parsed);
        setBlockExists(true);
      } catch {
        setBlockExists(true);
      }
    }
  }, [blocks]);

  const handleSave = async () => {
    if (!form.accountNumber.trim() || !form.accountHolder.trim() || !form.bankName.trim()) {
      toast.error("Бүх талбарыг бөглөнө үү!");
      return;
    }

    setSaving(true);
    try {
      const block = { name: BLOCK_NAME, value: JSON.stringify(form) };
      if (blockExists) {
        await updateBlock({ name: BLOCK_NAME, block }).unwrap();
      } else {
        await createBlock(block).unwrap();
        setBlockExists(true);
      }
      toast.success("Тохиргоо амжилттай хадгалагдлаа!");
    } catch {
      toast.error("Хадгалахад алдаа гарлаа!");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="settings-loading">Ачааллаж байна...</div>;
  }

  return (
    <div className="admin-settings-wrapper">
      <div className="admin-settings-form">
        <div className="settings-section-header">
          <h3 className="settings-section-title">Кассирын банкны мэдээлэл</h3>
          <p className="settings-section-desc">
            Хэрэглэгч орлого хийхэд харагдах банкны дансны мэдээлэл
          </p>
        </div>

        <div className="settings-fields">
          <div className="settings-field">
            <label className="settings-label">
              <CiBank className="settings-icon" />
              Банкны нэр
            </label>
            <select
              className="settings-input"
              value={banks.find((b) => b.label === form.bankName)?.value ?? "khanbank"}
              onChange={(e) => {
                const selected = banks.find((b) => b.value === e.target.value);
                setForm((prev) => ({ ...prev, bankName: selected?.label ?? e.target.value }));
              }}
            >
              {banks.map((bank) => (
                <option key={bank.value} value={bank.value}>
                  {bank.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-field">
            <label className="settings-label">
              <MdAccountBalanceWallet className="settings-icon" />
              Дансны дугаар
            </label>
            <input
              type="text"
              className="settings-input"
              value={form.accountNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
              placeholder="Жишээ: MN510005005071414004"
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">
              <FaRegUser className="settings-icon" />
              Данс эзэмшигчийн нэр
            </label>
            <input
              type="text"
              className="settings-input"
              value={form.accountHolder}
              onChange={(e) => setForm((prev) => ({ ...prev, accountHolder: e.target.value }))}
              placeholder="Жишээ: Нямчулуун"
            />
          </div>
        </div>

        <button className="settings-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Хадгалж байна..." : "Хадгалах"}
        </button>
      </div>

      {/* Preview */}
      <div className="settings-preview">
        <div className="settings-preview-label">Хэрэглэгчид харагдах байдал</div>
        <div className="settings-preview-card">
          <div className="preview-bank-row">
            <CiBank />
            <span>Банкны нэр : {form.bankName || "—"}</span>
          </div>
          <div className="preview-bank-row">
            <MdAccountBalanceWallet />
            <span>Bank account : {form.accountNumber || "—"}</span>
          </div>
          <div className="preview-bank-row">
            <FaRegUser />
            <span>Данс эзэмшигч : {form.accountHolder || "—"}</span>
          </div>
          <div className="preview-bank-row preview-note">
            <MdDriveFileRenameOutline />
            <span>
              Гүйлгээний утга хэсэгт өөрийн <b>Username-ээ</b> заавал бичнэ үү.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettingsForm;
