package minesweeper

import (
	"encoding/binary"
	"fmt"
	"io"
	"time"
)

type Pos struct {
	X, Y int
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// GameState represents a game's state
type GameState int

const (
	// GameStateStart is the state for before the first tile has been uncovered
	GameStateStart = GameState(iota)

	// GameStatePlaying is the state for an ongoing game (no mines uncovered but tiles are still hidden)
	GameStatePlaying

	// GameStateLoss is the state for a lost game (mine uncovered)
	GameStateLoss

	// GameStateWin is the state for a won game (all tiles uncovered but mines)
	GameStateWin
)

func (s GameState) String() string {
	switch s {
	case GameStateStart:
		return "start"
	case GameStatePlaying:
		return "playing"
	case GameStateLoss:
		return "loss"
	case GameStateWin:
		return "win"
	default:
		return "unknown"
	}
}

type Game interface {
	// Reset the board and place numMines randomly. If an error is returned, the
	// game's state is not modified
	Reset(numMines int) error

	// Uncover the tile at the given coordinate. If the coordinate is invalid
	// (out of bounds, the tile is discovered, etc.) nothing happens. Returns the
	// state of the game after the move
	Uncover(x, y int) (s GameState)

	// Flag the tile at the given coordinate. If the tile is already flagged it is
	// unflagged. Returns the number of "remaining mines", see RemainingMines
	Flag(x, y int) float64

	// RemainingMines returns the number of "remaining mines" (assuming every flag is perfect,
	// so this number can be negative) as a floating point number, as the remaining for
	// infinite minesweeper is math.Inf(1)
	RemainingMines() float64

	// State returns the game's current state
	State() GameState

	// StartTime returns the start time of the game
	StartTime() time.Time

	// SinceStart returns the amount of time since the game started
	SinceStart() time.Duration

	// Appearance returns the game's current appearance (where undiscovered tiles are
	// TileTypeHidden). This is a map of Pos, as Go slices can't be sparse
	Appearance(x, y, w, h int) map[Pos]TileType

	// Save the state of the game into the given io.Writer
	Save(io.Writer) error
}

// Assuming that the loader version is the same for finite and infinite loaders
const serialiseVersion = 1

var serialiseByteOrder = binary.BigEndian

const (
	saveHeaderFiniteGameType = uint8(iota)
	saveHeaderInfiniteGameType
)

type saveHeader struct {
	Version  uint8
	GameType uint8
}

func (h saveHeader) save(w io.Writer) error {
	return binary.Write(w, serialiseByteOrder, h)
}

func newHeader(gameType uint8) saveHeader {
	return saveHeader{
		Version:  serialiseVersion,
		GameType: gameType,
	}
}

func loadHeader(r io.Reader) (h saveHeader, err error) {
	err = binary.Read(r, serialiseByteOrder, &h)
	if err != nil {
		return
	}

	// Check the version
	if h.Version != serialiseVersion {
		return h, fmt.Errorf("save data for v%d but loader is v%d",
			h.Version, serialiseVersion)
	}

	return h, nil
}

// Load a game from the given io.Reader
func Load(r io.Reader) (Game, error) {
	// Read the header
	header, err := loadHeader(r)
	if err != nil {
		return nil, err
	}

	switch header.GameType {
	case saveHeaderFiniteGameType:
		return loadFinite(r)
	case saveHeaderInfiniteGameType:
		return loadInfinite(r)
	default:
		return nil, fmt.Errorf("unknown game type")
	}
}
