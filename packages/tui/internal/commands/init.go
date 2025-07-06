package commands

import (
	"fmt"
	"os"
	"path/filepath"

	"tddpro/internal/components/config"
	"tddpro/internal/util"

	tea "github.com/charmbracelet/bubbletea"
)

// InitCommand handles the /init command
type InitCommand struct {
	mcpDialog *config.MCPConfigDialog
}

// NewInitCommand creates a new init command handler
func NewInitCommand() *InitCommand {
	return &InitCommand{}
}

// Execute handles the /init command execution
func (cmd *InitCommand) Execute(arg string) (tea.Model, tea.Cmd) {
	// Get current working directory or use provided argument
	cwd := arg
	if cwd == "" {
		var err error
		cwd, err = os.Getwd()
		if err != nil {
			return nil, func() tea.Msg {
				return CommandResultMsg{
					Success: false,
					Message: "Error getting current directory: " + err.Error(),
				}
			}
		}
	}

	// Check if any parent directory already has .tdd-pro
	if util.IsAlreadyInitialized(cwd) {
		return nil, func() tea.Msg {
			return CommandResultMsg{
				Success: false,
				Message: "Project already initialized (found .tdd-pro in parent directory)",
			}
		}
	}

	// Create .tdd-pro directory structure
	if err := cmd.createTddProStructure(cwd); err != nil {
		return nil, func() tea.Msg {
			return CommandResultMsg{
				Success: false,
				Message: "Error creating .tdd-pro structure: " + err.Error(),
			}
		}
	}

	// Show MCP configuration dialog
	cmd.mcpDialog = config.NewMCPConfigDialog(cwd)
	cmd.mcpDialog.Show()

	return cmd.mcpDialog, cmd.mcpDialog.Init()
}

// Update handles updates for the init command (mainly MCP dialog)
func (cmd *InitCommand) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if cmd.mcpDialog == nil {
		return nil, nil
	}

	// Handle MCP dialog updates
	var mcpCmd tea.Cmd
	model, mcpCmd := cmd.mcpDialog.Update(msg)
	cmd.mcpDialog = model.(*config.MCPConfigDialog)

	// Check for MCP configuration completion
	if mcpMsg, ok := msg.(config.MCPConfigMsg); ok {
		return nil, func() tea.Msg {
			return CommandResultMsg{
				Success: mcpMsg.Success,
				Message: mcpMsg.Message,
			}
		}
	}

	return cmd.mcpDialog, mcpCmd
}

// View renders the init command (mainly MCP dialog)
func (cmd *InitCommand) View() string {
	if cmd.mcpDialog == nil {
		return ""
	}
	return cmd.mcpDialog.View()
}

// IsActive returns whether the init command is currently active
func (cmd *InitCommand) IsActive() bool {
	return cmd.mcpDialog != nil && cmd.mcpDialog.IsVisible()
}

// createTddProStructure creates the basic .tdd-pro directory structure
func (cmd *InitCommand) createTddProStructure(cwd string) error {
	// Create .tdd-pro directory
	tddProDir := filepath.Join(cwd, ".tdd-pro")
	if err := os.MkdirAll(tddProDir, 0755); err != nil {
		return fmt.Errorf("failed to create .tdd-pro directory: %w", err)
	}

	// Create features directory
	featuresDir := filepath.Join(tddProDir, "features")
	if err := os.MkdirAll(featuresDir, 0755); err != nil {
		return fmt.Errorf("failed to create features directory: %w", err)
	}

	// Create index.yml file
	indexPath := filepath.Join(featuresDir, "index.yml")
	indexContent := `# TDD-Pro Features Index
# This file tracks the status and organization of features in your project

# Features organized by status:
approved: []      # Ready for implementation
planned: []       # Planned and designed
refinement: []    # Being refined and specified
backlog: []       # Future features

# Current feature being worked on (optional)
current: null
`

	if err := os.WriteFile(indexPath, []byte(indexContent), 0644); err != nil {
		return fmt.Errorf("failed to create index.yml: %w", err)
	}

	return nil
}

// CommandResultMsg represents the result of a command execution
type CommandResultMsg struct {
	Success bool
	Message string
}
