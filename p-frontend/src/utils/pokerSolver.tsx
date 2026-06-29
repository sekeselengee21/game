import type { GameCard, GameHand } from "../api/game";

const rankOrder: Record<Exclude<GameCard["rank"], null>, number> = {
  ACE: 14,
  KING: 13,
  QUEEN: 12,
  JACK: 11,
  TEN: 10,
  NINE: 9,
  EIGHT: 8,
  SEVEN: 7,
  SIX: 6,
  FIVE: 5,
  FOUR: 4,
  THREE: 3,
  TWO: 2,
};

const handRankStrength: Record<GameHand["rank"], number> = {
  HIGH_CARD: 1,
  ONE_PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10,
};

function rankValue(rank: GameCard["rank"] | null): number {
  return rank ? rankOrder[rank] : 0;
}

function sortByRankDesc(cards: GameCard[]): GameCard[] {
  return [...cards].sort((a, b) => rankValue(b.rank) - rankValue(a.rank));
}

function countByRank(cards: GameCard[]): Record<string, GameCard[]> {
  const counts: Record<string, GameCard[]> = {};
  for (const c of cards) {
    if (!c.rank) continue;
    counts[c.rank] ??= [];
    counts[c.rank].push(c);
  }
  return counts;
}

function countBySuit(cards: GameCard[]): Record<string, GameCard[]> {
  const counts: Record<string, GameCard[]> = {};
  for (const c of cards) {
    if (!c.suit) continue;
    counts[c.suit] ??= [];
    counts[c.suit].push(c);
  }
  return counts;
}

function getUniqueRanks(cards: GameCard[]): number[] {
  return [...new Set(cards.map((c) => rankValue(c.rank)))].sort((a, b) => b - a);
}

function isStraight(ranks: number[]): number[] | null {
  for (let i = 0; i <= ranks.length - 5; i++) {
    const slice = ranks.slice(i, i + 5);
    if (slice[0] - slice[4] === 4) return slice;
  }
  if ([14, 5, 4, 3, 2].every((r) => ranks.includes(r))) {
    return [5, 4, 3, 2, 1];
  }
  return null;
}

function describeHoleCards(cards: GameCard[]): string {
  if (cards.length !== 2) return "";

  const map: Record<Exclude<GameCard["rank"], null>, string> = {
    ACE: "A",
    KING: "K",
    QUEEN: "Q",
    JACK: "J",
    TEN: "T",
    NINE: "9",
    EIGHT: "8",
    SEVEN: "7",
    SIX: "6",
    FIVE: "5",
    FOUR: "4",
    THREE: "3",
    TWO: "2",
  };

  const [a, b] = cards;
  if (!a.rank || !b.rank) return "";

  const highFirst = rankValue(a.rank) >= rankValue(b.rank) ? [map[a.rank], map[b.rank]] : [map[b.rank], map[a.rank]];

  return `${highFirst.join("")} ${a.suit === b.suit ? "Suited" : "Offsuit"}`;
}

function evaluateFiveCards(cards: GameCard[]): GameHand & { description?: string } {
  const sorted = sortByRankDesc(cards);
  const ranks = countByRank(sorted);
  const suits = countBySuit(sorted);
  const uniqueRanks = getUniqueRanks(sorted);

  let flushSuit: GameCard["suit"] | null = null;
  for (const s in suits) {
    if (suits[s].length >= 5) flushSuit = s as GameCard["suit"];
  }

  const straightRanks = isStraight(uniqueRanks);

  if (flushSuit) {
    const flushCards = suits[flushSuit];
    const flushRanks = getUniqueRanks(flushCards);
    const sf = isStraight(flushRanks);
    if (sf) {
      const sfCards = sf.map((r) => flushCards.find((c) => rankValue(c.rank) === (r === 1 ? 14 : r))!);
      return {
        rank: sf[0] === 14 ? "ROYAL_FLUSH" : "STRAIGHT_FLUSH",
        rankCards: sfCards,
        combinationCards: sfCards,
      };
    }
  }

  const groups = Object.values(ranks)
    .filter((g) => g.length > 0)
    .sort((a, b) => b.length - a.length || rankValue(b[0]?.rank) - rankValue(a[0]?.rank));

  if (groups[0]?.length === 4) {
    const kicker = sorted.find((c) => c.rank !== groups[0][0]?.rank);
    return {
      rank: "FOUR_OF_A_KIND",
      rankCards: groups[0],
      combinationCards: [...groups[0], ...(kicker ? [kicker] : [])],
    };
  }

  if (groups[0]?.length === 3 && groups[1]?.length >= 2) {
    return {
      rank: "FULL_HOUSE",
      rankCards: groups[0],
      combinationCards: [...groups[0], ...groups[1].slice(0, 2)],
    };
  }

  if (flushSuit) {
    const flush = suits[flushSuit].slice(0, 5);
    return { rank: "FLUSH", rankCards: flush, combinationCards: flush };
  }

  if (straightRanks) {
    const straight = straightRanks.map((r) => sorted.find((c) => rankValue(c.rank) === (r === 1 ? 14 : r))!);
    return { rank: "STRAIGHT", rankCards: straight, combinationCards: straight };
  }

  if (groups[0]?.length === 3) {
    const kickers = sorted.filter((c) => c.rank !== groups[0][0]?.rank).slice(0, 2);
    return {
      rank: "THREE_OF_A_KIND",
      rankCards: groups[0],
      combinationCards: [...groups[0], ...kickers],
    };
  }

  if (groups[0]?.length === 2 && groups[1]?.length === 2) {
    const kicker = sorted.find((c) => c.rank !== groups[0][0]?.rank && c.rank !== groups[1][0]?.rank);
    return {
      rank: "TWO_PAIR",
      rankCards: [groups[0][0], groups[1][0]],
      combinationCards: [...groups[0], ...groups[1], ...(kicker ? [kicker] : [])],
    };
  }

  if (groups[0]?.length === 2) {
    const kickers = sorted.filter((c) => c.rank !== groups[0][0]?.rank).slice(0, 3);
    return {
      rank: "ONE_PAIR",
      rankCards: groups[0],
      combinationCards: [...groups[0], ...kickers],
    };
  }

  return {
    rank: "HIGH_CARD",
    rankCards: sorted.slice(0, 1),
    combinationCards: sorted.slice(0, 5),
    description: cards.length === 2 ? describeHoleCards(cards) : undefined,
  };
}

// Pick the strongest 5-card hand for a player. The evaluation rules differ by
// hole-card count:
//   - Texas (2 hole cards): combine hole + board, choose any 5.
//   - Omaha (4 hole cards): must use exactly 2 hole + exactly 3 board cards.
// The caller passes hole and board separately so we apply the right rule
// from the flop onward — a previous version dispatched on total length and
// therefore mis-evaluated the Omaha flop (4 + 3 = 7 cards) as Texas.
export function evaluateBestHand(
  holeCards: GameCard[],
  communityCards: GameCard[] = [],
): GameHand & { description?: string } {
  const hole = holeCards ?? [];
  const board = communityCards ?? [];

  if (hole.length === 4) {
    if (board.length < 3) {
      return { rank: "HIGH_CARD", rankCards: [], combinationCards: [] };
    }

    let best: (GameHand & { description?: string }) | null = null;
    for (let i = 0; i < hole.length; i++) {
      for (let j = i + 1; j < hole.length; j++) {
        for (let a = 0; a < board.length; a++) {
          for (let b = a + 1; b < board.length; b++) {
            for (let c = b + 1; c < board.length; c++) {
              const hand = evaluateFiveCards([
                hole[i],
                hole[j],
                board[a],
                board[b],
                board[c],
              ]);
              if (
                !best ||
                handRankStrength[hand.rank] > handRankStrength[best.rank]
              ) {
                best = hand;
              }
            }
          }
        }
      }
    }
    return best!;
  }

  return evaluateFiveCards([...hole, ...board]);
}
