package minesweeper

import "time"

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
	// unflagged. Returns the number of "remaining mines" (assuming every flag is perfect,
	// so this number can be negative) as a floating point number, as the remaining for
	// infinite minesweeper is math.Inf(1)
	Flag(x, y int) float64

	// State returns the game's current state
	State() GameState

	// StartTime returns the start time of the game
	StartTime() time.Time

	// SinceStart returns the amount of time since the game started
	SinceStart() time.Duration

	// Appearance returns the game's current appearance (where undiscovered tiles are
	// TileTypeHidden). This is a map of Pos, as Go slices can't be sparse
	Appearance(x, y, w, h int) map[Pos]TileType
}
