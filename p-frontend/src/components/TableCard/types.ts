import type { GameTable } from "../../api/admin";

export interface TableCardProps {
  record: GameTable;
  activePlayers: number;
  variantLabel: string;
  mobileView: boolean;
  onClick: () => void;
  className?: string;
}
