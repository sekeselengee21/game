import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { useLoginMutation, useLazyMeQuery, type LoginCredentials } from "../../api/user";
import { setAuthenticated, setUserInfo, setUserBalance } from "../../providers/auth-slice";

function LoginForm({ setModalType }: { setModalType: (type: string) => void }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [login, { data: loginData, isLoading, isError, error }] = useLoginMutation();
  const [fetchMe] = useLazyMeQuery();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginCredentials>({ username: "", password: "" });
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (loginData) {
      localStorage.setItem("accessToken", loginData.token);
      dispatch(setAuthenticated(true));

      fetchMe()
        .unwrap()
        .then((res) => {
          dispatch(setUserInfo(res));
          dispatch(setUserBalance(res.userBalance?.balance ?? 0));
        })
        .catch(() => {
          const msg = "Failed to fetch user info after login.";
          setFeedback(msg);
        });

      setFeedback("Амжилттай нэвтэрлээ!");
      setModalType("");
      navigate("/");
    }
  }, [loginData, fetchMe, dispatch, navigate, setModalType]);

  useEffect(() => {
    if (isError) {
      let errMsg = "Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу!";

      if (error && "data" in error && (error as { data?: { errorMessage: string } }).data?.errorMessage) {
        const serverMsg = (error as { data?: { errorMessage: string } }).data!.errorMessage;
        const errorMap: Record<string, string> = {
          INVALID_CREDENTIALS: "Хэрэглэгчийн нэр эсвэл нууц үг буруу байна!",
          USER_NOT_FOUND: "Хэрэглэгч олдсонгүй!",
        };
        errMsg = errorMap[serverMsg] ?? serverMsg;
      }

      setFeedback(errMsg);
    }
  }, [isError, error]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    let { value } = e.target;
    if (name === "username") value = value.trim().toLowerCase();
    setFormData({ ...formData, [name]: value });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ ...formData, username: formData.username.trim().toLowerCase() });
  };

  return (
    <form onSubmit={onSubmit} className="login-form">
      <div className="login-form-fields">
        {feedback && <div className="login-form-feedback">{feedback}</div>}

        <div className="form-field">
          <label className="form-label">Нэвтрэх нэр</label>
          <div className="login-form-item login-form-username">
            <input
              type="text"
              name="username"
              placeholder="Нэвтрэх нэр"
              value={formData.username}
              onChange={onChange}
              className="login-form-input"
              autoComplete="username"
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Нууц үг</label>
          <div className="login-form-item login-form-password">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="*Нууц үг"
              value={formData.password}
              onChange={onChange}
              className="login-form-input"
              autoComplete="current-password"
            />
            <span onClick={() => setShowPassword(!showPassword)} className="login-form-toggle-password">
              {showPassword ? <div className="password-toggle eye-open" /> : <div className="password-toggle eye-closed" />}
            </span>
          </div>
        </div>
      </div>

      <div className="login-form-actions">
        <button type="submit" className="login-form-submit" disabled={isLoading}>
          {isLoading ? "Нэвтэрч байна..." : "Нэвтрэх"}
        </button>
      </div>
      <div className="contact-section">
        <p>Танд бүртгэл байхгүй юу?</p>
        <a className="contact-link" onClick={() => setModalType("register")}>
          Бүртгүүлэх
        </a>
      </div>
    </form>
  );
}

export default LoginForm;
