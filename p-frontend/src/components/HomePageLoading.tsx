import { useEffect } from "react";

interface Props {
  message?: string;
  progress?: number;
  onComplete?: () => void;
}

export default function HomePageLoading({ progress = 0, onComplete }: Props) {
  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => onComplete?.(), 500);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  return (
    <div className="homepage-loading-fullscreen">
      <div className="loading-overlay">
        <div className="loading-center-logo" />

        <div className="progress-bar-container-bottom">
          <div className="progress-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
