module github.com/bhollier/minesweeper/cmd/pixel

go 1.16

replace github.com/bhollier/minesweeper => ../..

replace github.com/bhollier/minesweeper/internal/io/pixelio => ../../internal/io/pixelio

require github.com/bhollier/minesweeper/internal/io/pixelio v0.0.0
