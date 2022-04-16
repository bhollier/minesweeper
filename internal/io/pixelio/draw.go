package pixelio

import (
	ms "github.com/bhollier/minesweeper/pkg/minesweeper"
	"github.com/faiface/pixel"
)

const tileDrawSize = float64(30)

func (io *PixelIO) drawToBatch(appearance map[ms.Pos]ms.TileType) {
	io.batch.Clear()
	for pos, tileType := range appearance {
		// Create the matrix
		mat := pixel.IM
		// Scale it to the correct size
		mat = mat.Scaled(pixel.ZV, tileDrawSize/spriteSize)
		// Move it to the position
		mat = mat.Moved(
			pixel.V((float64(pos.X)*tileDrawSize)+tileDrawSize/2,
				(float64(pos.Y)*tileDrawSize)+tileDrawSize/2))
		// Draw the sprite to the batch
		io.spritesheet.Sprites[tileType].Draw(io.batch, mat)
	}
}
