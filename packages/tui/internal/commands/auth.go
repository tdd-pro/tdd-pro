package commands

import (
	tea "github.com/charmbracelet/bubbletea"
	"tddpro/internal/components/config"
)

// AuthCommand handles the /auth command
type AuthCommand struct {
	authDialog *config.AuthDialog
}

// NewAuthCommand creates a new auth command handler
func NewAuthCommand() *AuthCommand {
	return &AuthCommand{}
}

// Execute handles the /auth command execution
func (cmd *AuthCommand) Execute(arg string) (tea.Model, tea.Cmd) {
	// Create and show the auth dialog
	cmd.authDialog = config.NewAuthDialog()
	cmd.authDialog.Show()
	
	return cmd.authDialog, cmd.authDialog.Init()
}

// Update handles updates for the auth command
func (cmd *AuthCommand) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if cmd.authDialog == nil {
		return nil, nil
	}
	
	// Handle auth dialog updates
	var authCmd tea.Cmd
	model, authCmd := cmd.authDialog.Update(msg)
	cmd.authDialog = model.(*config.AuthDialog)
	
	// Check for auth completion
	if authMsg, ok := msg.(config.AuthResultMsg); ok {
		return nil, func() tea.Msg {
			return CommandResultMsg{
				Success: authMsg.Success,
				Message: authMsg.Message,
			}
		}
	}
	
	return cmd.authDialog, authCmd
}

// View renders the auth command
func (cmd *AuthCommand) View() string {
	if cmd.authDialog == nil {
		return ""
	}
	return cmd.authDialog.View()
}

// IsActive returns whether the auth command is currently active
func (cmd *AuthCommand) IsActive() bool {
	return cmd.authDialog != nil && cmd.authDialog.IsVisible()
}