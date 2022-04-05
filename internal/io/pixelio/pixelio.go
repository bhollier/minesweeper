package pixelio

import (
	ms "github.com/bhollier/minesweeper/pkg/minesweeper"
	"github.com/faiface/pixel"
	"github.com/faiface/pixel/pixelgl"
	_ "image/png"
	"log"
	"math/rand"
	"time"
)

// PixelIO is an IO for minesweeper with the pixel graphics library
type PixelIO struct {
	game        *ms.Game
	window      *pixelgl.Window
	spritesheet *spritesheet
	batch       *pixel.Batch
}

func New() *PixelIO {
	return new(PixelIO)
}

// Run starts the program
func (io *PixelIO) Run() {
	var err error
	rand.Seed(time.Now().Unix())
	io.game, err = ms.NewGame(16, 16, 40)
	if err != nil {
		log.Fatal(err)
	}

	pixelgl.Run(func() {
		// Load the spritesheet
		log.Print("Loading spritesheet...")
		io.spritesheet, err = newSpritesheet()
		if err != nil {
			log.Fatal(err)
		}

		// Create a window
		log.Print("Creating window...")
		w, h := io.game.Size()
		io.window, err = pixelgl.NewWindow(pixelgl.WindowConfig{
			Title: "Minesweeper",
			Bounds: pixel.R(0, 0,
				float64(w)*tileDrawSize, float64(h)*tileDrawSize),
			Icon: []pixel.Picture{io.spritesheet.Icon},
		})
		if err != nil {
			log.Fatal(err)
		}
		log.Print("Done")

		// Create the batch
		io.batch = pixel.NewBatch(
			&pixel.TrianglesData{}, io.spritesheet.SheetPicture)

		// Draw to the batch
		io.drawToBatch(io.game.Appearance())

		// Start the main loop
		for !io.window.Closed() {
			// If the LMB was pressed
			if io.window.JustPressed(pixelgl.MouseButtonLeft) {
				// Get the tile's position from the mouse
				mousePos := io.window.MousePosition()
				x := int(mousePos.X / tileDrawSize)
				y := int(mousePos.Y / tileDrawSize)
				// Uncover the tile
				io.game.Uncover(x, y)
				// Redraw to the batch
				io.drawToBatch(io.game.Appearance())
			}
			if io.window.JustPressed(pixelgl.MouseButtonRight) {
				// Get the tile's position from the mouse
				mousePos := io.window.MousePosition()
				x := int(mousePos.X / tileDrawSize)
				y := int(mousePos.Y / tileDrawSize)
				// Uncover the tile
				io.game.Flag(x, y)
				// Redraw to the batch
				io.drawToBatch(io.game.Appearance())
			}

			// Draw the mines
			io.batch.Draw(io.window)
			io.window.Update()
		}
	})
}
