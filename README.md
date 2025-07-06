# TDD-Pro

**AI-Powered Test-Driven Development Agent**

An intelligent terminal tool that collaborates with Claude to implement true test-driven development workflows, helping developers build better software through systematic planning, documentation, and iterative testing.

```
                         ╭─╮    ┌─╮  ┌─╮                 
                        ╭┘▌╰─┬──╯░├──╯░│┌────╮┌───┬────╮ 
                        ╰┐█╭─┤▗╭┐░│▗╭┐░├┤▐┌╮░││▐╭─┤▗┌╮░│ 
                         │▓╰╮│▓╰┘░│▓╰┘░├┤▓╰╯░││▓│ │▓╰╯░│ 
                         └──╯╰────┴────┘│▓╭──╯└─┘ ╰────╯ 
                                        └─┘              
```

## 🚀 Quick Start

### One-Line Installation

```bash
curl -fsSL https://raw.githubusercontent.com/tdd-pro/tdd-pro/main/install | bash
```

### Manual Installation

1. **Download the latest release** for your platform from [releases](https://github.com/tdd-pro/tdd-pro/releases)
2. **Extract and install**:
   ```bash
   tar -xzf tdd-pro-*.tar.gz
   sudo mv tdd-pro /usr/local/bin/
   chmod +x /usr/local/bin/tdd-pro
   ```
3. **Verify installation**:
   ```bash
   tdd-pro --version
   ```

### Alternative Installation Methods

#### Using Custom Directory
```bash
export INSTALL_DIR=~/.local/bin
curl -fsSL https://raw.githubusercontent.com/tdd-pro/tdd-pro/main/install | bash
```

#### Install Specific Version
```bash
export VERSION=v1.0.0
curl -fsSL https://raw.githubusercontent.com/tdd-pro/tdd-pro/main/install | bash
```

#### Development Installation
```bash
# Clone the repository
git clone https://github.com/tdd-pro/tdd-pro.git
cd tdd-pro

# Install dependencies
npm install

# Build from source
npm run build

# Install globally (optional)
npm link
```

## 📋 System Requirements

### Supported Platforms
- **macOS** (Intel and Apple Silicon)
- **Linux** (x86_64 and ARM64)
- **Windows** (via WSL/WSL2)

### Required Tools
- **curl** (for installation)
- **tar** (for archive extraction)
- **sha256sum/shasum/openssl** (for security verification)

### Platform-Specific Installation Commands
```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install curl tar openssl

# CentOS/RHEL/Fedora
sudo yum install curl tar openssl

# macOS (curl and tar pre-installed)
brew install openssl  # optional, for additional verification
```

## 🏁 Getting Started

### 1. Initialize a New Project
```bash
cd your-project-directory
tdd-pro init
```

### 2. Configure API Access
```bash
# Configure Claude API key
tdd-pro auth

# Or set environment variable
export ANTHROPIC_API_KEY=your_api_key_here
```

### 3. Start Interactive TUI
```bash
tdd-pro
```

### 4. Basic Commands
```bash
# Show all available commands
tdd-pro --help

# Initialize TDD-Pro in current directory
tdd-pro init

# Configure authentication
tdd-pro auth

# Start the interactive interface
tdd-pro

# List all features
tdd-pro /features

# Exit the application
tdd-pro /quit
```

## 🎯 Core Features

### Interactive Terminal Interface
- **Beautiful TUI** built with Bubble Tea
- **Real-time feature management** with multiple current features support
- **Syntax highlighting** and **smart completions**
- **Multi-panel layout** for workflow and feature details

### AI-Powered Planning
- **Requirements gathering** through intelligent prompting
- **Test-driven development** planning and execution
- **Documentation generation** with living specs
- **Technical design** recommendations

### Feature Management
- **Feature lifecycle** tracking (backlog → refinement → planned → approved)
- **Multiple current features** for parallel development
- **Product Requirements Documents** (PRD) with markdown support
- **Task breakdown** with acceptance criteria

### Integration Ready
- **Model Context Protocol (MCP)** support for Claude Code/Cursor
- **Local-first** approach with `.tdd-pro` directory structure
- **Git-friendly** workflow with proper versioning
- **Cross-platform** compatibility

## 🔧 Configuration

### Environment Variables
```bash
# API Configuration
export ANTHROPIC_API_KEY=your_claude_api_key
export OPENAI_API_KEY=your_openai_api_key

# Installation Configuration
export INSTALL_DIR=~/.local/bin    # Custom install directory
export VERSION=v1.0.0              # Specific version to install
export VERBOSE=true                # Enable verbose output
export FORCE=true                  # Force reinstallation
```

### Project Structure
When you run `tdd-pro init`, the following structure is created:
```
your-project/
├── .tdd-pro/
│   ├── features/
│   │   ├── index.yml              # Feature registry
│   │   └── feature-name/
│   │       ├── index.yml          # Feature metadata
│   │       ├── prd.md             # Product requirements
│   │       └── tasks.yml          # Task breakdown
│   └── archived-features/         # Completed features
```

## 🔐 Security & Privacy

- ✅ **Completely isolated** - No external data transmission except to chosen LLM provider
- ✅ **API key management** - Secure local storage of Claude/OpenAI keys  
- ✅ **No telemetry** - Zero data collection or analytics
- ✅ **Local processing** - All analysis and planning happens locally
- ✅ **SHA256 verification** - Binary integrity checking during installation

## 🛠️ Advanced Usage

### Working with Features
```bash
# Inside the TDD-Pro TUI interface:
/features           # List all features
/help               # Show available commands
/init               # Initialize new TDD-Pro project
/auth               # Configure API keys
/quit               # Exit application

# Use arrow keys to navigate
# Press 'e' to edit PRD documents
# Press 't' to manage tasks
# Press 'd' to view feature details
```

### Integration with Claude Code
```bash
# In your project directory with .tdd-pro initialized
claude-code "Implement the user authentication feature using TDD methodology"
```

### Custom Workflows
```bash
# Set multiple current features for parallel development
# This is managed through the TUI interface by selecting features
# and managing them in the "Current" section
```

## 🚨 Troubleshooting

### Installation Issues

**Problem**: Permission denied during installation
```bash
# Solution 1: Install to user directory
export INSTALL_DIR=~/.local/bin
curl -fsSL https://raw.githubusercontent.com/tdd-pro/tdd-pro/main/install | bash

# Solution 2: Ensure user bin directory is in PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Problem**: Network connectivity issues
```bash
# Check GitHub connectivity
curl -fsSL https://api.github.com

# If behind corporate firewall, configure proxy
export https_proxy=http://your-proxy:port
export http_proxy=http://your-proxy:port
```

**Problem**: Binary not found after installation
```bash
# Check if installed correctly
ls -la /usr/local/bin/tdd-pro  # or your install directory

# Verify PATH includes install directory
echo $PATH

# Restart shell or source profile
source ~/.bashrc  # or ~/.zshrc
```

### Runtime Issues

**Problem**: API key not working
```bash
# Verify API key is set
echo $ANTHROPIC_API_KEY

# Reconfigure through TUI
tdd-pro
# Then use /auth command
```

**Problem**: TUI not displaying correctly
```bash
# Ensure terminal supports required features
echo $TERM

# Try different terminal emulator if issues persist
# Recommended: iTerm2 (macOS), GNOME Terminal (Linux)
```

### Common Error Messages

| Error | Solution |
|-------|----------|
| `command not found: tdd-pro` | Add install directory to PATH or use full path |
| `permission denied` | Check file permissions with `ls -la` |
| `network error` | Check internet connection and proxy settings |
| `API key invalid` | Verify API key and reconfigure with `/auth` |
| `checksum verification failed` | Re-download or report security issue |

## 📚 Documentation

- **[Product Vision](docs/PRODUCT_VISION.md)** - High-level goals and philosophy
- **[Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)** - System design and implementation
- **[Claude Integration](docs/CLAUDE.md)** - Working with Claude Code and MCP

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Clone and setup
git clone https://github.com/tdd-pro/tdd-pro.git
cd tdd-pro

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev

# Build for production
npm run build
```

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **GitHub**: https://github.com/tdd-pro/tdd-pro
- **Issues**: https://github.com/tdd-pro/tdd-pro/issues
- **Discussions**: https://github.com/tdd-pro/tdd-pro/discussions
- **Documentation**: https://tdd-pro.dev (coming soon)

---

**TDD-Pro: Because great software starts with great planning.** 🚀
