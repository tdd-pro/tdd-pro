package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
)

// MCPConfig represents the structure of .mcp.json files
type MCPConfig struct {
	MCPServers map[string]MCPServer `json:"mcpServers"`
}

type MCPServer struct {
	Command string            `json:"command"`
	Args    []string          `json:"args"`
	Env     map[string]string `json:"env"`
}

// MCPConfigMsg is sent when MCP configuration is complete
type MCPConfigMsg struct {
	Success bool
	Message string
}

// MCPConfigDialog handles MCP configuration setup
type MCPConfigDialog struct {
	form        *huh.Form
	visible     bool
	projectPath string
	
	// Form values
	createMCPConfigs bool
	createCursor     bool
	createVSCode     bool
}

// NewMCPConfigDialog creates a new MCP configuration dialog
func NewMCPConfigDialog(projectPath string) *MCPConfigDialog {
	dialog := &MCPConfigDialog{
		projectPath: projectPath,
		visible:     false,
	}
	
	dialog.form = dialog.createForm()
	return dialog
}

// Show displays the MCP configuration dialog
func (d *MCPConfigDialog) Show() {
	d.visible = true
}

// Hide hides the MCP configuration dialog
func (d *MCPConfigDialog) Hide() {
	d.visible = false
}

// IsVisible returns whether the dialog is currently visible
func (d *MCPConfigDialog) IsVisible() bool {
	return d.visible
}

// Init initializes the dialog
func (d *MCPConfigDialog) Init() tea.Cmd {
	if d.form == nil {
		return nil
	}
	return d.form.Init()
}

// Update handles dialog updates
func (d *MCPConfigDialog) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if !d.visible || d.form == nil {
		return d, nil
	}
	
	form, cmd := d.form.Update(msg)
	d.form = form.(*huh.Form)
	
	// Check if form is completed
	if d.form.State == huh.StateCompleted {
		d.visible = false
		return d, d.handleFormComplete()
	}
	
	// Check if form was aborted
	if d.form.State == huh.StateAborted {
		d.visible = false
		return d, func() tea.Msg {
			return MCPConfigMsg{
				Success: false,
				Message: "MCP configuration cancelled",
			}
		}
	}
	
	return d, cmd
}

// View renders the dialog
func (d *MCPConfigDialog) View() string {
	if !d.visible || d.form == nil {
		return ""
	}
	return d.form.View()
}

// createForm creates the MCP configuration form
func (d *MCPConfigDialog) createForm() *huh.Form {
	// Use Charm theme for professional look
	theme := huh.ThemeCharm()
	
	return huh.NewForm(
		huh.NewGroup(
			huh.NewNote().
				Title("🔧 MCP Configuration Setup").
				Description("TDD-Pro includes an MCP (Model Context Protocol) server for AI integration.\n\nWould you like to create configuration files for your editors?").
				Next(true).
				NextLabel("Continue"),
		),
		
		huh.NewGroup(
			huh.NewConfirm().
				Title("Create MCP configuration files?").
				Description("This will create .mcp.json files that allow AI assistants to use TDD-Pro tools.").
				Affirmative("Yes, create them").
				Negative("No, skip this").
				Value(&d.createMCPConfigs),
		),
		
		huh.NewGroup(
			huh.NewConfirm().
				Title("Create Cursor configuration?").
				Description("Create .cursor/.mcp.json for Cursor AI editor integration.").
				Affirmative("Yes").
				Negative("No").
				Value(&d.createCursor),
			
			huh.NewConfirm().
				Title("Create VS Code configuration?").
				Description("Create .vscode/.mcp.json for VS Code with Cody or similar extensions.").
				Affirmative("Yes").
				Negative("No").
				Value(&d.createVSCode),
		).WithHideFunc(func() bool { return !d.createMCPConfigs }),
	).WithTheme(theme)
}

// handleFormComplete processes the completed form
func (d *MCPConfigDialog) handleFormComplete() tea.Cmd {
	return func() tea.Msg {
		if !d.createMCPConfigs {
			return MCPConfigMsg{
				Success: true,
				Message: "TDD-Pro initialized successfully (MCP configuration skipped)",
			}
		}
		
		var createdFiles []string
		var errors []error
		
		// Create root .mcp.json if requested
		if d.createMCPConfigs {
			rootPath := filepath.Join(d.projectPath, ".mcp.json")
			if err := d.createMCPConfigFile(rootPath); err != nil {
				errors = append(errors, fmt.Errorf("root config: %w", err))
			} else {
				createdFiles = append(createdFiles, ".mcp.json")
			}
		}
		
		// Create Cursor configuration if requested
		if d.createCursor {
			cursorPath := filepath.Join(d.projectPath, ".cursor", ".mcp.json")
			if err := d.createMCPConfigFile(cursorPath); err != nil {
				errors = append(errors, fmt.Errorf("Cursor config: %w", err))
			} else {
				createdFiles = append(createdFiles, ".cursor/.mcp.json")
			}
		}
		
		// Create VS Code configuration if requested
		if d.createVSCode {
			vscodePath := filepath.Join(d.projectPath, ".vscode", ".mcp.json")
			if err := d.createMCPConfigFile(vscodePath); err != nil {
				errors = append(errors, fmt.Errorf("VS Code config: %w", err))
			} else {
				createdFiles = append(createdFiles, ".vscode/.mcp.json")
			}
		}
		
		// Build result message
		if len(errors) > 0 {
			errMsg := "Errors occurred: "
			for i, err := range errors {
				if i > 0 {
					errMsg += ", "
				}
				errMsg += err.Error()
			}
			return MCPConfigMsg{
				Success: false,
				Message: errMsg,
			}
		}
		
		message := "TDD-Pro initialized successfully!"
		if len(createdFiles) > 0 {
			message += fmt.Sprintf(" Created: %v", createdFiles)
		}
		
		return MCPConfigMsg{
			Success: true,
			Message: message,
		}
	}
}

// createMCPConfigFile creates an MCP configuration file
func (d *MCPConfigDialog) createMCPConfigFile(filePath string) error {
	// Ensure directory exists
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", dir, err)
	}
	
	// Create MCP server configuration pointing to the current project
	serverPath := filepath.Join(d.projectPath, "packages", "tdd-pro", "mcp-stdio-server.ts")
	
	config := MCPConfig{
		MCPServers: map[string]MCPServer{
			"tdd-pro": {
				Command: serverPath,
				Args:    []string{},
				Env: map[string]string{
					"NODE_ENV": "development",
				},
			},
		},
	}
	
	// Check if file exists and has existing config
	if existingData, err := os.ReadFile(filePath); err == nil {
		var existingConfig MCPConfig
		if err := json.Unmarshal(existingData, &existingConfig); err == nil {
			// Merge with existing config
			if existingConfig.MCPServers == nil {
				existingConfig.MCPServers = make(map[string]MCPServer)
			}
			existingConfig.MCPServers["tdd-pro"] = config.MCPServers["tdd-pro"]
			config = existingConfig
		}
	}
	
	// Write the configuration file
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}
	
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}
	
	return nil
}