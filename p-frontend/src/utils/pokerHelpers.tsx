import type { GameCard, GameHand } from "../api/game";

const rankNames: Record<GameHand["rank"], string> = {
  HIGH_CARD: "High Card",
  ONE_PAIR: "One Pair",
  TWO_PAIR: "Two Pair",
  THREE_OF_A_KIND: "Three of a Kind",
  STRAIGHT: "Straight",
  FLUSH: "Flush",
  FULL_HOUSE: "Full House",
  FOUR_OF_A_KIND: "Four of a Kind",
  STRAIGHT_FLUSH: "Straight Flush",
  ROYAL_FLUSH: "Royal Flush",
};

const rankToShort: Record<Exclude<GameCard["rank"], null>, string> = {
  ACE: "A",
  TWO: "2",
  THREE: "3",
  FOUR: "4",
  FIVE: "5",
  SIX: "6",
  SEVEN: "7",
  EIGHT: "8",
  NINE: "9",
  TEN: "10",
  JACK: "J",
  QUEEN: "Q",
  KING: "K",
};

// Rank sort order for comparisons (Ace high)
const rankSortOrder: Record<Exclude<GameCard["rank"], null>, number> = {
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  SIX: 6,
  SEVEN: 7,
  EIGHT: 8,
  NINE: 9,
  TEN: 10,
  JACK: 11,
  QUEEN: 12,
  KING: 13,
  ACE: 14,
};

const suitToChar: Record<Exclude<GameCard["suit"], null>, string> = {
  DIAMONDS: "d",
  HEARTS: "h",
  CLUBS: "c",
  SPADES: "s",
};

function isWheelStraight(cards: GameCard[]): boolean {
  const ranks = cards
    .map((c) => c.rank)
    .filter((r): r is Exclude<GameCard["rank"], null> => r !== null)
    .map((r) => rankToShort[r]);

  const wheel = ["A", "2", "3", "4", "5"];
  return wheel.every((r) => ranks.includes(r));
}

function getCounts(cards: GameCard[]) {
  const counts: Partial<Record<Exclude<GameCard["rank"], null>, number>> = {};
  cards.forEach((card) => {
    if (!card || !card.rank) return;

    counts[card.rank] = (counts[card.rank] || 0) + 1;
  });

  return counts;
}

function getOnePairDescription(cards: GameCard[]): string {
  const counts = getCounts(cards);
  let pairRank: Exclude<GameCard["rank"], null> | null = null;

  for (const rank in counts) {
    if (counts[rank as Exclude<GameCard["rank"], null>] === 2) {
      pairRank = rank as Exclude<GameCard["rank"], null>;
      break;
    }
  }

  if (pairRank) {
    return `Pair of ${rankToShort[pairRank]}s `;
  }

  return "One Pair";
}

function getTwoPairDescription(cards: GameCard[]): string {
  const counts = getCounts(cards);

  // Find all ranks that form pairs
  const pairs = Object.entries(counts)
    .filter(([, count]) => count === 2)
    .map(([rank]) => rank as Exclude<GameCard["rank"], null>);

  // Sort pairs descending
  pairs.sort((a, b) => rankSortOrder[b] - rankSortOrder[a]);

  // Find kicker (highest remaining card that is not part of the pairs)
  const kicker = cards
    .map((c) => c.rank)
    .filter((r): r is Exclude<GameCard["rank"], null> => r !== null && !pairs.includes(r))
    .sort((a, b) => rankSortOrder[b] - rankSortOrder[a])[0];

  const pairText = pairs.map((p) => rankToShort[p]).join(" & ");

  if (kicker) {
    return `Two Pair ${pairText}, kicker ${rankToShort[kicker]}`;
  } else {
    return `Two Pair ${pairText}`;
  }
}

function getThreeOfAKindDescription(cards: GameCard[]): string {
  const counts = getCounts(cards);
  let tripleRank: Exclude<GameCard["rank"], null> | null = null;

  for (const rank in counts) {
    if (counts[rank as Exclude<GameCard["rank"], null>] === 3) {
      tripleRank = rank as Exclude<GameCard["rank"], null>;
      break;
    }
  }

  if (tripleRank) {
    return `Three of ${rankToShort[tripleRank]}s`;
  }

  return "Three of a Kind";
}

function getStraightDescription(cards: GameCard[]): string {
  if (isWheelStraight(cards)) return "Straight A-5";

  const ranks = cards.map((c) => c.rank).filter((r): r is Exclude<GameCard["rank"], null> => r !== null);

  const uniqueRanks = Array.from(new Set(ranks));

  uniqueRanks.sort((a, b) => rankSortOrder[a] - rankSortOrder[b]);

  const rankStrings = uniqueRanks.map((r) => rankToShort[r]);

  return `Straight ${rankStrings[0]}-${rankStrings[rankStrings.length - 1]}`;
}

function getFlushDescription(cards: GameCard[]): string {
  const validCards = cards.filter(
    (
      c,
    ): c is {
      rank: Exclude<GameCard["rank"], null>;
      suit: Exclude<GameCard["suit"], null>;
      secret: boolean;
    } => c.rank !== null && c.suit !== null,
  );

  if (validCards.length === 0) return "Flush";

  validCards.sort((a, b) => rankSortOrder[b.rank] - rankSortOrder[a.rank]);

  const highest = validCards[0];

  return `Flush high ${rankToShort[highest.rank]}${suitToChar[highest.suit]}`;
}

function getFullHouseDescription(cards: GameCard[]): string {
  const counts = getCounts(cards);

  let tripleRank: Exclude<GameCard["rank"], null> = "ACE";
  let pairRank: Exclude<GameCard["rank"], null> = "ACE";

  for (const rank in counts) {
    if (counts[rank as Exclude<GameCard["rank"], null>] === 3) tripleRank = rank as Exclude<GameCard["rank"], null>;
    else if (counts[rank as Exclude<GameCard["rank"], null>] === 2) pairRank = rank as Exclude<GameCard["rank"], null>;
  }

  return `Full House ${rankToShort[tripleRank]}'s and ${rankToShort[pairRank]}'s`;
}

function getFourOfAKindDescription(cards: GameCard[]): string {
  const counts = getCounts(cards);
  let fourRank: Exclude<GameCard["rank"], null> | null = null;

  // Find the four of a kind rank
  for (const rank in counts) {
    if (counts[rank as Exclude<GameCard["rank"], null>] === 4) {
      fourRank = rank as Exclude<GameCard["rank"], null>;
      break;
    }
  }

  if (!fourRank) return "Four of a Kind";

  // Find kicker: highest rank not equal to fourRank
  const kickerRanks = cards.map((c) => c.rank).filter((r): r is Exclude<GameCard["rank"], null> => r !== null && r !== fourRank);

  if (kickerRanks.length === 0) return `Four of a Kind, ${rankToShort[fourRank]}s`;

  kickerRanks.sort((a, b) => rankSortOrder[b] - rankSortOrder[a]);
  const kicker = kickerRanks[0];

  return `Four of a Kind, ${rankToShort[fourRank]}'s with ${rankToShort[kicker]} kicker`;
}

function getStraightFlushDescription(cards: GameCard[]): string {
  if (isWheelStraight(cards)) return "Straight Flush A-5";

  const ranks = cards.map((c) => c.rank).filter((r): r is Exclude<GameCard["rank"], null> => r !== null);

  // Sort ascending: low to high
  ranks.sort((a, b) => rankSortOrder[a] - rankSortOrder[b]);

  const lowCard = ranks[0];
  const highCard = ranks[ranks.length - 1];

  return `Straight Flush ${rankToShort[lowCard]}-${rankToShort[highCard]}`;
}

export function formatHandDescription(hand: GameHand | null): string {
  if (!hand) return "";

  switch (hand.rank) {
    case "ONE_PAIR":
      return getOnePairDescription(hand.combinationCards);

    case "TWO_PAIR":
      return getTwoPairDescription(hand.combinationCards);

    case "THREE_OF_A_KIND":
      return getThreeOfAKindDescription(hand.combinationCards);

    case "STRAIGHT":
      return getStraightDescription(hand.combinationCards);

    case "FLUSH":
      return getFlushDescription(hand.combinationCards);

    case "FULL_HOUSE":
      return getFullHouseDescription(hand.combinationCards);

    case "FOUR_OF_A_KIND":
      return getFourOfAKindDescription(hand.combinationCards);

    case "STRAIGHT_FLUSH":
      return getStraightFlushDescription(hand.combinationCards);

    case "ROYAL_FLUSH":
      return "Royal Flush";

    default:
      return rankNames[hand.rank] || "";
  }
}

export function formatHandLabel(hand: GameHand | null): string {
  if (!hand) return "";
  const cards = hand.combinationCards ?? [];

  switch (hand.rank) {
    case "ROYAL_FLUSH":
      return "ROYAL FLUSH";

    case "STRAIGHT_FLUSH": {
      if (isWheelStraight(cards)) return "STRAIGHT FLUSH — A-5";
      const ranks = cards.map((c) => c.rank).filter((r): r is Exclude<GameCard["rank"], null> => r !== null);
      ranks.sort((a, b) => rankSortOrder[a] - rankSortOrder[b]);
      return `STRAIGHT FLUSH — ${rankToShort[ranks[0]]}-${rankToShort[ranks[ranks.length - 1]]}`;
    }

    case "FOUR_OF_A_KIND": {
      const counts = getCounts(cards);
      for (const rank in counts) {
        if (counts[rank as Exclude<GameCard["rank"], null>] === 4)
          return `FOUR OF A KIND — ${rankToShort[rank as Exclude<GameCard["rank"], null>]}'s`;
      }
      return "FOUR OF A KIND";
    }

    case "FULL_HOUSE": {
      const counts = getCounts(cards);
      let triple: Exclude<GameCard["rank"], null> = "ACE";
      let pair: Exclude<GameCard["rank"], null> = "ACE";
      for (const rank in counts) {
        if (counts[rank as Exclude<GameCard["rank"], null>] === 3) triple = rank as Exclude<GameCard["rank"], null>;
        else if (counts[rank as Exclude<GameCard["rank"], null>] === 2) pair = rank as Exclude<GameCard["rank"], null>;
      }
      return `FULL HOUSE — ${rankToShort[triple]}'s & ${rankToShort[pair]}'s`;
    }

    case "FLUSH": {
      const valid = cards.filter((c): c is { rank: Exclude<GameCard["rank"], null>; suit: Exclude<GameCard["suit"], null>; secret: boolean } => c.rank !== null && c.suit !== null);
      if (!valid.length) return "FLUSH";
      valid.sort((a, b) => rankSortOrder[b.rank] - rankSortOrder[a.rank]);
      return `FLUSH — ${rankToShort[valid[0].rank]} HIGH`;
    }

    case "STRAIGHT": {
      if (isWheelStraight(cards)) return "STRAIGHT — A-5";
      const ranks = cards.map((c) => c.rank).filter((r): r is Exclude<GameCard["rank"], null> => r !== null);
      const unique = Array.from(new Set(ranks)).sort((a, b) => rankSortOrder[a] - rankSortOrder[b]);
      return `STRAIGHT — ${rankToShort[unique[0]]}-${rankToShort[unique[unique.length - 1]]}`;
    }

    case "THREE_OF_A_KIND": {
      const counts = getCounts(cards);
      for (const rank in counts) {
        if (counts[rank as Exclude<GameCard["rank"], null>] === 3)
          return `THREE OF A KIND — ${rankToShort[rank as Exclude<GameCard["rank"], null>]}'s`;
      }
      return "THREE OF A KIND";
    }

    case "TWO_PAIR": {
      const counts = getCounts(cards);
      const pairs = Object.entries(counts)
        .filter(([, c]) => c === 2)
        .map(([r]) => r as Exclude<GameCard["rank"], null>)
        .sort((a, b) => rankSortOrder[b] - rankSortOrder[a]);
      return `TWO PAIR — ${pairs.map((p) => rankToShort[p]).join(" & ")}`;
    }

    case "ONE_PAIR": {
      const counts = getCounts(cards);
      for (const rank in counts) {
        if (counts[rank as Exclude<GameCard["rank"], null>] === 2)
          return `PAIR OF ${rankToShort[rank as Exclude<GameCard["rank"], null>]}'s`;
      }
      return "ONE PAIR";
    }

    case "HIGH_CARD": {
      const top = [...(hand.rankCards ?? []), ...cards]
        .filter((c) => c.rank !== null)
        .sort((a, b) => rankSortOrder[b.rank as Exclude<GameCard["rank"], null>] - rankSortOrder[a.rank as Exclude<GameCard["rank"], null>])[0];
      return top?.rank ? `HIGH CARD — ${rankToShort[top.rank as Exclude<GameCard["rank"], null>]}` : "HIGH CARD";
    }

    default:
      return (hand.rank as string).replace(/_/g, " ");
  }
}

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

export function rankValue(rank: GameCard["rank"] | null): number {
  return rank ? rankOrder[rank] : 0;
}

export function describeHoleCards(cards: GameCard[]): string {
  if (cards.length !== 2) return "";

  const rankMap: Record<Exclude<GameCard["rank"], null>, string> = {
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

  const [c1, c2] = cards;
  if (!c1.rank || !c2.rank) return "";

  const r1 = rankMap[c1.rank];
  const r2 = rankMap[c2.rank];

  const [high, low] = rankValue(c1.rank) >= rankValue(c2.rank) ? [r1, r2] : [r2, r1];

  const suited = c1.suit === c2.suit ? "Suited" : "Offsuit";

  return `${high}${low} ${suited}`;
}
