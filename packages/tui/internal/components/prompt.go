package components

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"tddpro/internal/commands"
	"tddpro/internal/mcpclient"
	"tddpro/internal/streams"

	"github.com/charmbracelet/bubbles/textarea"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
)

type Prompt struct {
	// Replace primitive input with proper textinput component
	textInput textinput.Model

	ctrlCPressed     bool
	APIURL           string
	MCP              *mcpclient.MCPClient
	StatusBar        string // New field for status messages
	promptingForCWD  bool
	awaitingCWDInput bool
	cwdCandidate     string

	// New completion system
	completionManager *CompletionManager
	completionDialog  *CompletionDialog

	ThinkingState      []string // last 3 thinking/tool call messages
	FeaturesViewActive bool
	FeaturesData       mcpclient.FeaturesData
	FeaturesTab        int // 0=Data, 1=Tasks
	SelectedFeature    *mcpclient.Feature
	WindowHeight       int
	WindowWidth        int
	
	// Scrolling state
	sidebarScroll    int // Workflow panel scroll offset
	mainPanelScroll  int // Feature panel scroll offset
	
	// Focus state - 0=Workflow, 1=Feature Data, 2=Feature Tasks
	focusState       int
	
	// Task selection state
	selectedTaskIndex int    // Which task is selected in Tasks view
	editingTask       bool   // Whether we're in task edit mode
	taskEditForm      *TaskEditForm

	// PRD editing state
	editingPRD      bool            // Whether we're in PRD edit mode
	prdEditTextarea textarea.Model  // Multiline text area for PRD editing
	prdOriginal     string          // Original content before editing

	// Feature metadata editing state
	featureNameEdit        textinput.Model // Always editable feature name
	featureDescriptionEdit textinput.Model // Always editable feature description

	// Destroy confirmation dialog
	destroyConfirmActive bool
	destroyTargetDir     string

	// Command handling
	initCommand *commands.InitCommand
	authCommand *commands.AuthCommand
}

func NewPrompt() Prompt {
	ti := textinput.New()
	ti.Placeholder = "Type a command or message..."
	ti.Focus()
	ti.CharLimit = 500
	ti.Width = 50
	ti.Prompt = "" // Remove default prompt since we'll add our own ">"

	// Style the textinput to match Bagels theme without background
	ti.TextStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("255"))
	ti.PlaceholderStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("245"))

	// Initialize feature editing text inputs
	nameEdit := textinput.New()
	nameEdit.Placeholder = "Feature name..."
	nameEdit.Width = 50
	nameEdit.CharLimit = 100

	descEdit := textinput.New()
	descEdit.Placeholder = "Feature description..."
	descEdit.Width = 50
	descEdit.CharLimit = 500

	prdEdit := textarea.New()
	prdEdit.Placeholder = "Edit PRD document..."
	prdEdit.SetWidth(80)
	prdEdit.SetHeight(15)

	return Prompt{
		textInput:              ti,
		completionManager:      NewCompletionManager(),
		completionDialog:       NewCompletionDialog(),
		featureNameEdit:        nameEdit,
		featureDescriptionEdit: descEdit,
		prdEditTextarea:        prdEdit,
	}
}

func NewPromptWithAPI(apiURL string) Prompt {
	ti := textinput.New()
	ti.Placeholder = "Type a command or message..."
	ti.Focus()
	ti.CharLimit = 500
	ti.Width = 50
	ti.Prompt = "" // Remove default prompt since we'll add our own ">"

	// Style the textinput to match Bagels theme without background
	ti.TextStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("255"))
	ti.PlaceholderStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("245"))

	// Initialize feature editing text inputs
	nameEdit := textinput.New()
	nameEdit.Placeholder = "Feature name..."
	nameEdit.Width = 50
	nameEdit.CharLimit = 100

	descEdit := textinput.New()
	descEdit.Placeholder = "Feature description..."
	descEdit.Width = 50
	descEdit.CharLimit = 500

	prdEdit := textarea.New()
	prdEdit.Placeholder = "Edit PRD document..."
	prdEdit.SetWidth(80)
	prdEdit.SetHeight(15)

	mcp := mcpclient.NewMCPClient(apiURL)
	return Prompt{
		textInput:              ti,
		APIURL:                 apiURL,
		MCP:                    mcp,
		StatusBar:              "",
		completionManager:      NewCompletionManager(),
		completionDialog:       NewCompletionDialog(),
		featureNameEdit:        nameEdit,
		featureDescriptionEdit: descEdit,
		prdEditTextarea:        prdEdit,
	}
}

// CommandHandler is a function that handles a command and returns the updated Prompt and tea.Cmd
// The string argument is the command argument (e.g., directory for /plan)
type CommandHandler func(*Prompt, string) (*Prompt, tea.Cmd)

// Command registry
var commandHandlers = map[string]CommandHandler{
	"/help":     handleHelp,
	"/init":     handleInit,
	"/auth":     handleAuth,
	"/destroy":  handleDestroy,
	"/features": handleFeatures,
	"/quit":     handleQuit,
}

func handlePlan(p *Prompt, arg string) (*Prompt, tea.Cmd) {
	cwd := arg
	if cwd == "" {
		var err error
		cwd, err = os.Getwd()
		if err != nil {
			p.StatusBar = "Error getting current directory: " + err.Error()
			p.textInput.SetValue("")
			return p, nil
		}
	}
	p.StatusBar = "Running tddPlanning workflow..."
	p.ThinkingState = nil

	// Start the workflow run and watcher
	go func(p *Prompt, cwd string) {
		wr, err := streams.NewWorkflowRun(cwd)
		if err != nil {
			p.StatusBar = "Error: " + err.Error()
			return
		}
		wr.Watch()
		err = wr.StartWorkflow(cwd)
		if err != nil {
			p.StatusBar = "Error: " + err.Error()
			return
		}
		for evt := range wr.Events {
			// Parse event type and payload
			var payload map[string]interface{}
			json.Unmarshal(evt.Payload, &payload)
			// Example: handle 'thinking', 'clarification', 'result', etc.
			if step, ok := payload["step"].(string); ok && step == "thinking" {
				msg := payload["msg"].(string)
				p.ThinkingState = append(p.ThinkingState, msg)
				if len(p.ThinkingState) > 3 {
					p.ThinkingState = p.ThinkingState[len(p.ThinkingState)-3:]
				}
				p.StatusBar = "Workflow is thinking..."
			} else if step == "clarification" {
				prompt := payload["prompt"].(string)
				p.StatusBar = prompt
				// Optionally yield prompt to user for input
			} else if step == "finished" {
				result := payload["result"].(string)
				p.StatusBar = "Workflow finished: " + result
				p.ThinkingState = nil
				p.textInput.SetValue("")
			}
		}
	}(p, cwd)

	return p, nil
}

func handleHelp(p *Prompt, arg string) (*Prompt, tea.Cmd) {
	p.StatusBar = "Commands:\n" +
		"/init     Initialize TDD-Pro in current directory\n" +
		"/auth     Configure Claude API key for TDD-Pro agents\n" +
		"/destroy  Remove TDD-Pro from current directory\n" +
		"/features List and manage project features\n" +
		"/quit     Exit the TDD-Pro TUI"
	p.textInput.SetValue("")
	return p, nil
}

func handleAuth(p *Prompt, arg string) (*Prompt, tea.Cmd) {
	// Initialize the auth command
	p.authCommand = commands.NewAuthCommand()

	// Execute the command
	_, cmd := p.authCommand.Execute(arg)
	p.textInput.SetValue("")

	return p, cmd
}

func handleFeatures(p *Prompt, arg string) (*Prompt, tea.Cmd) {
	var featuresData mcpclient.FeaturesData
	if p.MCP != nil {
		data, err := p.MCP.ListFeaturesViaStdio()
		if err == nil && data != nil {
			featuresData = *data
		}
	}
	// Pick first feature as selected
	var selected *mcpclient.Feature
	if len(featuresData.Approved) > 0 {
		selected = &featuresData.Approved[0]
	} else if len(featuresData.Planned) > 0 {
		selected = &featuresData.Planned[0]
	} else if len(featuresData.Refinement) > 0 {
		selected = &featuresData.Refinement[0]
	} else if len(featuresData.Backlog) > 0 {
		selected = &featuresData.Backlog[0]
	}
	p.FeaturesData = featuresData
	p.FeaturesViewActive = true
	p.FeaturesTab = 0
	p.SelectedFeature = selected
	return p, nil
}

func handleInit(p *Prompt, arg string) (*Prompt, tea.Cmd) {
	// Initialize the init command
	p.initCommand = commands.NewInitCommand()

	// Execute the command
	_, cmd := p.initCommand.Execute(arg)
	p.textInput.SetValue("")

	return p, cmd
}

// isAlreadyInitialized checks if any parent directory contains .tdd-pro
func isAlreadyInitialized(startDir string) bool {
	dir := startDir
	for {
		tddProPath := filepath.Join(dir, ".tdd-pro")
		if _, err := os.Stat(tddProPath); err == nil {
			return true
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			// Reached root directory
			break
		}
		dir = parent
	}
	return false
}

func handleDestroy(p *Prompt, arg string) (*Prompt, tea.Cmd) {
	// Get current working directory or use provided argument
	cwd := arg
	if cwd == "" {
		var err error
		cwd, err = os.Getwd()
		if err != nil {
			p.StatusBar = "Error getting current directory: " + err.Error()
			p.textInput.SetValue("")
			return p, nil
		}
	}

	// Find the .tdd-pro directory (check current and parent directories)
	tddProDir := findTddProDirectory(cwd)
	if tddProDir == "" {
		p.StatusBar = "No TDD-Pro project found in current or parent directories"
		p.textInput.SetValue("")
		return p, nil
	}

	// Show confirmation dialog
	p.destroyConfirmActive = true
	p.destroyTargetDir = tddProDir
	p.StatusBar = ""
	p.textInput.SetValue("")
	return p, nil
}

// findTddProDirectory finds the .tdd-pro directory in current or parent directories
func findTddProDirectory(startDir string) string {
	dir := startDir
	for {
		tddProPath := filepath.Join(dir, ".tdd-pro")
		if _, err := os.Stat(tddProPath); err == nil {
			return tddProPath
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			// Reached root directory
			break
		}
		dir = parent
	}
	return ""
}

func handleQuit(p *Prompt, arg string) (*Prompt, tea.Cmd) {
	return p, tea.Quit
}

func (p *Prompt) Update(msg tea.Msg) (*Prompt, tea.Cmd) {
	if m, ok := msg.(tea.WindowSizeMsg); ok {
		p.WindowHeight = m.Height
		p.WindowWidth = m.Width
	}

	// Handle command result messages
	if cmdMsg, ok := msg.(commands.CommandResultMsg); ok {
		p.StatusBar = cmdMsg.Message
		p.initCommand = nil // Clear the init command
		p.authCommand = nil // Clear the auth command
		return p, nil
	}

	// Handle init command updates
	if p.initCommand != nil && p.initCommand.IsActive() {
		_, cmd := p.initCommand.Update(msg)
		return p, cmd
	}

	// Handle auth command updates
	if p.authCommand != nil && p.authCommand.IsActive() {
		_, cmd := p.authCommand.Update(msg)
		return p, cmd
	}
	
	// Handle task edit form updates
	if p.editingTask && p.taskEditForm != nil && p.taskEditForm.IsVisible() {
		_, cmd := p.taskEditForm.Update(msg)
		return p, cmd
	}
	
	// Handle PRD edit input updates
	if p.editingPRD {
		switch keyMsg := msg.(type) {
		case tea.KeyMsg:
			switch keyMsg.String() {
			case "esc":
				// Exit PRD editing mode
				p.editingPRD = false
				p.StatusBar = "PRD editing cancelled"
				return p, nil
			case "ctrl+s", "cmd+s":
				// Save PRD changes
				newContent := p.prdEditTextarea.Value()
				if p.SelectedFeature != nil && p.MCP != nil {
					go func() {
						err := p.MCP.UpdateFeatureDocumentViaStdio(p.SelectedFeature.ID, newContent)
						if err != nil {
							p.StatusBar = fmt.Sprintf("Error saving PRD: %v", err)
						} else {
							p.StatusBar = "PRD saved successfully"
						}
					}()
				}
				p.editingPRD = false
				return p, nil
			default:
				// Handle text input
				var cmd tea.Cmd
				p.prdEditTextarea, cmd = p.prdEditTextarea.Update(msg)
				return p, cmd
			}
		}
		return p, nil
	}
	
	// Handle task edit completion/cancellation
	if editCompleteMsg, ok := msg.(TaskEditCompleteMsg); ok {
		p.editingTask = false
		p.taskEditForm = nil
		
		// Save the task changes via MCP
		if p.SelectedFeature != nil && p.MCP != nil {
			go func() {
				// Get the current task being edited
				if featureDetail, err := p.MCP.GetFeatureViaStdio(p.SelectedFeature.ID); err == nil && p.selectedTaskIndex < len(featureDetail.Tasks) {
					task := featureDetail.Tasks[p.selectedTaskIndex]
					
					// Create updates map with the edited values
					updates := map[string]interface{}{
						"name":                editCompleteMsg.Title,
						"description":         editCompleteMsg.Description,
						"acceptance_criteria": editCompleteMsg.Criteria,
					}
					
					// Save via MCP
					if err := p.MCP.UpdateTaskViaStdio(p.SelectedFeature.ID, task.ID, updates); err != nil {
						// Handle error (could send error message to UI)
						return
					}
					
					// Refresh the feature data to show updated task
					if updatedDetail, err := p.MCP.GetFeatureViaStdio(p.SelectedFeature.ID); err == nil {
						// Update the tasks in memory
						for i, feature := range p.FeaturesData.Approved {
							if feature.ID == p.SelectedFeature.ID {
								p.FeaturesData.Approved[i] = feature
								break
							}
						}
						// Store updated tasks for display
						// Note: This is a simplified update - in practice you might want to handle this via a message
						_ = updatedDetail
					}
				}
			}()
		}
		
		p.StatusBar = "Task edited: " + editCompleteMsg.Title
		return p, nil
	}
	
	if _, ok := msg.(TaskEditCancelMsg); ok {
		p.editingTask = false
		p.taskEditForm = nil
		p.StatusBar = "Task edit cancelled"
		return p, nil
	}
	
	// Handle external PRD edit completion
	if prdResult, ok := msg.(PRDEditResultMsg); ok {
		if prdResult.Success {
			// Save the edited content via MCP
			if p.SelectedFeature != nil && p.MCP != nil {
				go func() {
					if err := p.MCP.UpdateFeatureDocumentViaStdio(p.SelectedFeature.ID, prdResult.Content); err != nil {
						p.StatusBar = fmt.Sprintf("Error saving PRD: %v", err)
					} else {
						p.StatusBar = "PRD document updated successfully"
					}
				}()
			}
		} else {
			p.StatusBar = fmt.Sprintf("PRD edit failed: %s", prdResult.Error)
		}
		return p, nil
	}
	

	// Handle completion selection
	if msg, ok := msg.(CompletionSelectedMsg); ok {
		if msg.Item.IsCommand {
			// Execute command directly
			cmd, arg := parseCommand(msg.Item.Value)
			if handler, ok := commandHandlers[cmd]; ok {
				p.textInput.SetValue("")
				return handler(p, arg)
			}
		} else {
			// Insert the completion value
			p.textInput.SetValue(msg.Item.Value)
		}
		return p, nil
	}
	// Handle destroy confirmation dialog
	if p.destroyConfirmActive {
		switch m := msg.(type) {
		case tea.KeyMsg:
			switch m.String() {
			case "y", "Y":
				// Confirm destroy
				if err := os.RemoveAll(p.destroyTargetDir); err != nil {
					p.StatusBar = "Error removing .tdd-pro: " + err.Error()
				} else {
					p.StatusBar = "TDD-Pro project destroyed successfully"
				}
				p.destroyConfirmActive = false
				p.destroyTargetDir = ""
				return p, nil
			case "n", "N", "esc":
				// Cancel destroy
				p.StatusBar = "Destroy cancelled"
				p.destroyConfirmActive = false
				p.destroyTargetDir = ""
				return p, nil
			}
		}
		return p, nil
	}

	if p.FeaturesViewActive {
		switch m := msg.(type) {
		case tea.KeyMsg:
			// Handle feature metadata editing when in feature data view
			if p.focusState == 1 && p.SelectedFeature != nil && !p.editingPRD {
				// Handle Enter key to save feature changes
				if m.String() == "enter" {
					return p.saveFeatureChanges()
				}
				
				// Allow text input for feature name and description (but not for navigation keys)
				switch m.String() {
				case "esc", "left", "right", "up", "down", "e", "t", "d", "tab":
					// These keys should be handled by the main switch statement
				default:
					// Handle text input for feature fields
					var cmd tea.Cmd
					p.featureNameEdit, cmd = p.featureNameEdit.Update(msg)
					if cmd != nil {
						return p, cmd
					}
					p.featureDescriptionEdit, cmd = p.featureDescriptionEdit.Update(msg)
					if cmd != nil {
						return p, cmd
					}
					return p, nil
				}
			}
			
			switch m.String() {
			case "esc":
				p.FeaturesViewActive = false
				p.focusState = 0 // Reset focus
				return p, nil
			case "left":
				// Move focus left
				if p.focusState > 0 {
					p.focusState--
					if p.focusState == 1 {
						// Moving from tasks to data, sync the tab
						p.FeaturesTab = 0
						p.mainPanelScroll = 0
					}
				}
				return p, nil
			case "right":
				// Move focus right
				if p.focusState < 2 {
					p.focusState++
					if p.focusState == 2 {
						// Moving to tasks tab, sync the tab
						p.FeaturesTab = 1
						p.mainPanelScroll = 0
					} else if p.focusState == 1 {
						// Moving to data tab, sync the tab
						p.FeaturesTab = 0
						p.mainPanelScroll = 0
					}
				}
				return p, nil
			case "up":
				// Context-aware up navigation
				if p.focusState == 0 {
					// Workflow panel: move feature selection up
					p.moveFeatureSelection(-1)
				} else if p.focusState == 2 {
					// Tasks panel: move task selection up
					p.moveTaskSelection(-1)
				} else {
					// Feature Data panel: scroll up
					if p.mainPanelScroll > 0 {
						p.mainPanelScroll--
					}
				}
				return p, nil
			case "down":
				// Context-aware down navigation
				if p.focusState == 0 {
					// Workflow panel: move feature selection down
					p.moveFeatureSelection(1)
				} else if p.focusState == 2 {
					// Tasks panel: move task selection down
					p.moveTaskSelection(1)
				} else {
					// Feature Data panel: scroll down
					maxScroll := p.getMaxMainPanelScroll()
					if p.mainPanelScroll < maxScroll {
						p.mainPanelScroll++
					}
				}
				return p, nil
			case "e":
				// Edit task when in Tasks view, or edit PRD when in Feature Data view
				if p.focusState == 2 && p.SelectedFeature != nil {
					// Tasks view - edit selected task
					if p.FeaturesTab != 1 {
						p.StatusBar = fmt.Sprintf("Not in Tasks tab (tab=%d). Press 't' or right arrow to switch to Tasks.", p.FeaturesTab)
						return p, nil
					}
					
					// Get tasks to verify the selected index is valid
					if featureDetail, err := p.MCP.GetFeatureViaStdio(p.SelectedFeature.ID); err == nil {
						if p.selectedTaskIndex >= len(featureDetail.Tasks) {
							p.StatusBar = fmt.Sprintf("Task index %d out of bounds (have %d tasks)", p.selectedTaskIndex, len(featureDetail.Tasks))
							return p, nil
						}
						p.StatusBar = fmt.Sprintf("Starting edit for task %d: %s", p.selectedTaskIndex, featureDetail.Tasks[p.selectedTaskIndex].Title)
						return p.startTaskEdit()
					} else {
						p.StatusBar = fmt.Sprintf("Error getting tasks: %v", err)
						return p, nil
					}
				} else if p.focusState == 1 && p.SelectedFeature != nil {
					// Feature Data view - edit PRD document
					if p.FeaturesTab != 0 {
						p.StatusBar = "Not in Feature Data tab. Press 'd' to switch to Feature Data view."
						return p, nil
					}
					
					p.StatusBar = fmt.Sprintf("Opening PRD editor for feature: %s", p.SelectedFeature.Name)
					return p.startPRDEdit()
				} else {
					reasons := []string{}
					if p.focusState != 1 && p.focusState != 2 {
						reasons = append(reasons, fmt.Sprintf("focusState=%d (need 1 for PRD or 2 for tasks)", p.focusState))
					}
					if p.SelectedFeature == nil {
						reasons = append(reasons, "no feature selected")
					}
					p.StatusBar = fmt.Sprintf("Cannot edit: %s", strings.Join(reasons, ", "))
				}
				return p, nil
			case "t":
				// Quick switch to Tasks tab
				p.FeaturesTab = 1
				p.focusState = 2
				p.mainPanelScroll = 0
				p.StatusBar = "Switched to Tasks view"
				return p, nil
			case "d":
				// Quick switch to Data tab  
				p.FeaturesTab = 0
				p.focusState = 1
				p.mainPanelScroll = 0
				p.StatusBar = "Switched to Feature Data view"
				return p, nil
			case "tab":
				// Tab cycles through all focus states
				p.focusState = (p.focusState + 1) % 3
				if p.focusState == 1 {
					p.FeaturesTab = 0
					p.mainPanelScroll = 0
				} else if p.focusState == 2 {
					p.FeaturesTab = 1
					p.mainPanelScroll = 0
				}
				return p, nil
			}
		}
	}
	// Temporarily disable completion dialog handling to debug basic TUI issues
	var completionCmd tea.Cmd
	/*
		if p.completionDialog != nil && p.completionDialog.IsVisible() {
			_, completionCmd = p.completionDialog.Update(msg)

			// Only block specific keys when completion dialog handles them
			if keyMsg, ok := msg.(tea.KeyMsg); ok {
				switch keyMsg.String() {
				case "enter", "tab":
					// These keys are handled by completion dialog only
					return p, completionCmd
				case "up", "down":
					// Navigation keys are handled by completion dialog only
					return p, completionCmd
				case "esc":
					// Escape key is handled by completion dialog only
					return p, completionCmd
				}
			}
		}
	*/
	switch msg := msg.(type) {
	case tea.KeyMsg:
		// Handle completion navigation keys separately
		if p.completionDialog != nil && p.completionDialog.IsVisible() {
			switch msg.String() {
			case "up", "down":
				// Let completion dialog handle navigation
				_, completionCmd = p.completionDialog.Update(msg)
				return p, completionCmd
			case "enter", "tab":
				// Let completion dialog handle selection
				_, completionCmd = p.completionDialog.Update(msg)
				return p, completionCmd
			case "esc":
				// Let completion dialog handle escape
				_, completionCmd = p.completionDialog.Update(msg)
				return p, completionCmd
			}
		}

		switch msg.Type {
		case tea.KeyCtrlC:
			if !p.isEmpty() && !p.ctrlCPressed {
				p.textInput.SetValue("")
				p.ctrlCPressed = true
				p.StatusBar = ""
				return p, nil
			}
			return p, tea.Quit
		case tea.KeyEnter:
			userInput := strings.TrimSpace(p.textInput.Value())
			if userInput != "" {
				if userInput[0] == '/' {
					cmd, arg := parseCommand(userInput)
					if handler, ok := commandHandlers[cmd]; ok {
						p.textInput.SetValue("")
						return handler(p, arg)
					}
				}
				// ... fallback to other logic (e.g., sendToBackend) ...
				p.StatusBar = "Waiting for reply..."
				err := p.sendToBackend(userInput, p)
				if err != nil {
					p.StatusBar = "Error: " + err.Error()
					p.textInput.SetValue("")
				} else {
					p.StatusBar = "Reply received!"
				}
				return p, nil
			}
		}
		if msg.Type != tea.KeyCtrlC {
			p.ctrlCPressed = false
		}

		// Let textinput handle all other keys (including typing, backspace, etc.)
		var cmd tea.Cmd
		p.textInput, cmd = p.textInput.Update(msg)

		// Update completions based on current input
		currentInput := p.textInput.Value()
		if strings.HasPrefix(currentInput, "/") && len(currentInput) > 0 {
			// Initialize completion components if needed
			if p.completionManager == nil || p.completionDialog == nil {
				p.completionManager = NewCompletionManager()
				p.completionDialog = NewCompletionDialog()
			}

			// Show completion dialog and update
			provider := p.completionManager.GetProvider(currentInput)
			p.completionDialog.SetProvider(provider)
			p.completionDialog.Show()
			p.completionDialog.UpdateQuery(currentInput)
		} else {
			// Hide completion dialog if not a command
			if p.completionDialog != nil {
				p.completionDialog.Hide()
			}
		}

		return p, cmd
	}

	// Return completion command if there was one
	if completionCmd != nil {
		return p, completionCmd
	}
	return p, nil
}

// parseCommand splits a command and its argument, e.g. "/plan /foo" => ("/plan", "/foo")
func parseCommand(input string) (string, string) {
	if idx := len(input); idx > 0 {
		for i := 0; i < len(input); i++ {
			if input[i] == ' ' {
				return input[:i], input[i+1:]
			}
		}
	}
	return input, ""
}

func (p *Prompt) sendToBackend(message string, self *Prompt) error {
	if p.APIURL == "" || p.MCP == nil {
		return fmt.Errorf("API URL or MCP client not set")
	}
	if p.MCP.SessionID == "" {
		if err := p.MCP.OpenSSE(); err != nil {
			return fmt.Errorf("failed to open SSE: %w", err)
		}
	}
	if err := p.MCP.SendMessage("tddAgent", message); err != nil {
		return err
	}
	// Wait for the agent's reply from SSE
	reply, err := p.MCP.ListenForReply()
	if err != nil {
		self.textInput.SetValue("(No reply received)")
		return err
	}
	self.textInput.SetValue(reply)
	return nil
}

func trimSpaces(s string) string {
	out := ""
	lastWasSpace := false
	for _, c := range s {
		if c == ' ' {
			if !lastWasSpace {
				out += string(c)
			}
			lastWasSpace = true
		} else {
			out += string(c)
			lastWasSpace = false
		}
	}
	return out
}

func (p *Prompt) isEmpty() bool {
	return p.textInput.Value() == ""
}

func (p *Prompt) View() string {
	headerHeight := 2 // header + newline
	var availHeight int
	if p.FeaturesViewActive {
		// In features view, we need space for prompt + status bar at bottom
		bottomHeight := 4 // prompt line + status bar + spacing
		availHeight = p.WindowHeight - bottomHeight - headerHeight
		if availHeight < 8 {
			availHeight = 8
		}
	} else {
		promptHeight := 10 // prompt (3 lines + border) + status bar + spacing
		availHeight = p.WindowHeight - promptHeight - headerHeight
		if availHeight < 8 {
			availHeight = 8
		}
	}
	// Header
	headerStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("81")).Bold(true).Padding(0, 1)
	header := headerStyle.Render("TDD-Pro TUI v0.1.0")
	
	// If PRD editing is active, show the textarea overlay
	if p.editingPRD {
		editHeader := lipgloss.NewStyle().
			Foreground(lipgloss.Color("39")).
			Bold(true).
			Render("Editing PRD Document")
		
		textareaView := p.prdEditTextarea.View()
		statusBar := lipgloss.NewStyle().Foreground(lipgloss.Color("245")).Render(p.StatusBar)
		
		return lipgloss.JoinVertical(lipgloss.Left, header, "", editHeader, "", textareaView, "", statusBar)
	}
	
	if p.FeaturesViewActive {
		// Create sidebar content
		sidebar := p.generateSidebarContent()

		// Create main content
		main := ""

		if p.SelectedFeature != nil {
			featureTitle := lipgloss.NewStyle().
				Bold(true).
				Foreground(lipgloss.Color("255")).
				Render(p.SelectedFeature.Name)
			main += featureTitle + "\n"

			// Show current view indicator (less prominent than before since focus controls navigation)
			// Create tab-style UI using proper lipgloss pattern
			dataTabText := "Feature Spec (d)"
			tasksTabText := "Tasks (t)"
			
			// Define borders following lipgloss example
			activeTabBorder := lipgloss.Border{
				Top:         "─",
				Bottom:      " ",
				Left:        "│",
				Right:       "│",
				TopLeft:     "╭",
				TopRight:    "╮",
				BottomLeft:  "┘",
				BottomRight: "└",
			}

			tabBorder := lipgloss.Border{
				Top:         " ",
				Bottom:      "─",
				Left:        " ",
				Right:       " ",
				TopLeft:     " ",
				TopRight:    " ",
				BottomLeft:  "─",
				BottomRight: "─",
			}

			tab := lipgloss.NewStyle().
				Border(tabBorder, true).
				BorderForeground(lipgloss.Color("240")).
				Padding(0, 1)

			activeTab := tab.Border(activeTabBorder, true).
				BorderForeground(lipgloss.Color("240"))

			tabGap := tab.
				BorderTop(false).
				BorderLeft(false).
				BorderRight(false)
			
			// Calculate available width
			terminalWidth := p.WindowWidth
			if terminalWidth < 80 {
				terminalWidth = 80
			}
			sidebarWidth := 30
			if terminalWidth < 100 {
				sidebarWidth = terminalWidth / 3
			}
			tabBarWidth := terminalWidth - sidebarWidth - 108 // Account for panel borders and padding, reduced by 100
			
			// Render tabs following lipgloss pattern
			var row string
			if p.FeaturesTab == 0 {
				// Feature Spec is active
				row = lipgloss.JoinHorizontal(
					lipgloss.Top,
					activeTab.Render(dataTabText),
					tab.Render(tasksTabText),
				)
			} else {
				// Tasks is active
				row = lipgloss.JoinHorizontal(
					lipgloss.Top,
					tab.Render(dataTabText),
					activeTab.Render(tasksTabText),
				)
			}
			
			// Add gap to fill remaining width (this creates the bottom line)
			remainingWidth := tabBarWidth - lipgloss.Width(row)
			if remainingWidth > 0 {
				gap := tabGap.Render(strings.Repeat(" ", remainingWidth))
				row = lipgloss.JoinHorizontal(lipgloss.Bottom, row, gap)
			}
			
			main += row + "\n\n"

			if p.FeaturesTab == 0 {
				main += p.generateFeatureDataContent(p.SelectedFeature)
			} else {
				// Show tasks for the selected feature
				main += p.renderTasksForFeature(p.SelectedFeature)
			}
		}

		// Calculate responsive widths based on terminal size
		terminalWidth := p.WindowWidth
		if terminalWidth < 80 {
			terminalWidth = 80 // Minimum width
		}
		
		// Sidebar should be max 30 chars, but scale down for narrow terminals
		sidebarWidth := 30
		if terminalWidth < 100 {
			sidebarWidth = terminalWidth / 3
		}
		if sidebarWidth < 20 {
			sidebarWidth = 20
		}
		
		// Main panel gets the rest minus some padding
		mainWidth := terminalWidth - sidebarWidth - 4 // 4 for spacing/borders
		
		// Calculate scrollable heights to span full available space
		// The panels should take up the full availHeight (from top to prompt line)
		sidebarContentHeight := availHeight - 2 // -2 for top/bottom borders only  
		mainContentHeight := availHeight - 2
		
		// Apply scrolling to content
		scrollableSidebar := renderScrollableContent(sidebar, sidebarContentHeight, p.sidebarScroll)
		scrollableMain := renderScrollableContent(main, mainContentHeight, p.mainPanelScroll)
		
		// Determine border colors based on focus state
		sidebarBorderColor := "240" // Default border color
		mainBorderColor := "240"
		
		if p.focusState == 0 {
			sidebarBorderColor = "39" // Blue for focused workflow panel
		} else if p.focusState == 1 || p.focusState == 2 {
			mainBorderColor = "39" // Blue for focused feature panel
		}
		
		// Use custom border title function for Bagels-style panels with focus colors
		sidebarPanel := renderPanelWithTitleColorAndHeight(scrollableSidebar, "Workflow", sidebarWidth, 1, sidebarBorderColor, availHeight)
		mainPanel := renderPanelWithTitleColorAndHeight(scrollableMain, "Feature", mainWidth, 2, mainBorderColor, availHeight)

		// Join panels horizontally to take full available height
		row := lipgloss.JoinHorizontal(lipgloss.Top, sidebarPanel, mainPanel)

		// Bagels-style bottom status bar with shortcuts (responsive width)
		statusBarStyle := lipgloss.NewStyle().
			Foreground(lipgloss.Color("245")).
			Background(lipgloss.Color("236")).
			Padding(0, 1).
			Width(terminalWidth)

		// Context-aware help text based on focus state
		var shortcuts string
		if p.focusState == 0 {
			shortcuts = lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Render("esc") + " Back  " +
				lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Render("↑↓") + " Select Feature  " +
				lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Render("→") + " Enter Feature  " +
				lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Render("tab") + " Focus"
		} else if p.focusState == 2 {
			shortcuts = lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Render("esc") + " Back  " +
				lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Render("↑↓") + " Select Task  " +
				lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Render("e") + " Edit Task  " +
				lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Render("←→") + " Switch Panel"
		} else {
			shortcuts = lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Render("esc") + " Back  " +
				lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Render("e") + " Edit PRD  " +
				lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Render("↑↓") + " Scroll  " +
				lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Render("←→") + " Switch Panel  " +
				lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Render("tab") + " Focus"
		}

		// Status/thinking area - simple messages without heavy styling
		statusArea := ""
		if p.StatusBar != "" {
			statusArea = p.StatusBar
		} else if len(p.ThinkingState) > 0 {
			statusArea = p.ThinkingState[len(p.ThinkingState)-1] // Show latest thinking message
		} else {
			statusArea = "Ready"
		}
		
		statusView := statusBarStyle.Render(shortcuts)
		return header + "\n" + row + "\n" + statusArea + "\n" + statusView
	}
	statusBarStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("245")).
		Background(lipgloss.Color("236")).
		Padding(0, 1).
		Width(60)

	completionView := ""
	if p.completionDialog != nil && p.completionDialog.IsVisible() {
		completionView = p.completionDialog.View() + "\n"
	}

	thinkingView := ""
	if len(p.ThinkingState) > 0 {
		for _, msg := range p.ThinkingState {
			thinkingView += "[thinking] " + msg + "\n"
		}
	}


	// Show destroy confirmation dialog if active
	if p.destroyConfirmActive {
		dialogStyle := lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("196")). // Red border for warning
			Padding(1, 2).
			Width(60).
			Align(lipgloss.Center)

		dialogContent := lipgloss.NewStyle().
			Foreground(lipgloss.Color("255")).
			Bold(true).
			Render("⚠️  DESTROY TDD-PRO PROJECT") + "\n\n" +
			lipgloss.NewStyle().Foreground(lipgloss.Color("245")).Render("This will permanently delete:") + "\n" +
			lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Render(p.destroyTargetDir) + "\n\n" +
			lipgloss.NewStyle().Foreground(lipgloss.Color("245")).Render("Are you sure? ") +
			lipgloss.NewStyle().Foreground(lipgloss.Color("46")).Bold(true).Render("[Y]es") + " / " +
			lipgloss.NewStyle().Foreground(lipgloss.Color("196")).Bold(true).Render("[N]o")

		dialog := dialogStyle.Render(dialogContent)

		// Center the dialog vertically
		dialogHeight := strings.Count(dialog, "\n") + 1
		verticalPadding := (availHeight - dialogHeight) / 2
		if verticalPadding < 0 {
			verticalPadding = 0
		}

		return header + "\n" + strings.Repeat("\n", verticalPadding) + dialog
	}

	// Show init command dialog if active
	if p.initCommand != nil && p.initCommand.IsActive() {
		return header + "\n" + p.initCommand.View()
	}

	// Show auth command dialog if active
	if p.authCommand != nil && p.authCommand.IsActive() {
		return header + "\n" + p.authCommand.View()
	}
	
	// Don't show task edit form as overlay - it will be rendered inline in the task list

	// Style the textinput with Bagels theme - no background for clean look
	styledInput := lipgloss.NewStyle().
		Foreground(lipgloss.Color("255")).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("240")).
		Padding(0, 1).
		Width(60).
		Render("> " + p.textInput.View())

	return header + "\n" + completionView + thinkingView + styledInput + "\n" + statusBarStyle.Render(p.StatusBar)
}

func gray(s string) string {
	return lipgloss.NewStyle().Foreground(lipgloss.Color("245")).Render(s)
}

func init() {
	if len(os.Getenv("DEBUG")) > 0 {
		f, err := tea.LogToFile("debug.log", "debug")
		if err != nil {
			fmt.Println("fatal:", err)
			os.Exit(1)
		}
		defer f.Close()
	}
}

// renderPanelWithTitle creates a bordered panel with title embedded in the top border
func renderPanelWithTitle(content string, title string, width int, padding int) string {
	return renderPanelWithTitleAndColor(content, title, width, padding, "240")
}

// renderPanelWithTitleAndColor creates a bordered panel with title and custom border color
func renderPanelWithTitleAndColor(content string, title string, width int, padding int, borderColor string) string {
	return renderPanelWithTitleColorAndHeight(content, title, width, padding, borderColor, 0)
}

// renderPanelWithTitleColorAndHeight creates a bordered panel with exact height
func renderPanelWithTitleColorAndHeight(content string, title string, width int, padding int, borderColor string, exactHeight int) string {
	// Style the content with padding but no border first
	contentStyle := lipgloss.NewStyle().
		Width(width-2). // Account for border
		Padding(0, padding)
	styledContent := contentStyle.Render(content)

	// Get the lines of content
	lines := strings.Split(styledContent, "\n")
	if len(lines) == 0 {
		lines = []string{""}
	}
	
	// If exactHeight is specified, adjust lines to fit exactly
	if exactHeight > 0 {
		targetContentLines := exactHeight - 2 // -2 for top and bottom borders
		if targetContentLines < 1 {
			targetContentLines = 1
		}
		
		// Pad or truncate lines to match target
		for len(lines) < targetContentLines {
			lines = append(lines, "")
		}
		if len(lines) > targetContentLines {
			lines = lines[:targetContentLines]
		}
	}

	// Calculate actual content width (lipgloss may adjust it)
	contentWidth := 0
	for _, line := range lines {
		if w := lipgloss.Width(line); w > contentWidth {
			contentWidth = w
		}
	}

	// Create title with proper spacing
	titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color(borderColor))
	styledTitle := titleStyle.Render(" " + title + " ")
	titleWidth := lipgloss.Width(styledTitle)

	// Create top border with embedded title
	borderChar := "─"
	borderColorStyle := lipgloss.Color(borderColor)
	cornerLeft := lipgloss.NewStyle().Foreground(borderColorStyle).Render("╭")
	cornerRight := lipgloss.NewStyle().Foreground(borderColorStyle).Render("╮")

	// Calculate border segments
	totalBorderWidth := contentWidth + 2                // +2 for left/right borders
	remainingWidth := totalBorderWidth - titleWidth - 2 // -2 for corners

	var topBorder string
	if remainingWidth > 0 {
		leftBorderLen := 2 // Small gap from corner
		rightBorderLen := remainingWidth - leftBorderLen
		if rightBorderLen < 0 {
			rightBorderLen = 0
			leftBorderLen = remainingWidth
		}

		leftBorder := lipgloss.NewStyle().Foreground(borderColorStyle).Render(strings.Repeat(borderChar, leftBorderLen))
		rightBorder := lipgloss.NewStyle().Foreground(borderColorStyle).Render(strings.Repeat(borderChar, rightBorderLen))
		topBorder = cornerLeft + leftBorder + styledTitle + rightBorder + cornerRight
	} else {
		// Title too long, just use corners
		topBorder = cornerLeft + styledTitle + cornerRight
	}

	// Create side borders
	leftBorder := lipgloss.NewStyle().Foreground(borderColorStyle).Render("│")
	rightBorder := lipgloss.NewStyle().Foreground(borderColorStyle).Render("│")

	// Create bottom border
	bottomBorderLine := lipgloss.NewStyle().Foreground(borderColorStyle).Render(strings.Repeat(borderChar, totalBorderWidth-2))
	bottomCornerLeft := lipgloss.NewStyle().Foreground(borderColorStyle).Render("╰")
	bottomCornerRight := lipgloss.NewStyle().Foreground(borderColorStyle).Render("╯")
	bottomBorder := bottomCornerLeft + bottomBorderLine + bottomCornerRight

	// Assemble the final result
	var result strings.Builder
	result.WriteString(topBorder + "\n")

	for _, line := range lines {
		// Ensure each line fits the content width
		paddedLine := line
		if w := lipgloss.Width(line); w < contentWidth {
			paddedLine = line + strings.Repeat(" ", contentWidth-w)
		}
		result.WriteString(leftBorder + paddedLine + rightBorder + "\n")
	}

	result.WriteString(bottomBorder)
	return result.String()
}

func (p *Prompt) moveFeatureSelection(delta int) {
	// Flatten all features into a list for navigation
	all := append(append(append(p.FeaturesData.Approved, p.FeaturesData.Planned...), p.FeaturesData.Refinement...), p.FeaturesData.Backlog...)
	if len(all) == 0 || p.SelectedFeature == nil {
		return
	}
	idx := 0
	for i, f := range all {
		if f.ID == p.SelectedFeature.ID {
			idx = i
			break
		}
	}
	idx = (idx + delta + len(all)) % len(all)
	p.SelectedFeature = &all[idx]
}

// moveTaskSelection moves the selected task up or down
func (p *Prompt) moveTaskSelection(delta int) {
	if p.SelectedFeature == nil || p.MCP == nil {
		return
	}
	
	// Get current tasks for the feature
	featureDetail, err := p.MCP.GetFeatureViaStdio(p.SelectedFeature.ID)
	if err != nil || len(featureDetail.Tasks) == 0 {
		return
	}
	
	// Update selected task index with bounds checking
	oldIndex := p.selectedTaskIndex
	p.selectedTaskIndex = (p.selectedTaskIndex + delta + len(featureDetail.Tasks)) % len(featureDetail.Tasks)
	
	// Auto-scroll to keep selected task visible
	if oldIndex != p.selectedTaskIndex {
		p.ensureTaskVisible()
	}
}

// ensureTaskVisible adjusts scroll to keep the selected task in view
func (p *Prompt) ensureTaskVisible() {
	if p.SelectedFeature == nil || p.MCP == nil {
		return
	}
	
	// Calculate available height for task content
	mainContentHeight := p.WindowHeight - 8 // Account for header, borders, prompt, status
	if mainContentHeight < 1 {
		mainContentHeight = 1
	}
	
	// Get tasks to calculate task positions
	featureDetail, err := p.MCP.GetFeatureViaStdio(p.SelectedFeature.ID)
	if err != nil || len(featureDetail.Tasks) == 0 {
		return
	}
	
	// Estimate lines per task (header + description + criteria + borders + margins)
	// This is approximate - each task takes roughly 6-8 lines depending on content
	linesPerTask := 8
	
	// Calculate position of selected task in lines
	selectedTaskLine := p.selectedTaskIndex * linesPerTask
	
	// Adjust scroll if selected task is outside visible area
	visibleStart := p.mainPanelScroll
	visibleEnd := p.mainPanelScroll + mainContentHeight
	
	if selectedTaskLine < visibleStart {
		// Task is above visible area - scroll up
		p.mainPanelScroll = selectedTaskLine
	} else if selectedTaskLine + linesPerTask > visibleEnd {
		// Task is below visible area - scroll down
		p.mainPanelScroll = selectedTaskLine - mainContentHeight + linesPerTask
	}
	
	// Ensure scroll doesn't go negative
	if p.mainPanelScroll < 0 {
		p.mainPanelScroll = 0
	}
	
	// Ensure scroll doesn't exceed maximum
	maxScroll := p.getMaxMainPanelScroll()
	if p.mainPanelScroll > maxScroll {
		p.mainPanelScroll = maxScroll
	}
}

// renderTasksForFeature fetches and renders tasks for the given feature
func (p *Prompt) renderTasksForFeature(feature *mcpclient.Feature) string {
	if feature == nil {
		return lipgloss.NewStyle().Foreground(lipgloss.Color("245")).Render("No feature selected") + "\n"
	}
	
	// Try to get feature details with tasks from MCP
	if p.MCP != nil {
		featureDetail, err := p.MCP.GetFeatureViaStdio(feature.ID)
		if err != nil {
			return lipgloss.NewStyle().Foreground(lipgloss.Color("196")).Render("Error loading tasks: " + err.Error()) + "\n"
		}
		
		if len(featureDetail.Tasks) == 0 {
			return lipgloss.NewStyle().Foreground(lipgloss.Color("245")).Render("No tasks defined for this feature") + "\n"
		}
		
		var result strings.Builder
		for i, task := range featureDetail.Tasks {
			isSelected := (i == p.selectedTaskIndex)
			
			// If this is the task being edited, show the form instead of the task box
			if p.editingTask && isSelected && p.taskEditForm != nil {
				editBox := p.renderTaskEditForm(task, i+1)
				result.WriteString(editBox)
			} else {
				taskBox := p.renderTaskBox(task, i+1, isSelected)
				result.WriteString(taskBox)
			}
			// No padding between tasks - they connect visually
		}
		
		return result.String()
	}
	
	return lipgloss.NewStyle().Foreground(lipgloss.Color("245")).Render("MCP client not available") + "\n"
}

// TaskEditForm represents the form for editing a task
type TaskEditForm struct {
	form         *huh.Form
	visible      bool
	title        string
	description  string
	criteria     []string
	criteriaText string // For huh form binding
}

// startTaskEdit initiates task editing mode
func (p *Prompt) startTaskEdit() (*Prompt, tea.Cmd) {
	if p.SelectedFeature == nil {
		p.StatusBar = "No selected feature"
		return p, nil
	}
	if p.MCP == nil {
		p.StatusBar = "MCP client not available"
		return p, nil
	}
	
	// Get the selected task
	featureDetail, err := p.MCP.GetFeatureViaStdio(p.SelectedFeature.ID)
	if err != nil {
		p.StatusBar = fmt.Sprintf("Error getting feature: %v", err)
		return p, nil
	}
	if len(featureDetail.Tasks) == 0 {
		p.StatusBar = "No tasks found for this feature"
		return p, nil
	}
	if p.selectedTaskIndex >= len(featureDetail.Tasks) {
		p.StatusBar = fmt.Sprintf("Task index %d out of bounds (have %d tasks)", p.selectedTaskIndex, len(featureDetail.Tasks))
		return p, nil
	}
	
	selectedTask := featureDetail.Tasks[p.selectedTaskIndex]
	p.StatusBar = fmt.Sprintf("DEBUG: Creating form for task: %s", selectedTask.Title)
	
	// Create the edit form
	p.taskEditForm = &TaskEditForm{
		visible:     true,
		title:       selectedTask.Title,
		description: selectedTask.Description,
		criteria:    selectedTask.EvaluationCriteria,
	}
	
	p.taskEditForm.buildForm()
	p.editingTask = true
	
	p.StatusBar = fmt.Sprintf("DEBUG: Form created, editingTask=%v, visible=%v", p.editingTask, p.taskEditForm.visible)
	
	return p, p.taskEditForm.Init()
}

// buildForm creates the huh form for task editing
func (f *TaskEditForm) buildForm() {
	// Convert criteria slice to newline-separated string for easier editing
	criteriaText := strings.Join(f.criteria, "\n")
	
	// Store the criteria text as a field we can reference
	f.criteriaText = criteriaText
	
	f.form = huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Key("title").
				Title("Task Title").
				Value(&f.title).
				Placeholder("Enter task title..."),
			
			huh.NewText().
				Key("description").
				Title("Description").
				Value(&f.description).
				Placeholder("Enter task description...").
				Lines(3),
			
			huh.NewText().
				Key("criteria").
				Title("Acceptance Criteria (one per line)").
				Value(&f.criteriaText).
				Placeholder("Enter acceptance criteria, one per line...").
				Lines(5),
		),
	).
		WithTheme(huh.ThemeDracula()).
		WithShowHelp(true).
		WithShowErrors(true)
	
	// Debug: ensure form was created
	if f.form == nil {
		fmt.Printf("DEBUG: Failed to create huh form\n")
	} else {
		fmt.Printf("DEBUG: huh form created successfully, title='%s'\n", f.title)
	}
}

// Init initializes the task edit form
func (f *TaskEditForm) Init() tea.Cmd {
	if f.form != nil {
		return f.form.Init()
	}
	return nil
}

// Update handles task edit form updates
func (f *TaskEditForm) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if !f.visible || f.form == nil {
		return f, nil
	}
	
	// Handle escape to cancel
	if keyMsg, ok := msg.(tea.KeyMsg); ok && keyMsg.String() == "esc" {
		f.visible = false
		return f, func() tea.Msg {
			return TaskEditCancelMsg{}
		}
	}
	
	// Update form
	form, cmd := f.form.Update(msg)
	if updatedForm, ok := form.(*huh.Form); ok {
		f.form = updatedForm
	}
	
	// Check if form is completed
	if f.form.State == huh.StateCompleted {
		f.visible = false
		
		// Parse criteria back to slice
		criteria := []string{}
		for _, line := range strings.Split(f.criteriaText, "\n") {
			line = strings.TrimSpace(line)
			if line != "" {
				criteria = append(criteria, line)
			}
		}
		
		return f, func() tea.Msg {
			return TaskEditCompleteMsg{
				Title:       f.form.GetString("title"),
				Description: f.form.GetString("description"),
				Criteria:    criteria,
			}
		}
	}
	
	return f, cmd
}

// View renders the task edit form
func (f *TaskEditForm) View() string {
	if !f.visible {
		return "DEBUG: Form not visible"
	}
	if f.form == nil {
		return "DEBUG: Form is nil"
	}
	
	// Add header
	headerStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("39")).
		Bold(true).
		Padding(0, 1)
	
	header := headerStyle.Render("📝 Edit Task")
	
	// Get form view with debugging
	formView := f.form.View()
	if formView == "" {
		return "DEBUG: huh form.View() returned empty string\nForm state: " + fmt.Sprintf("%+v", f.form.State) + "\nPress ESC to cancel"
	}
	
	// Style the form
	dialogStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("39")).
		Padding(1, 2).
		Width(80)
	
	content := header + "\n\n" + formView
	return dialogStyle.Render(content)
}

// IsVisible returns whether the form is visible
func (f *TaskEditForm) IsVisible() bool {
	return f.visible
}

// Task edit result messages
type TaskEditCompleteMsg struct {
	Title       string
	Description string
	Criteria    []string
}

type TaskEditCancelMsg struct{}

// renderTaskBox creates a styled box for a single task
func (p *Prompt) renderTaskBox(task mcpclient.Task, taskNumber int, isSelected bool) string {
	// Use blue colors for selected task, gray for unselected
	borderColor := "240" // Default gray
	headerBgColor := "240" // Default gray
	
	if isSelected {
		borderColor = "39" // Blue border for selected task
		headerBgColor = "39" // Blue header background for selected task
	}
	
	// Calculate available width for the task boxes
	terminalWidth := p.WindowWidth
	if terminalWidth < 80 {
		terminalWidth = 80
	}
	sidebarWidth := 30
	if terminalWidth < 100 {
		sidebarWidth = terminalWidth / 3
	}
	// Content width inside the main panel, accounting for panel borders and spacing
	contentWidth := terminalWidth - sidebarWidth - 20
	if contentWidth < 40 {
		contentWidth = 40
	}
	
	var result strings.Builder
	
	// Task header with gray background - FULL WIDTH minus internal spacing
	headerText := fmt.Sprintf("Task %d: %s", taskNumber, task.Title)
	headerStyle := lipgloss.NewStyle().
		Background(lipgloss.Color(headerBgColor)).
		Foreground(lipgloss.Color("255")).
		Bold(true).
		Padding(0, 1).
		Width(contentWidth - 0) // -4 for box borders (2) + internal padding (2)
	
	result.WriteString(headerStyle.Render(headerText) + "\n")
	
	// Task description - simple styling
	descStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("248")).
		Padding(1, 1, 0, 1) // top, right, bottom, left
	
	result.WriteString(descStyle.Render(task.Description) + "\n")
	
	// Acceptance criteria
	if len(task.EvaluationCriteria) > 0 {
		criteriaHeaderStyle := lipgloss.NewStyle().
			Foreground(lipgloss.Color("214")).
			Bold(true).
			Padding(0, 1)
		
		result.WriteString(criteriaHeaderStyle.Render("Acceptance Criteria:") + "\n")
		
		for i, criteria := range task.EvaluationCriteria {
			testStyle := lipgloss.NewStyle().
				Foreground(lipgloss.Color("245")).
				PaddingLeft(3)
			
			testLine := fmt.Sprintf("⧖ Test %d: %s", i+1, criteria)
			result.WriteString(testStyle.Render(testLine) + "\n")
		}
	}
	
	// Wrap everything in a simple border with consistent width
	boxStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(borderColor)).
		Width(contentWidth).
		Margin(0, 0, 1, 0) // Just bottom margin between tasks
	
	return boxStyle.Render(result.String())
}

// renderTaskEditForm creates an inline edit form that replaces the task box
func (p *Prompt) renderTaskEditForm(task mcpclient.Task, taskNumber int) string {
	// Calculate available width for the edit form (same as task boxes)
	terminalWidth := p.WindowWidth
	if terminalWidth < 80 {
		terminalWidth = 80
	}
	sidebarWidth := 30
	if terminalWidth < 100 {
		sidebarWidth = terminalWidth / 3
	}
	contentWidth := terminalWidth - sidebarWidth - 20
	if contentWidth < 40 {
		contentWidth = 40
	}
	
	var result strings.Builder
	
	// Header showing we're editing this task
	headerText := fmt.Sprintf("✏️ Editing Task %d", taskNumber)
	headerStyle := lipgloss.NewStyle().
		Background(lipgloss.Color("39")).
		Foreground(lipgloss.Color("255")).
		Bold(true).
		Padding(0, 1).
		Width(contentWidth)
	
	result.WriteString(headerStyle.Render(headerText) + "\n")
	
	// Simple inline form using basic text styling instead of huh
	
	labelStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("39")).
		Bold(true).
		Padding(0, 1)
	
	valueStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("248")).
		Background(lipgloss.Color("236")).
		Padding(0, 1).
		Width(contentWidth - 4)
	
	// Title field
	result.WriteString(labelStyle.Render("Title:") + "\n")
	if p.taskEditForm != nil {
		result.WriteString(valueStyle.Render(p.taskEditForm.title) + "\n\n")
	}
	
	// Description field  
	result.WriteString(labelStyle.Render("Description:") + "\n")
	if p.taskEditForm != nil {
		result.WriteString(valueStyle.Render(p.taskEditForm.description) + "\n\n")
	}
	
	// Criteria field
	result.WriteString(labelStyle.Render("Acceptance Criteria:") + "\n")
	if p.taskEditForm != nil && len(p.taskEditForm.criteria) > 0 {
		for i, criteria := range p.taskEditForm.criteria {
			criteriaLine := fmt.Sprintf("%d. %s", i+1, criteria)
			result.WriteString(valueStyle.Render(criteriaLine) + "\n")
		}
	}
	
	// Instructions
	instructStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("245")).
		Italic(true).
		Padding(1, 1, 0, 1)
	
	result.WriteString(instructStyle.Render("Press ENTER to edit in external editor, ESC to cancel") + "\n")
	
	// Wrap in a box with blue border to show it's being edited
	boxStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("39")).
		Width(contentWidth).
		Margin(0, 0, 1, 0)
	
	return boxStyle.Render(result.String())
}

// renderScrollableContent takes content and renders a scrollable view
func renderScrollableContent(content string, maxHeight int, scrollOffset int) string {
	if content == "" {
		return ""
	}
	
	lines := strings.Split(content, "\n")
	
	// Calculate visible range
	start := scrollOffset
	end := scrollOffset + maxHeight
	
	// Bounds checking
	if start < 0 {
		start = 0
	}
	if start >= len(lines) {
		start = len(lines) - 1
		if start < 0 {
			start = 0
		}
	}
	if end > len(lines) {
		end = len(lines)
	}
	if end <= start {
		end = start + 1
		if end > len(lines) {
			end = len(lines)
		}
	}
	
	// Get visible lines
	visibleLines := lines[start:end]
	
	// Pad to fill maxHeight if needed
	for len(visibleLines) < maxHeight && len(visibleLines) < len(lines) {
		visibleLines = append(visibleLines, "")
	}
	
	return strings.Join(visibleLines, "\n")
}

// getContentHeight returns the number of lines in content
func getContentHeight(content string) int {
	if content == "" {
		return 0
	}
	return len(strings.Split(content, "\n"))
}

// getMaxSidebarScroll calculates the maximum scroll offset for the sidebar
func (p *Prompt) getMaxSidebarScroll() int {
	if !p.FeaturesViewActive {
		return 0
	}
	
	sidebarContentHeight := p.WindowHeight - 8 // Account for header, borders, prompt, status
	if sidebarContentHeight < 1 {
		sidebarContentHeight = 1
	}
	
	// Generate sidebar content to measure its height
	sidebar := p.generateSidebarContent()
	contentHeight := getContentHeight(sidebar)
	
	maxScroll := contentHeight - sidebarContentHeight
	if maxScroll < 0 {
		maxScroll = 0
	}
	return maxScroll
}

// getMaxMainPanelScroll calculates the maximum scroll offset for the main panel
func (p *Prompt) getMaxMainPanelScroll() int {
	if !p.FeaturesViewActive || p.SelectedFeature == nil {
		return 0
	}
	
	mainContentHeight := p.WindowHeight - 8 // Account for header, borders, prompt, status
	if mainContentHeight < 1 {
		mainContentHeight = 1
	}
	
	// Generate main content based on current tab
	var content string
	if p.FeaturesTab == 0 {
		content = p.generateFeatureDataContent(p.SelectedFeature)
	} else {
		content = p.renderTasksForFeature(p.SelectedFeature)
	}
	
	contentHeight := getContentHeight(content)
	maxScroll := contentHeight - mainContentHeight
	if maxScroll < 0 {
		maxScroll = 0
	}
	return maxScroll
}

// generateSidebarContent creates the sidebar content for measuring
func (p *Prompt) generateSidebarContent() string {
	sidebar := ""
	
	appendGroup := func(label string, features []mcpclient.Feature, color string) {
		groupStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("245")).Bold(true)
		sidebar += groupStyle.Render(label) + ":\n"
		for _, f := range features {
			selected := p.SelectedFeature != nil && f.ID == p.SelectedFeature.ID
			dot := lipgloss.NewStyle().Foreground(lipgloss.Color(color)).Render("●")
			if selected {
				nameStyle := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("255"))
				sidebar += dot + " " + nameStyle.Render(f.Name) + "\n"
			} else {
				nameStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("248"))
				sidebar += dot + " " + nameStyle.Render(f.Name) + "\n"
			}
		}
		sidebar += "\n"
	}
	
	// Build current features list by filtering from all features
	currentFeatures := []mcpclient.Feature{}
	if len(p.FeaturesData.CurrentFeatures) > 0 {
		// Create a map for quick lookup
		currentMap := make(map[string]bool)
		for _, id := range p.FeaturesData.CurrentFeatures {
			currentMap[id] = true
		}
		
		// Collect current features from all status groups
		allFeatures := append(append(append(p.FeaturesData.Approved, p.FeaturesData.Planned...), p.FeaturesData.Refinement...), p.FeaturesData.Backlog...)
		for _, feature := range allFeatures {
			if currentMap[feature.ID] {
				currentFeatures = append(currentFeatures, feature)
			}
		}
	}
	
	appendGroup("Current", currentFeatures, "46")             // Green
	appendGroup("Accepted", p.FeaturesData.Approved, "39")    // Blue
	appendGroup("Refining", p.FeaturesData.Refinement, "214") // Orange
	appendGroup("Backlog", p.FeaturesData.Backlog, "245")     // Gray
	
	return sidebar
}

// generateFeatureDataContent creates the feature data content for measuring
func (p *Prompt) generateFeatureDataContent(feature *mcpclient.Feature) string {
	if feature == nil {
		return ""
	}
	
	// Sync text input values with the selected feature (if not already synced)
	p.syncFeatureInputs(feature)
	
	labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("245")).Bold(true)
	valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("255"))
	
	var content string
	
	// ID (not editable)
	content += labelStyle.Render("ID: ") + valueStyle.Render(feature.ID) + "\n"
	
	// Editable Name field
	content += labelStyle.Render("Name: ") + "\n"
	if p.focusState == 1 {
		// Show editable field when in feature data view
		content += "  " + p.featureNameEdit.View() + "\n"
	} else {
		// Show as static text when not focused
		content += "  " + valueStyle.Render(p.featureNameEdit.Value()) + "\n"
	}
	
	// Editable Description field
	content += labelStyle.Render("Description: ") + "\n"
	if p.focusState == 1 {
		// Show editable field when in feature data view
		content += "  " + p.featureDescriptionEdit.View() + "\n"
	} else {
		// Show as static text when not focused
		content += "  " + valueStyle.Render(p.featureDescriptionEdit.Value()) + "\n"
	}
	
	// Status (not editable for now)
	content += labelStyle.Render("Status: ") + valueStyle.Render(feature.Status) + "\n\n"
	
	// Add PRD document section
	content += labelStyle.Render("Product Requirements Document:") + "\n"
	content += p.renderPRDDocument(feature) + "\n"
	
	return content
}

// syncFeatureInputs synchronizes the text input values with the selected feature
func (p *Prompt) syncFeatureInputs(feature *mcpclient.Feature) {
	if feature == nil {
		return
	}
	
	// Sync name if the input is empty or if this is a different feature
	if p.featureNameEdit.Value() == "" || p.featureNameEdit.Value() != feature.Name {
		p.featureNameEdit.SetValue(feature.Name)
	}
	
	// Sync description if the input is empty or if this is a different feature
	if p.featureDescriptionEdit.Value() == "" || p.featureDescriptionEdit.Value() != feature.Description {
		p.featureDescriptionEdit.SetValue(feature.Description)
	}
}

// saveFeatureChanges saves the edited feature name and description via MCP
func (p *Prompt) saveFeatureChanges() (*Prompt, tea.Cmd) {
	if p.SelectedFeature == nil || p.MCP == nil {
		p.StatusBar = "Cannot save: no feature selected or MCP unavailable"
		return p, nil
	}
	
	newName := strings.TrimSpace(p.featureNameEdit.Value())
	newDescription := strings.TrimSpace(p.featureDescriptionEdit.Value())
	
	// Validate inputs
	if newName == "" {
		p.StatusBar = "Feature name cannot be empty"
		return p, nil
	}
	if len(newDescription) < 10 {
		p.StatusBar = "Feature description must be at least 10 characters"
		return p, nil
	}
	
	// Check if anything actually changed
	if newName == p.SelectedFeature.Name && newDescription == p.SelectedFeature.Description {
		p.StatusBar = "No changes to save"
		return p, nil
	}
	
	// Update the feature via MCP
	go func() {
		updates := map[string]interface{}{}
		if newName != p.SelectedFeature.Name {
			updates["name"] = newName
		}
		if newDescription != p.SelectedFeature.Description {
			updates["description"] = newDescription
		}
		
		// Note: This would need the updateFeature MCP tool, but we're using the existing structure
		// For now, just update the local feature object
		p.SelectedFeature.Name = newName
		p.SelectedFeature.Description = newDescription
		p.StatusBar = fmt.Sprintf("Feature updated: %s", newName)
	}()
	
	return p, nil
}

// renderPRDDocument fetches and displays the PRD document with a simple border
func (p *Prompt) renderPRDDocument(feature *mcpclient.Feature) string {
	if feature == nil || p.MCP == nil {
		return lipgloss.NewStyle().Foreground(lipgloss.Color("245")).Render("No feature selected") + "\n"
	}
	
	// Try to get the PRD document
	prdContent, err := p.MCP.GetFeatureDocumentViaStdio(feature.ID)
	if err != nil {
		return lipgloss.NewStyle().Foreground(lipgloss.Color("196")).Render("Error loading PRD: " + err.Error()) + "\n"
	}
	
	if prdContent == "" {
		return lipgloss.NewStyle().Foreground(lipgloss.Color("245")).Render("No PRD document available") + "\n"
	}
	
	// Calculate content width
	width := p.WindowWidth
	if width < 80 {
		width = 80
	}
	sidebarWidth := 30
	if width < 100 {
		sidebarWidth = width / 3
	}
	contentWidth := width - sidebarWidth - 16
	if contentWidth < 40 {
		contentWidth = 40
	}
	
	// Create border style
	borderStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("240")).
		Padding(1).
		Width(contentWidth)
	
	// Add scroll indicator and edit hint
	scrollHint := ""
	if p.focusState == 1 { // Feature spec view focused
		scrollHint = lipgloss.NewStyle().
			Foreground(lipgloss.Color("245")).
			Render("(Press 'e' to edit PRD, ↑↓ to scroll)")
	}
	
	return borderStyle.Render(prdContent) + "\n" + scrollHint + "\n"
}


// startPRDEdit starts editing the PRD document (external editor or inline)
func (p *Prompt) startPRDEdit() (*Prompt, tea.Cmd) {
	if p.SelectedFeature == nil {
		p.StatusBar = "No feature selected"
		return p, nil
	}
	if p.MCP == nil {
		p.StatusBar = "MCP client not available"
		return p, nil
	}
	
	// Get the current PRD content
	prdContent, err := p.MCP.GetFeatureDocumentViaStdio(p.SelectedFeature.ID)
	if err != nil {
		p.StatusBar = fmt.Sprintf("Error getting PRD: %v", err)
		return p, nil
	}
	
	// Check if $EDITOR is set
	editor := os.Getenv("EDITOR")
	if editor != "" {
		// Use external editor
		return p.startExternalPRDEdit(prdContent)
	} else {
		// Use inline editing
		return p.startInlinePRDEdit(prdContent)
	}
}

// startExternalPRDEdit opens the PRD in an external editor
func (p *Prompt) startExternalPRDEdit(prdContent string) (*Prompt, tea.Cmd) {
	// Create a temporary file for editing
	tmpFile, err := os.CreateTemp("", fmt.Sprintf("tdd-pro-%s-prd-*.md", p.SelectedFeature.ID))
	if err != nil {
		p.StatusBar = fmt.Sprintf("Error creating temp file: %v", err)
		return p, nil
	}
	
	// Write current content to temp file
	if _, err := tmpFile.WriteString(prdContent); err != nil {
		tmpFile.Close()
		os.Remove(tmpFile.Name())
		p.StatusBar = fmt.Sprintf("Error writing to temp file: %v", err)
		return p, nil
	}
	tmpFile.Close()
	
	// Get editor from environment
	editor := os.Getenv("EDITOR")
	p.StatusBar = fmt.Sprintf("Opening %s...", editor)
	
	// Return a command that will open the editor
	return p, tea.ExecProcess(exec.Command(editor, tmpFile.Name()), func(err error) tea.Msg {
		defer os.Remove(tmpFile.Name())
		
		if err != nil {
			return PRDEditResultMsg{
				Success: false,
				Error:   fmt.Sprintf("Editor error: %v", err),
			}
		}
		
		// Read the edited content
		editedContent, err := os.ReadFile(tmpFile.Name())
		if err != nil {
			return PRDEditResultMsg{
				Success: false,
				Error:   fmt.Sprintf("Error reading edited file: %v", err),
			}
		}
		
		return PRDEditResultMsg{
			Success: true,
			Content: string(editedContent),
		}
	})
}

// startInlinePRDEdit starts inline editing using textarea
func (p *Prompt) startInlinePRDEdit(prdContent string) (*Prompt, tea.Cmd) {
	// Set up inline editing
	p.editingPRD = true
	p.prdOriginal = prdContent
	p.prdEditTextarea.SetValue(prdContent)
	p.prdEditTextarea.Focus()
	p.StatusBar = "Editing PRD inline - Press Ctrl+S (or Cmd+S) to save, Esc to cancel"
	
	return p, nil
}

// PRDEditResultMsg is sent when external PRD editing is complete
type PRDEditResultMsg struct {
	Success bool
	Content string
	Error   string
}

