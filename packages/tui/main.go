package main

import (
	"flag"
	"fmt"
	"os"

	"tddpro/internal/tui"
)

const version = "v0.1.0"

func main() {
	// Add --version and -v flag support
	showVersion := false
	flag.BoolVar(&showVersion, "version", false, "Print version and exit")
	flag.BoolVar(&showVersion, "v", false, "Print version and exit (shorthand)")
	flag.Parse()
	if showVersion {
		fmt.Println(version)
		os.Exit(0)
	}

	apiURL := tui.LoadAPIURL()
	if err := tui.Start(apiURL); err != nil {
		fmt.Println("Error running program:", err)
		os.Exit(1)
	}
}
