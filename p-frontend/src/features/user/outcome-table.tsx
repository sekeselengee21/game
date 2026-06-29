import { useFetchOutcomesQuery } from "../../api/user";

function OutcomeTable() {
  const { data } = useFetchOutcomesQuery();

  const renderType = (type: string) => {
    switch (type) {
      case "GAMEPLAY":
        return "Gameplay";
      case "BONUS":
        return "Bonus";
      case "RECHARGE":
        return "Recharge";
      case "LEAVE_SEAT":
        return "Leave Seat";
      case "BUY_IN":
        return "Buy In";
      default:
        return type;
    }
  };

  const recentOutcomes = [...(data || [])]
    .filter((o) => o.accountDate !== null)
    .sort((a, b) => new Date(b.accountDate!).getTime() - new Date(a.accountDate!).getTime())
    .slice(0, 20);

  const formatAmount = (amount: number) => amount.toLocaleString(undefined, { style: "currency", currency: "MNT" });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return date.toLocaleString(undefined, options);
  };

  return (
    <div className="outcome-table-container">
      <table className="outcome-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {recentOutcomes.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center" }}>
                No outcomes
              </td>
            </tr>
          ) : (
            recentOutcomes.map((outcome) => (
              <tr key={outcome.outcomeId}>
                <td>{outcome.outcomeId}</td>
                <td>{renderType(outcome.type)}</td>
                <td>{formatAmount(outcome.amount)}</td>
                <td>{formatDate(outcome.accountDate)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default OutcomeTable;
