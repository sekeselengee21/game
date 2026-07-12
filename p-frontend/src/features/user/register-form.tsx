import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { useRegisterMutation, type User } from "../../api/user";
import { setAuthenticated } from "../../providers/auth-slice";
import banks from "../../assets/data/banks";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function RegisterForm({ setModalType }: { setModalType: (type: string) => void }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [register, { isLoading, data, isError, error }] = useRegisterMutation();

  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    passwordRepeat: "",
    bankName: "",
    accountNumber: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (data) {
      toast.success("Амжилттай бүртгэгдлээ!", {
        position: "top-right",
        autoClose: 2000,
      });

      localStorage.setItem("accessToken", data.token);
      dispatch(setAuthenticated(true));
      setModalType("");
      navigate("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when registration succeeds (data becomes set); dispatch/navigate/setModalType are effectively stable
  }, [data]);

  useEffect(() => {
    if (isError) {
      const msg =
        error && "data" in error && (error as { data?: { errorMessage: string } }).data?.errorMessage ? (error as { data?: { errorMessage: string } }).data!.errorMessage : "Бүртгэл амжилтгүй. Дахин оролдоно уу.";

      setErrorMessage(msg);

      toast.error(msg, {
        position: "top-right",
        autoClose: 2500,
      });
    }
  }, [isError, error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (formData.password !== formData.passwordRepeat) {
      setErrorMessage("Нууц үг таарахгүй байна.");
      toast.error("Нууц үг таарахгүй байна.", { autoClose: 2000 });
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage("Нууц үг багадаа 8 тэмдэгт байх ёстой.");
      toast.error("Нууц үг багадаа 8 тэмдэгт байх ёстой.", { autoClose: 2000 });
      return;
    }

    const normalizedData = {
      ...formData,
      username: formData.username.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
    };

    register(normalizedData as unknown as User);
  };

  return (
    <form onSubmit={handleSubmit} className="register-form">
      <div className="register-form-fields">
        {errorMessage && <div className="form-error">{errorMessage}</div>}

        <div className="form-field">
          <label className="form-label">И-мэйл</label>
          <input
            name="email"
            type="email"
            placeholder="И-мэйл"
            className="register-form-input"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label">Бүртгүүлэх нэр</label>
          <input
            name="username"
            placeholder="Бүртгүүлэх нэр"
            className="register-form-input"
            value={formData.username}
            onChange={handleChange}
            autoComplete="username"
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label">Нууц үг</label>
          <div className="password-wrapper">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="*Нууц үг"
              className="register-form-input-custom"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <span className="login-form-toggle-password" onClick={() => setShowPassword((prev) => !prev)}>
              {showPassword ? <div className="password-toggle eye-open" /> : <div className="password-toggle eye-closed" />}
            </span>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Нууц үгээ дахин оруулна уу</label>
          <div className="password-wrapper">
            <input
              name="passwordRepeat"
              type={showRepeatPassword ? "text" : "password"}
              placeholder="*Нууц үгээ дахин оруулна уу"
              className="register-form-input-custom"
              value={formData.passwordRepeat}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <span className="login-form-toggle-password" onClick={() => setShowRepeatPassword((prev) => !prev)}>
              {showRepeatPassword ? <div className="password-toggle eye-open" /> : <div className="password-toggle eye-closed" />}
            </span>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Банк</label>
          <div className="custom-select-wrapper">
            <select name="bankName" className="custom-bank-select" value={formData.bankName} onChange={handleChange} required>
              <option value="">Банк сонгох</option>
              {banks.map((bank) => (
                <option key={bank.value} value={bank.value}>
                  {bank.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Дансны дугаар</label>
          <input
            name="accountNumber"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Дансны дугаар"
            className="register-form-input"
            value={formData.accountNumber}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="register-form-actions">
        <button type="submit" className="login-form-submit" disabled={isLoading}>
          {isLoading ? "Бүртгэж байна..." : "Бүртгүүлэх"}
        </button>
      </div>
    </form>
  );
}

export default RegisterForm;
