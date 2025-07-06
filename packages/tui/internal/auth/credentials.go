package auth

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Credentials represents stored authentication credentials
type Credentials struct {
	ClaudeAPIKey string `json:"claude_api_key"`
}

// GetClaudeAPIKey returns the Claude API key from stored credentials or environment
func GetClaudeAPIKey() (string, error) {
	// First check environment variable (takes precedence)
	if apiKey := os.Getenv("ANTHROPIC_API_KEY"); apiKey != "" {
		return apiKey, nil
	}
	
	// Then check stored credentials
	creds, err := LoadCredentials()
	if err != nil {
		return "", fmt.Errorf("no Claude API key found: %w", err)
	}
	
	if creds.ClaudeAPIKey == "" {
		return "", fmt.Errorf("no Claude API key configured, run TDD-Pro TUI and use /auth command")
	}
	
	return creds.ClaudeAPIKey, nil
}

// LoadCredentials loads authentication credentials from the auth file
func LoadCredentials() (*Credentials, error) {
	configDir, err := getConfigDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get config directory: %w", err)
	}
	
	authPath := filepath.Join(configDir, "auth.json")
	
	// Check if auth file exists
	if _, err := os.Stat(authPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("no credentials file found at %s", authPath)
	}
	
	// Read auth file
	data, err := os.ReadFile(authPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read auth file: %w", err)
	}
	
	// Parse credentials
	var creds Credentials
	if err := json.Unmarshal(data, &creds); err != nil {
		return nil, fmt.Errorf("failed to parse auth file: %w", err)
	}
	
	return &creds, nil
}

// HasCredentials checks if valid credentials exist
func HasCredentials() bool {
	// Check environment variable first
	if apiKey := os.Getenv("ANTHROPIC_API_KEY"); apiKey != "" {
		return true
	}
	
	// Check stored credentials
	_, err := LoadCredentials()
	return err == nil
}

// getConfigDir returns the TDD-Pro config directory
func getConfigDir() (string, error) {
	// Use XDG config directory or fallback to ~/.config
	configDir := os.Getenv("XDG_CONFIG_HOME")
	if configDir == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		configDir = filepath.Join(homeDir, ".config")
	}
	
	return filepath.Join(configDir, "tdd-pro"), nil
}

// GetAuthStatus returns a human-readable status of authentication
func GetAuthStatus() string {
	if apiKey := os.Getenv("ANTHROPIC_API_KEY"); apiKey != "" {
		return "Authenticated via ANTHROPIC_API_KEY environment variable"
	}
	
	creds, err := LoadCredentials()
	if err != nil {
		return "Not authenticated - no credentials found"
	}
	
	if creds.ClaudeAPIKey == "" {
		return "Not authenticated - no API key configured"
	}
	
	configDir, _ := getConfigDir()
	authPath := filepath.Join(configDir, "auth.json")
	return fmt.Sprintf("Authenticated via stored credentials (%s)", authPath)
}