// Brand reskin lives here. Swap these to retheme the whole game without
// touching logic or scene code - this is the "restyle into our brand" surface.

export const BOARD_SIZE = 480; // logical px; Phaser scales to the container
export const PADDING = 16;

// One brand color per gem type. Soft, candy-ish HeartStamp-style palette.
export const GEM_COLORS = [
  0xff5d8f, // pink
  0x5db1ff, // blue
  0xffd166, // yellow
  0x8af3a0, // mint
  0xc792ea, // lavender
  0xff924c, // orange
];

export const BG_COLOR = 0x1c1830;
export const TILE_BG = 0x251f3d;
export const SELECT_COLOR = 0xffffff;

export const SWAP_MS = 130; // tuned for game feel: snappy but readable
export const DROP_MS = 200;
export const POP_MS = 140;
