package main

import (
	"log"
	"net/http"
)

func main() {
	err := http.ListenAndServe(":8080", http.FileServer(http.Dir("./web")))
	if err != nil {
		log.Fatal(err)
	}
}
