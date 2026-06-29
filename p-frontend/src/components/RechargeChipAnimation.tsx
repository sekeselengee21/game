import React, { memo } from "react";
import chip_a from "../assets/chips/1.svg";
import chip_b from "../assets/chips/9.svg";
import chip_c from "../assets/chips/17.svg";
import chip_d from "../assets/chips/25.svg";

// Each entry: [img, startX (px), startY (px), delay (ms), endRotation (deg)]
const CHIPS: [string, number, number, number, number][] = [
  [chip_a, -42, -58, 0,   -25],
  [chip_b,  -8, -68, 70,   8],
  [chip_c,  28, -60, 140,  22],
  [chip_d, -28, -50, 210, -12],
  [chip_a,  14, -72, 280,  30],
  [chip_b, -18, -64, 350, -18],
];

interface Props {
  animKey: number;
}

const RechargeChipAnimation: React.FC<Props> = ({ animKey }) => (
  <>
    {CHIPS.map(([img, sx, sy, delay, rot], i) => (
      <img
        key={`${animKey}-${i}`}
        src={img}
        alt=""
        aria-hidden="true"
        className="rca-chip"
        style={{
          "--rca-sx": `${sx}px`,
          "--rca-sy": `${sy}px`,
          "--rca-rot": `${rot}deg`,
          animationDelay: `${delay}ms`,
        } as React.CSSProperties}
      />
    ))}
  </>
);

export default memo(RechargeChipAnimation);
