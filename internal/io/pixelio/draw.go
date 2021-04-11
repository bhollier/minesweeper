package pixelio

import (
	ms "github.com/bhollier/minesweeper/pkg/minesweeper"
	"github.com/faiface/pixel"
)

const tileDrawSize = float64(30)

func (io *PixelIO) drawToBatch(appearance [][]ms.TileType) {
	io.batch.Clear()
	for y, row := range appearance {
		for x, tileType := range row {
			// Create the matrix
			mat := pixel.IM
			// Scale it to the correct size
			mat = mat.Scaled(pixel.ZV, tileDrawSize/spriteSize)
			// Move it to the position
			mat = mat.Moved(
				pixel.V((float64(x)*tileDrawSize)+tileDrawSize/2,
					(float64(y)*tileDrawSize)+tileDrawSize/2))
			// Draw the sprite to the batch
			io.spritesheet.Sprites[tileType].Draw(io.batch, mat)
		}
	}
}
