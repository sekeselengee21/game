declare module "pokersolver" {
  export class Hand {
    static solve(cards: string[]): Hand;
    static compare(hand1: Hand, hand2: Hand): number;
    readonly name: string;
    readonly cards: string[];
  }
}
