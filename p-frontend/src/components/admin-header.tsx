import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { setAuthenticated, setUserInfo } from "../providers/auth-slice";
import { useMeQuery } from "../api/user";
import { AiOutlineHome, AiOutlineMenuFold, AiOutlineMenuUnfold } from "react-icons/ai";

type Props = {
  collapsed: boolean;
  onToggleCollapse: () => void;
};

function AdminHeader({ collapsed, onToggleCollapse }: Props) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);
  const token = localStorage.getItem("accessToken");
  const { data: userInfo, refetch } = useMeQuery(undefined, { skip: !token });

  useEffect(() => {
    refetch();
  }, [isAuthenticated]);

  useEffect(() => {
    if (userInfo) {
      dispatch(setAuthenticated(true));
      dispatch(setUserInfo(userInfo));
    }
  }, [userInfo]);

  return (
    <div className="admin-header">
      <div className="admin-header-left">
        <button className="icon-button" onClick={onToggleCollapse}>
          {collapsed ? <AiOutlineMenuUnfold size={20} /> : <AiOutlineMenuFold size={20} />}
        </button>
        <span className="admin-title">Admin Panel</span>
      </div>

      <div className="admin-header-right">
        <button className="icon-button" onClick={() => navigate("/")}>
          <AiOutlineHome size={20} />
        </button>
      </div>
    </div>
  );
}

export default AdminHeader;
