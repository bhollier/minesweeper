package minesweeper

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func tileSerialiseRoundtrip(a *assert.Assertions, t Tile) {
	a.Equal(t, tileFromByte(t.toByte()))
}

func TestTileSerialiseRoundtrip(t *testing.T) {
	a := assert.New(t)

	tileSerialiseRoundtrip(a, Tile{
		Discovered: false,
		Flagged:    false,
		Type:       TileTypeEmpty,
	})
	tileSerialiseRoundtrip(a, Tile{
		Discovered: true,
		Flagged:    true,
		Type:       TileTypeFlag,
	})
	tileSerialiseRoundtrip(a, Tile{
		Discovered: false,
		Flagged:    false,
		Type:       TileTypeFlag,
	})
	tileSerialiseRoundtrip(a, Tile{
		Discovered: true,
		Flagged:    true,
		Type:       TileTypeEmpty,
	})
	tileSerialiseRoundtrip(a, Tile{
		Discovered: true,
		Flagged:    false,
		Type:       TileType3,
	})
}
