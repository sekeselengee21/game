import { useState } from "react";
import { toast } from "react-toastify";
import { useSendBroadcastMessageMutation } from "../../api/admin";
import AdminSettingsForm from "../../features/admin/admin-settings-form";

function AdminSettingsPage() {
  const [message, setMessage] = useState("");
  const [sendBroadcast, { isLoading }] = useSendBroadcastMessageMutation();

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Мэдэгдэл бичнэ үү!");
      return;
    }
    try {
      await sendBroadcast({ message: message.trim() }).unwrap();
      toast.success("Мэдэгдэл амжилттай илгээгдлээ!");
      setMessage("");
    } catch {
      toast.error("Мэдэгдэл илгээхэд алдаа гарлаа!");
    }
  };

  return (
    <div className="admin-settings-page">
      <h2 className="admin-section-title">Системийн мэдэгдэл илгээх</h2>
      <p className="admin-section-desc">
        Энэ мэдэгдэл бүх тоглогчийн дэлгэц дээр modal хэлбэрээр харагдана.
      </p>
      <div className="broadcast-form">
        <textarea
          className="broadcast-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Мэдэгдэл бичих..."
          rows={4}
        />
        <button
          className="broadcast-send-btn"
          onClick={handleSend}
          disabled={isLoading}
        >
          {isLoading ? "Илгээж байна..." : "Бүх тоглогчид илгээх"}
        </button>
      </div>

      <hr className="settings-divider" />

      <AdminSettingsForm />
    </div>
  );
}

export default AdminSettingsPage;
