import Chip500 from "../assets/chips/8.svg";
import Chip1k from "../assets/chips/9.svg";
import Chip25k from "../assets/chips/10.svg";
import Chip5k from "../assets/chips/11.svg";
import Chip100 from "../assets/chips/12.svg";
import Chip50 from "../assets/chips/13.svg";
import Chip100k from "../assets/chips/14.svg";

export const CHIP_VALUES = [
  { value: 100000, svg: Chip100k },
  { value: 25000, svg: Chip25k },
  { value: 5000, svg: Chip5k },
  { value: 1000, svg: Chip1k },
  { value: 500, svg: Chip500 },
  { value: 100, svg: Chip100 },
  { value: 50, svg: Chip50 },
];

export function getChipsForAmount(amount: number) {
  const chips: { svg: string; count: number }[] = [];
  let remaining = amount;

  for (const chip of CHIP_VALUES) {
    const count = Math.floor(remaining / chip.value);
    if (count > 0) {
      chips.push({ svg: chip.svg, count });
      remaining -= count * chip.value;
    }
  }

  return chips;
}
