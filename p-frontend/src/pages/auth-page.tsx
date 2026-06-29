import { lazy, Suspense } from "react";
import { useNavigate } from "react-router";

// Lazy-load the forms
const LoginForm = lazy(() => import("../features/user/login-form"));
const RegisterForm = lazy(() => import("../features/user/register-form"));

function AuthPage({ type }: { type: string }) {
  const navigate = useNavigate();
  const setModalType = (modalType: string) => {
    navigate("/auth/" + modalType);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 1001,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 0,
        overflow: "hidden",
      }}
    >
      <div 
        className="auth-modal-container"
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "500px",
          maxHeight: "90vh",
          display: "flex",
          overflow: "hidden",
        }}
      >
        <Suspense fallback={null}>
          {type === "register" && <RegisterForm setModalType={setModalType} />}
          {type === "login" && <LoginForm setModalType={setModalType} />}
        </Suspense>
      </div>
    </div>
  );
}

export default AuthPage;
