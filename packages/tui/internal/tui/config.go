package tui

import (
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type config struct {
	API string `yaml:"api"`
}

// LoadAPIURL reads ~/.config/tdd-pro/config.yml and returns the API URL, defaulting to localhost:800 if missing/empty.
func LoadAPIURL() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return "localhost:800"
	}
	path := filepath.Join(home, ".config", "tdd-pro", "config.yml")
	data, err := os.ReadFile(path)
	if err != nil {
		return "localhost:800"
	}
	var cfg config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return "localhost:800"
	}
	if cfg.API == "" {
		return "localhost:800"
	}
	return cfg.API
}
