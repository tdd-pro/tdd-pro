package components

import (
	"os"
	"sort"
	"strings"

	"tddpro/internal/util"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/sahilm/fuzzy"
)

// CompletionItem represents a single completion item
type CompletionItem struct {
	Title       string
	Description string
	Value       string // The actual value to insert
	IsCommand   bool
}

// CompletionProvider interface for different types of completions
type CompletionProvider interface {
	GetID() string
	GetCompletions(query string) ([]CompletionItem, error)
}

// CommandCompletionProvider provides command completions
type CommandCompletionProvider struct {
	// We'll generate commands dynamically based on context
}

func NewCommandCompletionProvider() *CommandCompletionProvider {
	return &CommandCompletionProvider{}
}

// getContextualCommands returns commands based on current context
func (c *CommandCompletionProvider) getContextualCommands() []CompletionItem {
	var commands []CompletionItem

	// Always show help first
	commands = append(commands, CompletionItem{
		Title: "/help", Description: "Show available commands", Value: "/help", IsCommand: true,
	})

	// Always show features second
	commands = append(commands, CompletionItem{
		Title: "/features", Description: "List all features from the MCP server", Value: "/features", IsCommand: true,
	})

	// Only show /init if no .tdd-pro directory exists in current or parent directories
	cwd, err := os.Getwd()
	if err == nil && !util.IsAlreadyInitialized(cwd) {
		commands = append(commands, CompletionItem{
			Title: "/init", Description: "Initialize TDD-Pro in current directory", Value: "/init", IsCommand: true,
		})
	}

	// Always show auth for configuring Claude API key
	commands = append(commands, CompletionItem{
		Title: "/auth", Description: "Configure Claude API key for TDD-Pro agents", Value: "/auth", IsCommand: true,
	})

	// Don't show /destroy in completion list (still available via typing)

	// Always show quit last
	commands = append(commands, CompletionItem{
		Title: "/quit", Description: "Exit the TDD-Pro TUI", Value: "/quit", IsCommand: true,
	})

	return commands
}

func (c *CommandCompletionProvider) GetID() string {
	return "commands"
}

func (c *CommandCompletionProvider) GetCompletions(query string) ([]CompletionItem, error) {
	commands := c.getContextualCommands()

	if query == "" {
		return commands, nil
	}

	// Extract command names for fuzzy matching
	commandNames := make([]string, len(commands))
	for i, cmd := range commands {
		commandNames[i] = cmd.Title
	}

	// Perform fuzzy search
	matches := fuzzy.Find(query, commandNames)

	// Convert matches back to CompletionItems
	result := make([]CompletionItem, len(matches))
	for i, match := range matches {
		result[i] = commands[match.Index]
	}

	// Custom sort to prioritize order: help, features, init (if present), quit (always last)
	sort.Slice(result, func(i, j int) bool {
		a, b := result[i].Title, result[j].Title

		// Always put quit last
		if a == "/quit" {
			return false
		}
		if b == "/quit" {
			return true
		}

		// Define preferred order for the rest
		orderMap := map[string]int{
			"/help":     1,
			"/features": 2,
			"/init":     3,
			"/auth":     4,
		}

		orderA, okA := orderMap[a]
		orderB, okB := orderMap[b]

		if okA && okB {
			return orderA < orderB
		}
		if okA {
			return true
		}
		if okB {
			return false
		}

		// Fallback to fuzzy score for any other commands
		return matches[i].Score > matches[j].Score
	})

	return result, nil
}

// CompletionManager manages different completion providers
type CompletionManager struct {
	providers map[string]CompletionProvider
}

func NewCompletionManager() *CompletionManager {
	manager := &CompletionManager{
		providers: make(map[string]CompletionProvider),
	}

	// Register providers
	manager.providers["commands"] = NewCommandCompletionProvider()

	return manager
}

func (m *CompletionManager) GetProvider(input string) CompletionProvider {
	if strings.HasPrefix(input, "/") {
		return m.providers["commands"]
	}
	// Default to commands for now
	return m.providers["commands"]
}

// CompletionDialog handles the UI for completions
type CompletionDialog struct {
	items    []CompletionItem
	selected int
	query    string
	visible  bool
	provider CompletionProvider
	width    int
	height   int
}

func NewCompletionDialog() *CompletionDialog {
	return &CompletionDialog{
		items:    []CompletionItem{},
		selected: 0,
		visible:  false,
		width:    60,
		height:   8,
	}
}

func (d *CompletionDialog) SetProvider(provider CompletionProvider) {
	d.provider = provider
}

func (d *CompletionDialog) UpdateQuery(query string) tea.Cmd {
	if d.provider == nil {
		return nil
	}

	// Remove "/" prefix for command queries
	searchQuery := query
	if strings.HasPrefix(query, "/") && len(query) > 1 {
		searchQuery = query[1:]
	}

	items, err := d.provider.GetCompletions(searchQuery)
	if err != nil {
		return nil
	}

	d.items = items
	d.query = query
	d.selected = 0 // Reset selection

	return nil
}

func (d *CompletionDialog) Show() {
	d.visible = true
	d.selected = 0
}

func (d *CompletionDialog) Hide() {
	d.visible = false
}

func (d *CompletionDialog) IsVisible() bool {
	return d.visible
}

func (d *CompletionDialog) Init() tea.Cmd {
	return nil
}

func (d *CompletionDialog) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if !d.visible {
		return d, nil
	}

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "up":
			if d.selected > 0 {
				d.selected--
			}
		case "down":
			if len(d.items) > 0 && d.selected < len(d.items)-1 {
				d.selected++
			}
		case "esc":
			d.Hide()
		case "enter", "tab":
			d.Hide()
			if len(d.items) > 0 && d.selected < len(d.items) {
				// Return a message with the selected completion
				return d, func() tea.Msg {
					return CompletionSelectedMsg{
						Item: d.items[d.selected],
					}
				}
			}
		}
	}

	return d, nil
}

func (d *CompletionDialog) View() string {
	if !d.visible || len(d.items) == 0 {
		return ""
	}

	// Bagels-style completion dialog
	dialogStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("240")).
		Background(lipgloss.Color("234")).
		Padding(1).
		Width(d.width).
		MaxHeight(d.height)

	selectedStyle := lipgloss.NewStyle().
		Background(lipgloss.Color("39")).
		Foreground(lipgloss.Color("255")).
		Bold(true).
		Width(d.width - 4) // Account for padding and border

	normalStyle := lipgloss.NewStyle().
		Background(lipgloss.Color("234")).
		Foreground(lipgloss.Color("248")).
		Width(d.width - 4)

	var rows []string
	maxItems := 6 // Limit visible items
	start := 0
	end := len(d.items)

	if len(d.items) > maxItems {
		// Scroll to keep selected item visible
		if d.selected >= maxItems {
			start = d.selected - maxItems + 1
		}
		end = start + maxItems
		if end > len(d.items) {
			end = len(d.items)
			start = end - maxItems
			if start < 0 {
				start = 0
			}
		}
	}

	for i := start; i < end; i++ {
		item := d.items[i]
		text := item.Title
		if item.Description != "" {
			text += lipgloss.NewStyle().Foreground(lipgloss.Color("245")).Render(" - " + item.Description)
		}

		if i == d.selected {
			rows = append(rows, selectedStyle.Render(text))
		} else {
			rows = append(rows, normalStyle.Render(text))
		}
	}

	content := strings.Join(rows, "\n")
	return dialogStyle.Render(content)
}

func (d *CompletionDialog) GetSelectedItem() *CompletionItem {
	if len(d.items) == 0 || d.selected >= len(d.items) {
		return nil
	}
	return &d.items[d.selected]
}

func (d *CompletionDialog) HasItems() bool {
	return len(d.items) > 0
}

// CompletionSelectedMsg is sent when a completion is selected
type CompletionSelectedMsg struct {
	Item CompletionItem
}
