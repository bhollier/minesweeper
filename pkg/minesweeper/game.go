package minesweeper

import (
	"encoding/gob"
	"fmt"
	"io"
	"math/rand"
	"time"
)

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

// Game stores a minesweeper game
type Game struct {
	w, h, numMines int
	field          [][]Tile
	state          GameState
	startTime      time.Time
}

// NewGame creates a new minesweeper game
func NewGame(width int, height int, numMines int) (*Game, error) {
	// Create the game object
	g := &Game{
		w: width,
		h: height,
	}

	// Create the grid
	g.field = make([][]Tile, g.h)
	for y := 0; y < g.h; y++ {
		g.field[y] = make([]Tile, g.w)
	}

	// Reset the game
	err := g.Reset(numMines)
	if err != nil {
		return nil, err
	}

	return g, nil
}

// Reset the board and place numMines randomly. If an error is returned, the
// game's state is not modified
func (g *Game) Reset(numMines int) error {
	// Sanity check
	if numMines > (g.w*g.h)-9 {
		return fmt.Errorf(
			"too many mines! numMines (%d) > width (%d) * height (%d) - 9",
			numMines, g.w, g.h)
	}

	// Set the number of mines
	g.numMines = numMines
	// Set the game state
	g.state = GameStateStart

	return nil
}

// Uncover the tile at the given coordinate. If the coordinate is invalid
// (out of bounds, the tile is discovered, etc.) nothing happens. Returns the
// state of the game after the move
func (g *Game) Uncover(x, y int) (s GameState) {
	defer func() {
		// The return value is the game's state
		s = g.state
	}()

	// If the game hasn't started yet
	if g.state == GameStateStart {
		// Populate the field
		g.populateField(x, y)
		// Set the start time
		g.startTime = time.Now()
	}

	// If the x or y is out of range, the cell is flagged, the call is already
	// discovered, or the game has ended
	if x < 0 || x >= g.w || y < 0 || y >= g.h ||
		g.field[y][x].Discovered || g.field[y][x].Flagged ||
		g.state != GameStatePlaying {
		// Nothing needs to be done, so just return the game's state
		return g.state
	}

	// If the tile is a mine
	if g.field[y][x].Type == TileTypeMine {
		// Find the mines
		for y2, row := range g.field {
			for x2, tile := range row {
				// If the tile is a mine
				if tile.Type == TileTypeMine {
					// Set the tile as discovered
					g.field[y2][x2].Discovered = true
				}
			}
		}
		// Set the game's state
		g.state = GameStateLoss
		return
	}

	// Create a queue
	queue := []struct{ X, Y int }{{x, y}}

	// While there are tiles to process
	for len(queue) > 0 {
		// Pop the tile position off the queue
		pos := queue[len(queue)-1]
		queue = queue[:len(queue)-1]

		// Set the tile as discovered
		g.field[pos.Y][pos.X].Discovered = true

		// If the tile is empty
		if g.field[pos.Y][pos.X].Type == TileTypeEmpty {
			// Uncover the neighbouring tiles
			for _, neighbouringTile := range g.neighbouringTiles(pos.X, pos.Y) {
				// Only uncover undiscovered tiles
				if !neighbouringTile.Discovered {
					queue = append(queue, struct{ X, Y int }{
						neighbouringTile.X, neighbouringTile.Y})
				}
			}
		}
	}

	// Check for the win case
	// Iterate over the tiles
	for _, row := range g.field {
		for _, tile := range row {
			// If the tile isn't a mine and hasn't been discovered
			if tile.Type != TileTypeMine && !tile.Discovered {
				// The game isn't won, exit
				return
			}
		}
	}

	// There are no undiscovered non-mine tiles, set the game's state to win
	g.state = GameStateWin
	return
}

// Flag the tile at the given coordinate. If the tile is already flagged it is
// unflagged
func (g *Game) Flag(x, y int) {
	// If the x or y is out of range, the cell is already discovered, or the
	// game has ended
	if x < 0 || x >= g.w || y < 0 || y >= g.h ||
		g.field[y][x].Discovered || g.state > GameStatePlaying {
		// Nothing needs to be done, so return
		return
	}

	// Invert the flag field
	g.field[y][x].Flagged = !g.field[y][x].Flagged
}

// Size returns the game's current size in tiles
func (g *Game) Size() (width int, height int) {
	return g.w, g.h
}

// State returns the game's current state
func (g *Game) State() GameState {
	return g.state
}

// StartTime returns the start time of the game
func (g *Game) StartTime() time.Time {
	return g.startTime
}

// SinceStart returns the amount of time since the game started
func (g *Game) SinceStart() time.Duration {
	return time.Now().Sub(g.startTime)
}

// Appearance returns the game's current appearance (where undiscovered tiles are
// TileTypeHidden)
func (g *Game) Appearance() [][]TileType {
	appearance := make([][]TileType, g.h)
	for y := 0; y < g.h; y++ {
		appearance[y] = make([]TileType, g.w)
		for x := 0; x < g.w; x++ {
			// If the game hasn't started yet
			if g.state == GameStateStart {
				// If the tile is flagged
				if g.field[y][x].Flagged {
					// Set the tile as flagged
					appearance[y][x] = TileTypeFlag
				} else {
					// Set the tile as hidden
					appearance[y][x] = TileTypeHidden
				}

			} else if !g.field[y][x].Discovered {
				if g.field[y][x].Flagged {
					appearance[y][x] = TileTypeFlag
				} else {
					appearance[y][x] = TileTypeHidden
				}
			} else {
				appearance[y][x] = g.field[y][x].Type
			}
		}
	}
	return appearance
}

type gameExportedFields struct {
	W, H, M int
	F       [][]Tile
	S       GameState
	ST      time.Time
}

// Save the state of the game into the given io.Writer
func (g *Game) Save(w io.Writer) error {
	enc := gob.NewEncoder(w)
	return enc.Encode(gameExportedFields{
		g.w, g.h, g.numMines,
		g.field, g.state, g.startTime,
	})
}

// Load a game from the given io.Reader
func Load(r io.Reader) (*Game, error) {
	g := gameExportedFields{}
	dec := gob.NewDecoder(r)
	err := dec.Decode(&g)
	return &Game{
		g.W, g.H, g.M,
		g.F, g.S, g.ST,
	}, err
}

type tileAndPos struct {
	X, Y int
	Tile
}

func (g *Game) neighbouringTiles(x, y int) []tileAndPos {
	// The array of neighbouring tiles
	tiles := make([]tileAndPos, 0, 8)
	// Iterate over the 3x3 around the tile
	for neighbourY := y - 1; neighbourY <= y+1; neighbourY++ {
		for neighbourX := x - 1; neighbourX <= x+1; neighbourX++ {
			// Skip the tile if it's not on the grid or if the tile is the
			// center tile
			if neighbourY < 0 || neighbourX < 0 ||
				neighbourY >= g.h || neighbourX >= g.w ||
				(neighbourY == y && neighbourX == x) {
				continue
			}
			// Add the tile
			tiles = append(tiles, tileAndPos{X: neighbourX, Y: neighbourY,
				Tile: g.field[neighbourY][neighbourX]})
		}
	}
	return tiles
}

func (g *Game) neighbouringMinesCount(x, y int) int {
	// Get the neighbouring tiles
	neighbouringTiles := g.neighbouringTiles(x, y)
	// Count the number of mines
	count := 0
	for _, tile := range neighbouringTiles {
		if tile.Type == TileTypeMine {
			count++
		}
	}
	return count
}

func (g *Game) populateField(startX, startY int) {
	// Place the mines
	for i := 0; i < g.numMines; i++ {
		// Loop until the mine is placed
		for true {
			// Find a random spot to place the mine
			y := rand.Intn(g.h)
			x := rand.Intn(g.w)
			// If the spot doesn't already have a mine and isn't near the
			// start point
			if g.field[y][x].Type != TileTypeMine &&
				!(x >= startX-1 && x <= startX+1 &&
					y >= startY-1 && y <= startY+1) {
				// Set the tile as a mine
				g.field[y][x].Type = TileTypeMine
				// We placed a mine, break out of this loop
				break
			}
		}
	}
	// todo more efficient to shuffle (fisher-yates)

	// Determine the neighbouring mines
	for y, row := range g.field {
		for x, tile := range row {
			// Reset the flags
			tile.Discovered = false
			tile.Flagged = false

			// Skip tiles that are a mine
			if tile.Type == TileTypeMine {
				continue
			}
			// Set the tile's number
			g.field[y][x].Type = TileType(int(TileTypeEmpty) +
				g.neighbouringMinesCount(x, y))
		}
	}

	// Start the game
	g.state = GameStatePlaying
}
