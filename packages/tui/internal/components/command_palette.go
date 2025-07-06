package components

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type CommandPaletteItem struct {
	Title string
	Desc  string
}

type CommandPalette struct {
	items    []CommandPaletteItem
	filtered []CommandPaletteItem
	selected int
	query    string
	show     bool
}

func NewCommandPalette(commands []CommandPaletteItem) *CommandPalette {
	return &CommandPalette{
		items:    commands,
		filtered: commands,
		selected: 0,
		show:     false,
	}
}

func (cp *CommandPalette) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "up":
			if cp.selected > 0 {
				cp.selected--
			}
		case "down":
			if cp.selected < len(cp.filtered)-1 {
				cp.selected++
			}
		case "esc":
			cp.show = false
		case "enter":
			cp.show = false
			// Selection handled by parent
		}
		// Filtering on query (if you want to add fuzzy search)
	}
	return cp, nil
}

func (cp *CommandPalette) View() string {
	if !cp.show || len(cp.filtered) == 0 {
		return ""
	}
	style := lipgloss.NewStyle().Background(lipgloss.Color("236")).Foreground(lipgloss.Color("15")).Padding(1, 2)
	selectedStyle := style.Copy().Foreground(lipgloss.Color("205")).Bold(true)
	rows := ""
	for i, item := range cp.filtered {
		row := item.Title + "\t" + item.Desc
		if i == cp.selected {
			rows += selectedStyle.Render(row) + "\n"
		} else {
			rows += style.Render(row) + "\n"
		}
	}
	return rows
}

func (cp *CommandPalette) Current() *CommandPaletteItem {
	if len(cp.filtered) == 0 {
		return nil
	}
	return &cp.filtered[cp.selected]
}

func (cp *CommandPalette) Show() {
	cp.show = true
	cp.selected = 0
	cp.filtered = cp.items
}

func (cp *CommandPalette) Hide() {
	cp.show = false
}

func (cp *CommandPalette) IsShown() bool {
	return cp.show
}

func (cp *CommandPalette) Init() tea.Cmd {
	return nil
}
