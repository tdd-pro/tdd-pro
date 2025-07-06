package main

import (
	"fmt"
	"os"

	"tddpro/internal/tui"
)

func main() {
	apiURL := tui.LoadAPIURL()
	if err := tui.Start(apiURL); err != nil {
		fmt.Println("Error running program:", err)
		os.Exit(1)
	}
}
