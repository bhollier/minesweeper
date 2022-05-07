package minesweeper

type TileType int

const (
	TileTypeEmpty = TileType(iota)
	TileType1
	TileType2
	TileType3
	TileType4
	TileType5
	TileType6
	TileType7
	TileType8
	TileTypeMine
	// TileTypeHidden is only used for conveying the appearance of a tile
	TileTypeHidden
	// TileTypeFlag is only used for conveying the appearance of a tile
	TileTypeFlag
	NumTileTypes
)

// Tile represents a single minesweeper tile
type Tile struct {
	// Whether the tile has been discovered
	Discovered bool

	// Whether there is a flag on the tile
	Flagged bool

	// The tile's type
	Type TileType
}

func (t Tile) toByte() (b byte) {
	if t.Discovered {
		b |= 1 << 0
	}
	if t.Flagged {
		b |= 1 << 1
	}
	b |= byte(t.Type) << 4
	return
}

func tileFromByte(b byte) Tile {
	return Tile{
		// First two bits are the booleans
		Discovered: b&1 != 0,
		Flagged:    b&2 != 0,
		// Last 4 bits are the type
		Type: TileType(b >> 4),
	}
}

type Field [][]Tile

func (f Field) toBytes() (b []byte) {
	if len(f) == 0 {
		return
	}
	h, w := len(f), len(f[0])
	b = make([]byte, w*h)
	for y, row := range f {
		for x, tile := range row {
			b[(y*w)+x] = tile.toByte()
		}
	}
	return
}

func fieldFromBytes(w, h int, b []byte) (f Field) {
	f = make(Field, h)
	for y := 0; y < h; y++ {
		f[y] = make([]Tile, w)
		for x := 0; x < w; x++ {
			f[y][x] = tileFromByte(b[(y*w)+x])
		}
	}
	return
}
