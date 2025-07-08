package tui

import (
	"tddpro/internal/components"

	"fmt"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)


var banner = `
 ╭─╮    ┌─╮  ┌─╮                 
╭┘▌├─┬──┤░├──┤░│┌────╮┌─┬─┬────╮ 
╰┐█╭─┤▗╭┐░│▗╭┐░├┤▐┌╮░││▐╭─┤▗┌╮░│ 
 │▓╰╮│▓╰┘░│▓╰┘░├┤▓├╯░││▓│ │▓╰╯░│ 
 ╰──╯╰────┴────┘│▓╭──╯└─┘ ╰────╯ 
                └─┘              
`

var styleInfo = lipgloss.NewStyle().
	Foreground(lipgloss.Color("245")).
	Align(lipgloss.Center)

type model struct {
	prompt *components.Prompt
}

func (m model) Init() tea.Cmd {
	return nil
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	m.prompt, cmd = m.prompt.Update(msg)
	return m, cmd
}

func (m model) View() string {
	// If features view is active, only show the prompt (which contains the full features interface)
	if m.prompt.FeaturesViewActive {
		return m.prompt.View()
	}

	var headerStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("205")).
		Bold(true).
		Align(lipgloss.Center)

	
	// Background(lipgloss.Color("236")). // Dark gray background
	// Add background color to the banner
	// bannerStyle := lipgloss.NewStyle().
	// 	Foreground(lipgloss.Color("39")).  // Blue text
	// 	Bold(true).
	// 	Align(lipgloss.Center).
	// 	PaddingLeft(2).
	// 	PaddingRight(2)
	
	var styledBanner = headerStyle.Render(banner)
	return lipgloss.JoinVertical(lipgloss.Top,
		styledBanner,
		// styleBanner.Render("TDD PRO "+version),
		"",
		styleInfo.Render("Type a command or press Ctrl+C to clear/exit."),
		"",
		m.prompt.View(),
	)
}

func Start(apiURL string, version string) error {
	prompt := components.NewPromptWithAPI(apiURL, version)
	p := tea.NewProgram(
		model{prompt: &prompt},
		tea.WithAltScreen(),       // Use alternate screen buffer
		tea.WithMouseCellMotion(), // Enable mouse support
	)
	_, err := p.Run()
	return err
}

func GradientBanner(text string, colors []string) string {
	styled := ""
	for i, c := range text {
		color := colors[i%len(colors)]
		styled += lipgloss.NewStyle().
			Foreground(lipgloss.Color(color)).
			Bold(true).
			Render(string(c))
	}
	return styled
}

func GradientBannerASCII(banner string, colors []string) string {
	lines := []string{}
	for lineIdx, line := range splitLines(banner) {
		styledLine := ""
		for i, c := range line {
			color := colors[(i+lineIdx)%len(colors)]
			styledLine += lipgloss.NewStyle().
				Foreground(lipgloss.Color(color)).
				Bold(true).
				Render(string(c))
		}
		lines = append(lines, styledLine)
	}
	return lipgloss.JoinVertical(lipgloss.Left, lines...)
}

func splitLines(s string) []string {
	var lines []string
	line := ""
	for _, c := range s {
		if c == '\n' {
			lines = append(lines, line)
			line = ""
		} else {
			line += string(c)
		}
	}
	if line != "" {
		lines = append(lines, line)
	}
	return lines
}

func main() {
	banner := "TDD PRO"
	// Example color ramp (red to violet)
	colors := []string{"196", "202", "208", "214", "220", "190", "154", "118", "82", "46", "51", "39", "21", "93", "129", "163"}
	fmt.Println(GradientBanner(banner, colors))
}
