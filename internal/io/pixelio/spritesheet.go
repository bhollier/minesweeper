package pixelio

import (
	"bytes"
	_ "embed"
	ms "github.com/bhollier/minesweeper/pkg/minesweeper"
	"github.com/faiface/pixel"
	"image"
)

type spritesheet struct {
	SheetPicture pixel.Picture
	Icon         pixel.Picture
	Sprites      map[ms.TileType]*pixel.Sprite
}

const spriteSize = 10

//go:embed spritesheet.png
var spritesheetImage []byte

//go:embed icon.png
var iconImage []byte

func newSpritesheet() (s *spritesheet, err error) {
	s = new(spritesheet)

	// Create the image from the embedded image
	img, _, err := image.Decode(bytes.NewReader(spritesheetImage))
	if err != nil {
		return nil, err
	}
	s.SheetPicture = pixel.PictureDataFromImage(img)

	// Create the icon from the embedded image
	img, _, err = image.Decode(bytes.NewReader(iconImage))
	if err != nil {
		return nil, err
	}
	s.Icon = pixel.PictureDataFromImage(img)

	// Create the sprites
	s.Sprites = make(map[ms.TileType]*pixel.Sprite)
	x := float64(0)
	for tileType := ms.TileTypeEmpty; tileType < ms.NumTileTypes; tileType++ {
		s.Sprites[tileType] = pixel.NewSprite(s.SheetPicture,
			pixel.R(x, 0, x+spriteSize, spriteSize))
		x += spriteSize
	}

	return s, err
}
