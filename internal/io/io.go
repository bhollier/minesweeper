package io

import ms "github.com/bhollier/minesweeper/pkg/minesweeper"

// Interface type for an "IO" type. Not currently used for anything
type IO interface {
	Game() *ms.Game
	Run()
}
