package minesweeper

import (
	"encoding/binary"
	"fmt"
	"io"
	"math"
	"math/rand"
	"time"
)

const ChunkSize = 16

type chunkTile struct {
	discovered bool
	flagged    bool
	mine       bool
}

func (t chunkTile) toByte() (b byte) {
	if t.discovered {
		b |= 1 << 0
	}
	if t.flagged {
		b |= 1 << 1
	}
	if t.mine {
		b |= 1 << 2
	}
	return
}

func chunkTileFromByte(b byte) chunkTile {
	return chunkTile{
		discovered: b&1 != 0,
		flagged:    b&2 != 0,
		mine:       b&4 != 0,
	}
}

type chunk [ChunkSize][ChunkSize]chunkTile

// randomChunk just creates a chunk with the given number of mines
func randomChunk(numMines int) *chunk {
	c := new(chunk)

	// Place the mines
	for i := 0; i < numMines; i++ {
		// Loop until the mine is placed
		for true {
			// Find a random spot to place the mine
			y := rand.Intn(ChunkSize)
			x := rand.Intn(ChunkSize)
			// If the spot doesn't already have a mine
			if !c[y][x].mine {
				// Set the tile as a mine
				c[y][x].mine = true
				// We placed a mine, break out of this loop
				break
			}
		}
	}
	return c
}

// randomChunkFromFirstMove creates a chunk with the given number of mines,
// but doesn't put a mine at the given position
func randomChunkFromFirstMove(numMines int, startPos Pos) *chunk {
	c := new(chunk)

	// Place the mines
	for i := 0; i < numMines; i++ {
		// Loop until the mine is placed
		for true {
			// Find a random spot to place the mine
			y := rand.Intn(ChunkSize)
			x := rand.Intn(ChunkSize)
			// If the spot doesn't already have a mine and isn't near the
			// start point
			if !c[y][x].mine &&
				!(x >= startPos.X-1 && x <= startPos.X+1 &&
					y >= startPos.Y-1 && y <= startPos.Y+1) {
				// Set the tile as a mine
				c[y][x].mine = true
				// We placed a mine, break out of this loop
				break
			}
		}
	}
	return c
}

func (c *chunk) toBytes() (b []byte) {
	b = make([]byte, ChunkSize*ChunkSize)
	for y, row := range c {
		for x, tile := range row {
			b[(y*ChunkSize)+x] = tile.toByte()
		}
	}
	return
}

func chunkFromBytes(b []byte) (c *chunk) {
	c = new(chunk)
	for y := 0; y < ChunkSize; y++ {
		for x := 0; x < ChunkSize; x++ {
			c[y][x] = chunkTileFromByte(b[(y*ChunkSize)+x])
		}
	}
	return
}

func mod(a, b int) int {
	return (a%b + b) % b
}

func fieldPos(p Pos) Pos {
	// move negative positions over a chunk. This is because -0 == 0,
	// so a pos of -1 would be in the same chunk as a pos of 1
	if p.X < 0 {
		p.X -= ChunkSize
	}
	if p.Y < 0 {
		p.Y -= ChunkSize
	}
	return Pos{p.X / ChunkSize, p.Y / ChunkSize}
}

// Converts the given x and y to the index of the chunk in the field,
// and the position within that chunk
func chunkPos(p Pos) (chunkIndex Pos, chunkPos Pos) {
	return fieldPos(p), Pos{mod(p.X, ChunkSize), mod(p.Y, ChunkSize)}
}

// InfiniteGame stores an infinite minesweeper game
type InfiniteGame struct {
	mineDensity int
	field       map[Pos]*chunk
	state       GameState
	startTime   time.Time
}

func NewInfiniteGame(mineDensity int) (Game, error) {
	g := &InfiniteGame{
		field: make(map[Pos]*chunk),
	}

	// Reset the game
	err := g.Reset(mineDensity)
	if err != nil {
		return nil, err
	}

	return g, nil
}

func (g *InfiniteGame) Reset(mineDensity int) error {
	// Sanity check
	if mineDensity > (ChunkSize*ChunkSize)-9 {
		return fmt.Errorf(
			"too many mines! mineDensity (%d) > %d * %d - 9",
			mineDensity, ChunkSize, ChunkSize)
	}

	g.mineDensity = mineDensity
	g.state = GameStateStart

	return nil
}

func (g *InfiniteGame) Uncover(x, y int) (s GameState) {
	defer func() {
		// The return value is the game's state
		s = g.state
	}()

	// If the game hasn't started yet
	if g.state == GameStateStart {
		// Set the start time
		g.startTime = time.Now()
		// Set the game as started
		g.state = GameStatePlaying
	}

	{
		chunkIndex, chunkPos := chunkPos(Pos{x, y})

		// Get the chunk
		chunk, ok := g.field[chunkIndex]
		// Or create one if it doesn't exist
		if !ok {
			// Use a random chunk for the first move,
			// so the user doesn't click a mine accidentally
			chunk = randomChunkFromFirstMove(g.mineDensity, chunkPos)
			g.field[chunkIndex] = chunk
		}

		// If the cell is flagged, the cell is already discovered, or the game has ended
		if chunk[chunkPos.Y][chunkPos.X].discovered || chunk[chunkPos.Y][chunkPos.X].flagged ||
			g.state != GameStatePlaying {
			// Nothing needs to be done, so just return the game's state
			return g.state
		}

		// If the tile is a mine
		if chunk[chunkPos.Y][chunkPos.X].mine {
			// This is infinite mode, so just set the tile as discovered and return
			chunk[chunkPos.Y][chunkPos.X].discovered = true
			return
		}
	}

	// Create a queue
	queue := []Pos{{x, y}}

	// While there are tiles to process
	for len(queue) > 0 {
		// Pop the tile position off the queue
		pos := queue[len(queue)-1]
		queue = queue[:len(queue)-1]

		// Get the tile
		tile := g.get(pos)

		// Set the tile as discovered
		tile.discovered = true

		// Get the neighbouring tiles
		neighbouringTiles := g.neighbouringTiles(pos.X, pos.Y)
		numNeighbouringMines := mineCount(neighbouringTiles)

		// If the tile is empty
		if numNeighbouringMines == 0 {
			// Uncover the neighbouring tiles
			for _, neighbouringTile := range neighbouringTiles {
				// Only uncover undiscovered tiles
				if !neighbouringTile.discovered {
					queue = append(queue, Pos{neighbouringTile.X, neighbouringTile.Y})
				}
			}
		}
	}

	return
}

// Flag the tile at the given coordinate, always returns Int.MAX_VALUE
func (g *InfiniteGame) Flag(x, y int) float64 {
	// If the game has ended
	if g.state > GameStatePlaying {
		// Nothing needs to be done, so return
		return g.RemainingMines()
	}

	// Get the tile
	tile := g.get(Pos{x, y})

	// If the tile is already discovered, just return
	if tile.discovered {
		return g.RemainingMines()
	}

	// Invert the flag field
	tile.flagged = !tile.flagged

	return g.RemainingMines()
}

func (g *InfiniteGame) State() GameState {
	return g.state
}

func (g *InfiniteGame) StartTime() time.Time {
	return g.startTime
}

func (g *InfiniteGame) SinceStart() time.Duration {
	if g.state == GameStateStart {
		return 0
	}
	return time.Now().Sub(g.startTime)
}

func (g *InfiniteGame) MineDensity() int {
	return g.mineDensity
}

func (g *InfiniteGame) RemainingMines() float64 {
	return math.Inf(1)
}

func (g *InfiniteGame) Appearance(x, y, w, h int) (appearance map[Pos]TileType) {
	maxX, maxY := x+w, y+h

	appearance = make(map[Pos]TileType, w*h)
	for y := y; y < maxY; y++ {
		for x := x; x < maxX; x++ {
			// Get the chunk
			pos := Pos{x, y}
			chunkIndex, chunkPos := chunkPos(pos)
			chunk, ok := g.field[chunkIndex]

			// If the chunk doesn't exist, then the tile is hidden
			if !ok {
				appearance[pos] = TileTypeHidden
			} else {
				// Get the tile
				tile := chunk[chunkPos.Y][chunkPos.X]

				// If the tile hasn't been discovered
				if !tile.discovered {
					// If the tile is flagged
					if tile.flagged {
						// Set the tile as flagged
						appearance[pos] = TileTypeFlag
					} else {
						// Set the tile as hidden
						appearance[pos] = TileTypeHidden
					}

				} else if tile.mine {
					appearance[pos] = TileTypeMine

				} else {
					// todo this is pretty slow, could be cached
					neighbouringTiles := g.neighbouringTiles(x, y)
					numNeighbouringMines := mineCount(neighbouringTiles)

					// Set the appearance from the neighbouring mines
					appearance[pos] = TileType(int(TileTypeEmpty) +
						numNeighbouringMines)
				}
			}
		}
	}
	return appearance
}

func (g *InfiniteGame) Save(w io.Writer) error {
	err := newHeader(saveHeaderInfiniteGameType).save(w)
	if err != nil {
		return err
	}

	// Write the mine density and start time as 64 bit ints
	for _, data := range []int64{int64(g.mineDensity), g.startTime.UnixNano()} {
		err = binary.Write(w, serialiseByteOrder, data)
		if err != nil {
			return err
		}
	}

	// Write the state into a single byte
	err = binary.Write(w, serialiseByteOrder, byte(g.state))
	if err != nil {
		return err
	}

	// Write the number of chunks
	err = binary.Write(w, serialiseByteOrder, int64(len(g.field)))
	if err != nil {
		return err
	}

	// Write the chunks
	for pos, chunk := range g.field {
		// Write the position
		for _, data := range []int64{int64(pos.X), int64(pos.Y)} {
			err = binary.Write(w, serialiseByteOrder, data)
			if err != nil {
				return err
			}
		}

		// Write the chunk data
		_, err = w.Write(chunk.toBytes())
		if err != nil {
			return err
		}
	}

	return nil
}

func loadInfinite(r io.Reader) (Game, error) {
	g := &InfiniteGame{}

	// Read the first 2 fields as 64 bit ints
	fields := make([]int64, 2)
	err := binary.Read(r, serialiseByteOrder, fields)
	if err != nil {
		return nil, err
	}

	// todo int overflow
	g.mineDensity = int(fields[0])
	g.startTime = time.Unix(0, fields[1])

	// Read the state byte
	// todo handle invalid state
	var state byte
	err = binary.Read(r, serialiseByteOrder, &state)
	if err != nil {
		return nil, err
	}
	g.state = GameState(state)

	// Read the number of chunks
	var numChunks int64
	err = binary.Read(r, serialiseByteOrder, &numChunks)
	if err != nil {
		return nil, err
	}

	// Read the chunks
	g.field = make(map[Pos]*chunk, numChunks)
	for i := int64(0); i < numChunks; i++ {
		// Read the position
		pos := make([]int64, 2)
		err = binary.Read(r, serialiseByteOrder, pos)
		if err != nil {
			return nil, err
		}

		// Read the chunk
		chunkBytes := make([]byte, ChunkSize*ChunkSize)
		_, err = r.Read(chunkBytes)
		if err != nil {
			return nil, err
		}
		// todo int overflow
		g.field[Pos{X: int(pos[0]), Y: int(pos[1])}] = chunkFromBytes(chunkBytes)
	}

	return g, nil
}

// Retrieve the tile at the given position, and automatically populate the
// chunk the tile is in if it doesn't exist yet
func (g *InfiniteGame) get(p Pos) *chunkTile {
	chunkIndex, chunkPos := chunkPos(p)

	// Get the chunk
	chunk, ok := g.field[chunkIndex]
	// Or create one if it doesn't exist
	if !ok {
		chunk = randomChunk(g.mineDensity)
		g.field[chunkIndex] = chunk
	}

	return &chunk[chunkPos.Y][chunkPos.X]
}

type chunkTileAndPos struct {
	Pos
	*chunkTile
}

func (g *InfiniteGame) neighbouringTiles(x, y int) (tiles []chunkTileAndPos) {
	// The array of neighbouring tiles
	tiles = make([]chunkTileAndPos, 0, 8)
	// Iterate over the 3x3 around the tile
	for neighbourY := y - 1; neighbourY <= y+1; neighbourY++ {
		for neighbourX := x - 1; neighbourX <= x+1; neighbourX++ {
			// Skip if the tile is the center tile
			if neighbourY == y && neighbourX == x {
				continue
			}
			// Add the tile
			tiles = append(tiles, chunkTileAndPos{
				Pos:       Pos{X: neighbourX, Y: neighbourY},
				chunkTile: g.get(Pos{neighbourX, neighbourY}),
			})
		}
	}
	return
}

func mineCount(neighbouringTiles []chunkTileAndPos) int {
	// Count the number of mines
	count := 0
	for _, tile := range neighbouringTiles {
		if tile.mine {
			count++
		}
	}
	return count
}
