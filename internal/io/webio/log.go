package webio

import (
	"fmt"
	"os"
	"time"
)

const logTimeFormat = "2006/01/02 15:04:05.000"

func consoleLog(v ...interface{}) {
	logStart := time.Now().Format(logTimeFormat)
	fmt.Println(append([]interface{}{"(" + logStart + ") GO:"}, v...)...)
}

func consoleLogF(format string, v ...interface{}) {
	logStart := time.Now().Format(logTimeFormat)
	fmt.Printf("("+logStart+") GO: "+format+"\n", v...)
}

func consoleLogFatal(v ...interface{}) {
	consoleLog(v...)
	os.Exit(1)
}

func consoleLogFatalF(format string, v ...interface{}) {
	consoleLogF(format, v...)
	os.Exit(1)
}
