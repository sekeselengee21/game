import { useMeQuery } from "../../api/user";
import WithdrawTable from "../../features/user/withdraw-table";

interface UserWithdrawPageProps {
  balance?: number;
}

function UserWithdrawPage({ balance }: UserWithdrawPageProps) {
  const token = localStorage.getItem("accessToken");
  const { data } = useMeQuery(undefined, { skip: !token });

  const effectiveBalance = balance ?? data?.userBalance?.balance ?? 0;

  return <WithdrawTable balance={effectiveBalance} />;
}

export default UserWithdrawPage;
