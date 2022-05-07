package minesweeper

import (
	"bytes"
	"github.com/stretchr/testify/assert"
	"math/rand"
	"testing"
)

func TestInfiniteSerialiseRoundtrip(t *testing.T) {
	rand.Seed(42)
	a := assert.New(t)

	for i := 0; i < 10; i++ {
		game, err := NewInfiniteGame(40)
		a.NoError(err)
		game.Uncover(8, 8)
		game.Uncover(-8, -8)
		game.Uncover(24, 8)

		var buf bytes.Buffer
		a.NoError(game.Save(&buf))

		loadedGame, err := Load(&buf)
		a.NoError(err)

		a.IsType(game, loadedGame)

		expected := *game.(*InfiniteGame)
		actual := *loadedGame.(*InfiniteGame)
		a.Equal(expected.mineDensity, actual.mineDensity)
		a.Equal(expected.startTime.Unix(), actual.startTime.Unix())
		a.Equal(expected.state, actual.state)
		a.Equal(expected.field, actual.field)
	}

}
