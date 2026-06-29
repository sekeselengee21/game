import CloverAce from "./1c.svg";
import CloverTwo from "./2c.svg";
import CloverThree from "./3c.svg";
import CloverFour from "./4c.svg";
import CloverFive from "./5c.svg";
import CloverSix from "./6c.svg";
import CloverSeven from "./7c.svg";
import CloverEight from "./8c.svg";
import CloverNine from "./9c.svg";
import CloverTen from "./10c.svg";
import CloverJack from "./jc.svg";
import CloverQueen from "./qc.svg";
import CloverKing from "./kc.svg";

import HeartAce from "./1h.svg";
import HeartTwo from "./2h.svg";
import HeartThree from "./3h.svg";
import HeartFour from "./4h.svg";
import HeartFive from "./5h.svg";
import HeartSix from "./6h.svg";
import HeartSeven from "./7h.svg";
import HeartEight from "./8h.svg";
import HeartNine from "./9h.svg";
import HeartTen from "./10h.svg";
import HeartJack from "./jh.svg";
import HeartQueen from "./qh.svg";
import HeartKing from "./kh.svg";

import SpadeAce from "./1s.svg";
import SpadeTwo from "./2s.svg";
import SpadeThree from "./3s.svg";
import SpadeFour from "./4s.svg";
import SpadeFive from "./5s.svg";
import SpadeSix from "./6s.svg";
import SpadeSeven from "./7s.svg";
import SpadeEight from "./8s.svg";
import SpadeNine from "./9s.svg";
import SpadeTen from "./10s.svg";
import SpadeJack from "./js.svg";
import SpadeQueen from "./qs.svg";
import SpadeKing from "./ks.svg";

import DiamondAce from "./1d.svg";
import DiamondTwo from "./2d.svg";
import DiamondThree from "./3d.svg";
import DiamondFour from "./4d.svg";
import DiamondFive from "./5d.svg";
import DiamondSix from "./6d.svg";
import DiamondSeven from "./7d.svg";
import DiamondEight from "./8d.svg";
import DiamondNine from "./9d.svg";
import DiamondTen from "./10d.svg";
import DiamondJack from "./jd.svg";
import DiamondQueen from "./qd.svg";
import DiamondKing from "./kd.svg";

import BackCard from "./b.svg";

const HeartSuit = {
  ACE: HeartAce,
  TWO: HeartTwo,
  THREE: HeartThree,
  FOUR: HeartFour,
  FIVE: HeartFive,
  SIX: HeartSix,
  SEVEN: HeartSeven,
  EIGHT: HeartEight,
  NINE: HeartNine,
  TEN: HeartTen,
  JACK: HeartJack,
  QUEEN: HeartQueen,
  KING: HeartKing,
};

const CloverSuit = {
  ACE: CloverAce,
  TWO: CloverTwo,
  THREE: CloverThree,
  FOUR: CloverFour,
  FIVE: CloverFive,
  SIX: CloverSix,
  SEVEN: CloverSeven,
  EIGHT: CloverEight,
  NINE: CloverNine,
  TEN: CloverTen,
  JACK: CloverJack,
  QUEEN: CloverQueen,
  KING: CloverKing,
};

const SpadeSuit = {
  ACE: SpadeAce,
  TWO: SpadeTwo,
  THREE: SpadeThree,
  FOUR: SpadeFour,
  FIVE: SpadeFive,
  SIX: SpadeSix,
  SEVEN: SpadeSeven,
  EIGHT: SpadeEight,
  NINE: SpadeNine,
  TEN: SpadeTen,
  JACK: SpadeJack,
  QUEEN: SpadeQueen,
  KING: SpadeKing,
};

const DiamondSuit = {
  ACE: DiamondAce,
  TWO: DiamondTwo,
  THREE: DiamondThree,
  FOUR: DiamondFour,
  FIVE: DiamondFive,
  SIX: DiamondSix,
  SEVEN: DiamondSeven,
  EIGHT: DiamondEight,
  NINE: DiamondNine,
  TEN: DiamondTen,
  JACK: DiamondJack,
  QUEEN: DiamondQueen,
  KING: DiamondKing,
};

const PokerCardImage = {
  HEARTS: HeartSuit,
  CLUBS: CloverSuit,
  SPADES: SpadeSuit,
  DIAMONDS: DiamondSuit,
};

export { PokerCardImage, BackCard };
