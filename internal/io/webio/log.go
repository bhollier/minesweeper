package webio

import (
	"fmt"
	"os"
)

func consoleLog(v ...interface{}) {
	fmt.Println(append([]interface{}{"GO:"}, v...)...)
}

func consoleLogF(format string, v ...interface{}) {
	fmt.Printf("GO: "+format+"\n", v...)
}

func consoleLogFatal(v ...interface{}) {
	consoleLog(v...)
	os.Exit(1)
}

func consoleLogFatalF(format string, v ...interface{}) {
	consoleLogF(format, v...)
	os.Exit(1)
}
