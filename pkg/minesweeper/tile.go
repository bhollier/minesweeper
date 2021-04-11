package minesweeper

// Type for a tile's "type"
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
	// This tile type is only used for conveying the appearance of a tile
	TileTypeHidden
	// This tile type is only used for conveying the appearance of a tile
	TileTypeFlag
	NumTileTypes
)

// Type for a minesweeper tile
type Tile struct {
	// Whether the tile has been discovered
	Discovered bool

	// Whether there is a flag on the tile
	Flagged bool

	// The tile's type
	Type TileType
}
