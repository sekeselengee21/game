// hooks/useLogout.ts

import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { logout } from "../providers/auth-slice"; // Import the logout action

const useLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  return handleLogout;
};

export default useLogout;
