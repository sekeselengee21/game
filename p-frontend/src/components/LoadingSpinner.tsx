
interface Props {
  message?: string;
}

export default function LoadingSpinner({ message }: Props) {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      {message && <p>{message}</p>}
    </div>
  );
}
