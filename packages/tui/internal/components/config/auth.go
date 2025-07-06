package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
)

// AuthDialog handles Claude API key authentication
type AuthDialog struct {
	form     *huh.Form
	visible  bool
	apiKey   string
}

// AuthResultMsg represents the result of authentication
type AuthResultMsg struct {
	Success bool
	Message string
}

// AuthCredentials represents stored Claude credentials
type AuthCredentials struct {
	ClaudeAPIKey string `json:"claude_api_key"`
}

// NewAuthDialog creates a new authentication dialog
func NewAuthDialog() *AuthDialog {
	dialog := &AuthDialog{}
	dialog.buildForm()
	return dialog
}

func (d *AuthDialog) buildForm() {
	d.form = huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Key("apikey").
				Title("Claude API Key").
				Description("Enter your Claude API key (starts with 'sk-ant-')").
				Placeholder("sk-ant-api03-...").
				Password(true).
				Validate(func(s string) error {
					if s == "" {
						return fmt.Errorf("API key is required")
					}
					if !strings.HasPrefix(s, "sk-ant-") {
						return fmt.Errorf("Claude API key should start with 'sk-ant-'")
					}
					if len(s) < 20 {
						return fmt.Errorf("API key appears to be too short")
					}
					return nil
				}).
				Value(&d.apiKey),
		),
	).
		WithTheme(huh.ThemeDracula()). // Match our Bagels-style theme
		WithShowHelp(false).
		WithShowErrors(true)
}

func (d *AuthDialog) Init() tea.Cmd {
	return d.form.Init()
}

func (d *AuthDialog) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if !d.visible {
		return d, nil
	}

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch {
		case key.Matches(msg, key.NewBinding(key.WithKeys("esc"))):
			d.visible = false
			return d, func() tea.Msg {
				return AuthResultMsg{
					Success: false,
					Message: "Authentication cancelled",
				}
			}
		}
	}

	// Handle form updates
	form, cmd := d.form.Update(msg)
	if f, ok := form.(*huh.Form); ok {
		d.form = f
	}

	// Check if form is complete
	if d.form.State == huh.StateCompleted {
		d.visible = false
		
		// Save credentials
		if err := d.saveCredentials(); err != nil {
			return d, func() tea.Msg {
				return AuthResultMsg{
					Success: false,
					Message: "Failed to save credentials: " + err.Error(),
				}
			}
		}

		return d, func() tea.Msg {
			return AuthResultMsg{
				Success: true,
				Message: "Claude API key saved successfully! Credentials stored in ~/.config/tdd-pro/auth.json",
			}
		}
	}

	return d, cmd
}

func (d *AuthDialog) View() string {
	if !d.visible {
		return ""
	}

	// Create the form view
	formView := d.form.View()
	
	// Add header with instructions
	headerStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("39")).
		Bold(true).
		Padding(0, 1)
	
	descStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("245")).
		Padding(0, 1)
	
	header := headerStyle.Render("🔐 Claude Authentication")
	description := descStyle.Render("Configure your Claude API key for TDD-Pro agents")
	
	// Add help text
	helpText := lipgloss.NewStyle().
		Foreground(lipgloss.Color("245")).
		Italic(true).
		Padding(1, 1).
		Render("Get your API key from: https://console.anthropic.com/")
	
	// Combine all parts
	content := lipgloss.JoinVertical(
		lipgloss.Left,
		header,
		description,
		"",
		formView,
		"",
		helpText,
	)
	
	// Create border around the dialog
	dialogStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("240")).
		Padding(1, 2).
		Width(70)
	
	return dialogStyle.Render(content)
}

// Show makes the dialog visible
func (d *AuthDialog) Show() {
	d.visible = true
	d.apiKey = "" // Reset form
	d.buildForm() // Rebuild form to reset state
}

// Hide makes the dialog invisible
func (d *AuthDialog) Hide() {
	d.visible = false
}

// IsVisible returns whether the dialog is currently visible
func (d *AuthDialog) IsVisible() bool {
	return d.visible
}

// saveCredentials saves the API key to the auth file
func (d *AuthDialog) saveCredentials() error {
	// Get config directory
	configDir, err := getConfigDir()
	if err != nil {
		return fmt.Errorf("failed to get config directory: %w", err)
	}
	
	// Ensure config directory exists
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}
	
	// Prepare credentials
	creds := AuthCredentials{
		ClaudeAPIKey: d.apiKey,
	}
	
	// Marshal to JSON
	data, err := json.MarshalIndent(creds, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal credentials: %w", err)
	}
	
	// Write to auth file with restricted permissions
	authPath := filepath.Join(configDir, "auth.json")
	if err := os.WriteFile(authPath, data, 0600); err != nil {
		return fmt.Errorf("failed to write auth file: %w", err)
	}
	
	return nil
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

// LoadCredentials loads Claude credentials from the auth file
func LoadCredentials() (*AuthCredentials, error) {
	configDir, err := getConfigDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get config directory: %w", err)
	}
	
	authPath := filepath.Join(configDir, "auth.json")
	
	// Check if auth file exists
	if _, err := os.Stat(authPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("no credentials found, run /auth to configure")
	}
	
	// Read auth file
	data, err := os.ReadFile(authPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read auth file: %w", err)
	}
	
	// Parse credentials
	var creds AuthCredentials
	if err := json.Unmarshal(data, &creds); err != nil {
		return nil, fmt.Errorf("failed to parse auth file: %w", err)
	}
	
	return &creds, nil
}

// GetClaudeAPIKey returns the stored Claude API key
func GetClaudeAPIKey() (string, error) {
	// First check environment variable
	if apiKey := os.Getenv("ANTHROPIC_API_KEY"); apiKey != "" {
		return apiKey, nil
	}
	
	// Then check stored credentials
	creds, err := LoadCredentials()
	if err != nil {
		return "", err
	}
	
	if creds.ClaudeAPIKey == "" {
		return "", fmt.Errorf("no Claude API key found")
	}
	
	return creds.ClaudeAPIKey, nil
}