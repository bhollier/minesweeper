package minesweeper

import (
	"bytes"
	"github.com/stretchr/testify/assert"
	"math/rand"
	"testing"
)

func TestFiniteSerialiseRoundtrip(t *testing.T) {
	rand.Seed(42)
	a := assert.New(t)

	for i := 0; i < 10; i++ {
		game, err := NewGame(16, 16, 40)
		a.NoError(err)
		game.Uncover(8, 8)

		var buf bytes.Buffer
		a.NoError(game.Save(&buf))

		loadedGame, err := Load(&buf)
		a.NoError(err)

		a.IsType(game, loadedGame)

		expected := *game.(*FiniteGame)
		actual := *loadedGame.(*FiniteGame)
		a.Equal(expected.w, actual.w)
		a.Equal(expected.h, actual.h)
		a.Equal(expected.numMines, actual.numMines)
		a.Equal(expected.startTime.Unix(), actual.startTime.Unix())
		a.Equal(expected.state, actual.state)
		a.Equal(expected.field, actual.field)
		a.Equal(expected.flags, actual.flags)
	}

}
