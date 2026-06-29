export interface Offset {
  x: number;
  y: number;
}

// ─── Observer layout (no seat taken) ────────────────────────────────────────
// Seat indices map directly to visual positions, clockwise from bottom-left.

export const getSeatLayouts = (seatCount: number, isMobile: boolean): Offset[] => {
  // Mobile positions are ordered counter-clockwise starting from the bottom-left
  // seat (slot 0), matching the desktop pattern so the rotation formula works
  // identically on both platforms.
  const layouts8: Offset[] = [
    isMobile ? { x: 27, y: 86 } : { x: 30, y: 88 }, // Slot 0 - Bottom left
    isMobile ? { x: 17, y: 66 } : { x: 9, y: 65 }, // Slot 1 - Left lower
    isMobile ? { x: 17, y: 30 } : { x: 9, y: 35 }, // Slot 2 - Left upper
    isMobile ? { x: 25, y: 7 } : { x: 30, y: 8 }, // Slot 3 - Top left
    isMobile ? { x: 70, y: 7 } : { x: 70, y: 8 }, // Slot 4 - Top right
    isMobile ? { x: 83, y: 30 } : { x: 91, y: 35 }, // Slot 5 - Right upper
    isMobile ? { x: 83, y: 66 } : { x: 91, y: 65 }, // Slot 6 - Right lower
    isMobile ? { x: 74, y: 86 } : { x: 70, y: 88 }, // Slot 7 - Bottom right
  ];

  const layouts9: Offset[] = [
    isMobile ? { x: 27, y: 86 } : { x: 30, y: 88 }, // Slot 0 - Bottom left
    isMobile ? { x: 17, y: 66 } : { x: 9, y: 65 }, // Slot 1 - Left lower
    isMobile ? { x: 17, y: 30 } : { x: 9, y: 35 }, // Slot 2 - Left upper
    isMobile ? { x: 19, y: 15 } : { x: 25, y: 8 }, // Slot 3 - Top left
    isMobile ? { x: 50, y: 7 } : { x: 50, y: 8 }, // Slot 4 - Top center
    isMobile ? { x: 81, y: 15 } : { x: 75, y: 8 }, // Slot 5 - Top right
    isMobile ? { x: 83, y: 30 } : { x: 91, y: 35 }, // Slot 6 - Right upper
    isMobile ? { x: 83, y: 66 } : { x: 91, y: 65 }, // Slot 7 - Right lower
    isMobile ? { x: 70, y: 86 } : { x: 70, y: 88 }, // Slot 8 - Bottom right
  ];

  const layouts6: Offset[] = [
    isMobile ? { x: 50, y: 86 } : { x: 30, y: 88 }, // Slot 0 - Bottom centre (mobile) / Bottom left (desktop)
    isMobile ? { x: 17, y: 70 } : { x: 5, y: 50 }, // Slot 1 - Left
    isMobile ? { x: 17, y: 25 } : { x: 30, y: 8 }, // Slot 2 - Top left
    isMobile ? { x: 50, y: 7 } : { x: 70, y: 8 }, // Slot 3 - Top right
    isMobile ? { x: 83, y: 25 } : { x: 95, y: 50 }, // Slot 4 - Right
    isMobile ? { x: 83, y: 70 } : { x: 70, y: 88 }, // Slot 5 - Bottom right
  ];

  if (seatCount === 6) return layouts6;
  if (seatCount === 9) return layouts9;
  return layouts8;
};

// ─── Player layout (user has taken a seat) ───────────────────────────────────
// Visual slot 0 is always center-bottom (the current player's position).
// Slots 1-N are arranged clockwise from bottom-right.
// The caller rotates the server seat index by mySeatIndex before indexing here.

export const getSeatLayoutsRotated = (seatCount: number, isMobile: boolean): Offset[] => {
  const rotated8: Offset[] = [
    // x=38 on mobile leaves room for the right-side cards without overflow
    isMobile ? { x: 38, y: 87 } : { x: 50, y: 91 }, // Slot 0 - Center-bottom (current player)
    isMobile ? { x: 83, y: 78 } : { x: 73, y: 88 }, // Slot 1 - Bottom-right
    isMobile ? { x: 90, y: 55 } : { x: 91, y: 65 }, // Slot 2 - Right lower
    isMobile ? { x: 90, y: 30 } : { x: 91, y: 35 }, // Slot 3 - Right upper
    isMobile ? { x: 70, y: 7 } : { x: 70, y: 8 }, // Slot 4 - Top-right
    isMobile ? { x: 30, y: 7 } : { x: 30, y: 8 }, // Slot 5 - Top-left
    isMobile ? { x: 10, y: 30 } : { x: 9, y: 35 }, // Slot 6 - Left upper
    isMobile ? { x: 10, y: 55 } : { x: 9, y: 65 }, // Slot 7 - Left lower
  ];

  const rotated6: Offset[] = [
    isMobile ? { x: 38, y: 87 } : { x: 50, y: 91 }, // Slot 0 - Center-bottom (current player)
    isMobile ? { x: 83, y: 73 } : { x: 78, y: 88 }, // Slot 1 - Bottom-right
    isMobile ? { x: 90, y: 30 } : { x: 95, y: 50 }, // Slot 2 - Right
    isMobile ? { x: 70, y: 7 } : { x: 70, y: 8 }, // Slot 3 - Top-right
    isMobile ? { x: 30, y: 7 } : { x: 30, y: 8 }, // Slot 4 - Top-left
    isMobile ? { x: 10, y: 30 } : { x: 5, y: 50 }, // Slot 5 - Left
  ];

  return seatCount === 6 ? rotated6 : rotated8;
};

// ─── Mobile seated layout ────────────────────────────────────────────────────
// is-me (slot 0) stays at left-bottom.
// Left and right side seats are lifted higher.
// Slot 7 (right neighbour of is-me) is pushed further out (x) and shares the
// same y as slot 1 (left neighbour of is-me) — creating bilateral symmetry.
// 6-player: slot 1 and slot 5 mirror each other at the same y.

export const getSeatLayoutsMobileSeated = (seatCount: number): Offset[] => {
  const seated8: Offset[] = [
    { x: 27, y: 86 }, // Slot 0 — is-me
    { x: 17, y: 65 }, // Slot 1 — left lower
    { x: 17, y: 32 }, // Slot 2 — left upper
    { x: 19, y: 15 }, // Slot 3 — top-left arc
    { x: 50, y: 6 }, // Slot 4 — centre top
    { x: 81, y: 15 }, // Slot 5 — top-right arc
    { x: 83, y: 32 }, // Slot 6 — right upper
    { x: 83, y: 65 }, // Slot 7 — right lower
  ];

  const seated9: Offset[] = [
    { x: 27, y: 86 }, // Slot 0 — is-me
    { x: 17, y: 65 }, // Slot 1 — left lower
    { x: 17, y: 32 }, // Slot 2 — left upper
    { x: 19, y: 15 }, // Slot 3 — top-left arc
    { x: 50, y: 6 }, // Slot 4 — centre top
    { x: 81, y: 15 }, // Slot 5 — top-right arc
    { x: 83, y: 32 }, // Slot 6 — right upper
    { x: 83, y: 65 }, // Slot 7 — right lower
    { x: 80, y: 80 }, // Slot 8 — bottom right
  ];

  const seated6: Offset[] = [
    { x: 25, y: 86 }, // Slot 0 — is-me (left-bottom)
    { x: 17, y: 63 }, // Slot 1 — left lower
    { x: 17, y: 28 }, // Slot 2 — left upper
    { x: 50, y: 8 }, // Slot 3 — centre top
    { x: 83, y: 28 }, // Slot 4 — right upper
    { x: 83, y: 63 }, // Slot 5 — right lower
  ];

  if (seatCount === 6) return seated6;
  if (seatCount === 9) return seated9;
  return seated8;
};

export const getChipOffsetsMobileSeated = (seatCount: number): Partial<Record<number, Offset>> => {
  if (seatCount === 6) {
    return {
      0: { x: 35, y: -80 }, // bottom-left → higher + right 10px
      1: { x: 55, y: 0 }, // (17,63)  left lower   → straight right
      2: { x: 55, y: 0 }, // (17,28)  left upper   → straight right
      3: { x: 0, y: 55 }, // (50,8)   top          → straight down
      4: { x: -55, y: 0 }, // (83,28)  right upper  → straight left
      5: { x: -55, y: 0 }, // (83,63)  right lower  → straight left
    };
  }
  if (seatCount === 9) {
    return {
      0: { x: 35, y: -80 }, // bottom-left → higher + right 10px
      1: { x: 55, y: 0 }, // (17,65)  left lower   → straight right
      2: { x: 55, y: 0 }, // (17,32)  left upper   → straight right
      3: { x: 38, y: 45 }, // (19,15)  top-left arc → diagonal toward center
      4: { x: 0, y: 55 }, // (50,6)   top center   → straight down
      5: { x: -38, y: 45 }, // (81,15)  top-right arc→ diagonal toward center
      6: { x: -55, y: 0 }, // (83,32)  right upper  → straight left
      7: { x: -55, y: 0 }, // (83,65)  right lower  → straight left
      8: { x: -10, y: -89 }, // (80,80) bottom-right → up + left 10px
    };
  }
  // 8-seat default
  return {
    0: { x: 35, y: -80 }, // \0-left  → up + right 10px
    1: { x: 55, y: 0 }, // (17,65)  left lower   → straight right
    2: { x: 55, y: 0 }, // (17,32)  left upper   → straight right
    3: { x: 38, y: 45 }, // (19,15)  top-left arc → diagonal toward center
    4: { x: 0, y: 55 }, // (50,6)   top center   → straight down
    5: { x: -38, y: 45 }, // (81,15)  top-right arc→ diagonal toward center
    6: { x: -55, y: 0 }, // (83,32)  right upper  → straight left
    7: { x: -55, y: 0 }, // (83,65)  right lower  → straight left
  };
};

export const getChipOffsets = (seatCount: number, isMobile: boolean): Partial<Record<number, Offset>> => {
  if (seatCount === 6) {
    return isMobile
      ? {
          0: { x: 0, y: -92 }, // bottom-centre → higher straight up
          1: { x: 55, y: 0 }, // (17,70) left          → straight right
          2: { x: 38, y: 45 }, // (17,25) top-left      → diagonal toward center
          3: { x: 0, y: 55 }, // (50,7)  top-centre    → straight down
          4: { x: -38, y: 45 }, // (83,25) top-right     → diagonal toward center
          5: { x: -55, y: 0 }, // (83,70) right         → straight left
        }
      : {
          0: { x: 0, y: -155 },
          1: { x: 140, y: 0 },
          2: { x: 0, y: 118 },
          3: { x: 0, y: 118 },
          4: { x: -140, y: 0 },
          5: { x: 0, y: -155 },
        };
  }
  if (seatCount === 9) {
    return isMobile
      ? {
          0: { x: 35, y: -80 }, // (27,86) BL → higher + right 10px
          1: { x: 60, y: 0 }, // (17,66) LL → straight right
          2: { x: 60, y: 0 }, // (17,30) LU → straight right
          3: { x: 38, y: 45 }, // (19,15) TL → diagonal toward center
          4: { x: 0, y: 55 }, // (50,7)  TC → straight down
          5: { x: -38, y: 45 }, // (81,15) TR → diagonal toward center
          6: { x: -60, y: 0 }, // (83,30) RU → straight left
          7: { x: -60, y: 0 }, // (83,66) RL → straight left
          8: { x: -35, y: -85 }, // (70,86) BR → up + left 10px
        }
      : {
          0: { x: 0, y: -145 },
          1: { x: 142, y: 0 },
          2: { x: 142, y: 0 },
          3: { x: 0, y: 122 },
          4: { x: 0, y: 122 },
          5: { x: 0, y: 122 },
          6: { x: -168, y: 0 },
          7: { x: -168, y: 0 },
          8: { x: 0, y: -145 },
        };
  }
  return isMobile
    ? {
        0: { x: 35, y: -85 }, // (27,86) BL → higher + right 10px
        1: { x: 60, y: 0 }, // (17,66) LL → straight right
        2: { x: 60, y: 0 }, // (17,30) LU → straight right
        3: { x: 38, y: 45 }, // (25,7)  TL → diagonal toward center
        4: { x: -38, y: 45 }, // (70,7)  TR → diagonal toward center
        5: { x: -60, y: 0 }, // (83,30) RU → straight left
        6: { x: -60, y: 0 }, // (83,66) RL → straight left
        7: { x: -35, y: -85 }, // (74,86) BR → up + left 10px
      }
    : {
        0: { x: 0, y: -145 },
        1: { x: 142, y: 0 },
        2: { x: 142, y: 0 },
        3: { x: 0, y: 122 },
        4: { x: 0, y: 122 },
        5: { x: -168, y: 0 },
        6: { x: -168, y: 0 },
        7: { x: 0, y: -145 },
      };
};

// ─── Rotated chip offsets (visual slots, slot 0 = center-bottom) ─────────────
// Chips point toward the center of the table from each visual slot.

export const getChipOffsetsRotated = (seatCount: number, isMobile: boolean): Partial<Record<number, Offset>> => {
  if (seatCount === 6) {
    return isMobile
      ? {
          0: { x: 0, y: -90 }, // center-bottom → up
          1: { x: -40, y: -75 }, // bottom-right  → up-left
          2: { x: -60, y: 0 }, // right          → left
          3: { x: 0, y: 80 }, // top-right      → down
          4: { x: 0, y: 80 }, // top-left       → down
          5: { x: 60, y: 0 }, // left           → right
        }
      : {
          0: { x: 0, y: -145 }, // center-bottom → up
          1: { x: -90, y: -110 }, // bottom-right  → up-left
          2: { x: -140, y: 0 }, // right          → left
          3: { x: 0, y: 118 }, // top-right      → down
          4: { x: 0, y: 118 }, // top-left       → down
          5: { x: 140, y: 0 }, // left           → right
        };
  }
  return isMobile
    ? {
        0: { x: 0, y: -90 }, // center-bottom → up
        1: { x: -35, y: -80 }, // bottom-right  → up-left
        2: { x: -70, y: 0 }, // right lower   → left
        3: { x: -70, y: 0 }, // right upper   → left
        4: { x: 20, y: 80 }, // top-right     → down
        5: { x: -20, y: 80 }, // top-left      → down
        6: { x: 70, y: 0 }, // left upper    → right
        7: { x: 70, y: 0 }, // left lower    → right
      }
    : {
        0: { x: 0, y: -145 }, // center-bottom → up
        1: { x: -80, y: -125 }, // bottom-right  → up-left
        2: { x: -160, y: 0 }, // right lower   → left
        3: { x: -160, y: 0 }, // right upper   → left
        4: { x: 0, y: 122 }, // top-right     → down
        5: { x: 0, y: 122 }, // top-left      → down
        6: { x: 160, y: 0 }, // left upper    → right
        7: { x: 160, y: 0 }, // left lower    → right
      };
};

export const getHoleCardOffsets = (seatCount: number, isMobile: boolean): Partial<Record<number, Offset>> => {
  if (seatCount === 6) {
    return isMobile
      ? {
          0: { x: 0, y: -100 },
          1: { x: 35, y: -80 },
          2: { x: 35, y: -50 },
          3: { x: 0, y: -30 },
          4: { x: -35, y: -50 },
          5: { x: -35, y: -80 },
        }
      : {
          0: { x: 20, y: -140 },
          1: { x: 50, y: -100 },
          2: { x: 20, y: -60 },
          3: { x: -20, y: -60 },
          4: { x: -50, y: -100 },
          5: { x: -20, y: -140 },
        };
  }
  return isMobile
    ? {
        0: { x: -20, y: -105 },
        1: { x: 20, y: -105 },
        2: { x: 35, y: -80 },
        3: { x: 35, y: -50 },
        4: { x: 20, y: -30 },
        5: { x: -20, y: -40 },
        6: { x: -35, y: -60 },
        7: { x: -35, y: -90 },
      }
    : {
        0: { x: 20, y: -160 },
        1: { x: 48, y: -140 },
        2: { x: 48, y: -100 },
        3: { x: 20, y: -80 },
        4: { x: -20, y: -80 },
        5: { x: -48, y: -100 },
        6: { x: -48, y: -140 },
        7: { x: -20, y: -160 },
      };
};
