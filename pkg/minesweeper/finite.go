package minesweeper

import (
	"fmt"
	"math/rand"
	"time"
)

// FiniteGame stores a finite minesweeper game
type FiniteGame struct {
	w, h, numMines int
	field          [][]Tile
	state          GameState
	startTime      time.Time
}

// NewGame creates a new, finite minesweeper game
func NewGame(width int, height int, numMines int) (Game, error) {
	// Create the game object
	g := &FiniteGame{
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

func (g *FiniteGame) Reset(numMines int) error {
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

func (g *FiniteGame) Uncover(x, y int) (s GameState) {
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
		// Set the game as started
		g.state = GameStatePlaying
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
	queue := []Pos{{x, y}}

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

func (g *FiniteGame) Flag(x, y int) {
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

func (g *FiniteGame) State() GameState {
	return g.state
}

func (g *FiniteGame) StartTime() time.Time {
	return g.startTime
}

func (g *FiniteGame) SinceStart() time.Duration {
	return time.Now().Sub(g.startTime)
}

func (g *FiniteGame) Appearance(x, y, w, h int) map[Pos]TileType {
	// Make sure the rect is in range
	x, y = max(x, 0), max(y, 0)
	x, y = min(x, g.w-1), min(y, g.h-1)
	w, h = min(w, g.w-x), min(h, g.h-y)
	maxX, maxY := x+w, y+h

	appearance := make(map[Pos]TileType, w*h)
	for y := y; y < maxY; y++ {
		for x := x; x < maxX; x++ {
			pos := Pos{x, y}
			// If the game hasn't started yet, or the tile is undiscovered
			if g.state == GameStateStart || !g.field[y][x].Discovered {
				// If the tile is flagged
				if g.field[y][x].Flagged {
					// Set the tile as flagged
					appearance[pos] = TileTypeFlag
				} else {
					// Set the tile as hidden
					appearance[pos] = TileTypeHidden
				}
			} else {
				appearance[pos] = g.field[y][x].Type
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

// todo TinyGo doesn't support encoding/gob
//  https://tinygo.org/docs/reference/lang-support/stdlib/#encodinggob
/*
// Save the state of the game into the given io.Writer
func (g *FiniteGame) Save(w io.Writer) error {
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
	return &FiniteGame{
		g.W, g.H, g.M,
		g.F, g.S, g.ST,
	}, err
}
*/

type tileAndPos struct {
	Pos
	Tile
}

func (g *FiniteGame) neighbouringTiles(x, y int) []tileAndPos {
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
			tiles = append(tiles, tileAndPos{Pos{X: neighbourX, Y: neighbourY},
				g.field[neighbourY][neighbourX]})
		}
	}
	return tiles
}

func (g *FiniteGame) neighbouringMinesCount(x, y int) int {
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

func (g *FiniteGame) populateField(startX, startY int) {
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
}
