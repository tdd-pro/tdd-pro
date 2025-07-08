#!/bin/bash

# TDD-Pro MCP Server Build Script
# Builds the MCP server with version injection

set -e

# Get version from git tags, fallback to a default if not in a git repo
if [ -z "$VERSION" ]; then
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        VERSION=$(git describe --tags --always 2>/dev/null || echo "v0.0.0-$(git rev-parse --short HEAD)")
    else
        VERSION="v0.0.0-dev"
    fi
fi

echo "Building TDD-Pro MCP Server version: $VERSION"

# Create bin directory structure for all platforms
mkdir -p bin/{linux-amd64,linux-arm64,darwin-amd64,darwin-arm64}

# Build for all platforms that match GoReleaser targets
echo "Building for linux-amd64..."
TDDPRO_VERSION="$VERSION" bun build --compile --target=bun-linux-x64 --outfile=bin/linux-amd64/tdd-pro-mcp ./mcp-stdio-server.ts

echo "Building for linux-arm64..."
TDDPRO_VERSION="$VERSION" bun build --compile --target=bun-linux-arm64 --outfile=bin/linux-arm64/tdd-pro-mcp ./mcp-stdio-server.ts

echo "Building for darwin-amd64..."
TDDPRO_VERSION="$VERSION" bun build --compile --target=bun-darwin-x64 --outfile=bin/darwin-amd64/tdd-pro-mcp ./mcp-stdio-server.ts

echo "Building for darwin-arm64..."
TDDPRO_VERSION="$VERSION" bun build --compile --target=bun-darwin-arm64 --outfile=bin/darwin-arm64/tdd-pro-mcp ./mcp-stdio-server.ts

# Create platform detection wrapper script
cat > bin/tdd-pro-mcp << 'EOF'
#!/bin/bash

# TDD-Pro MCP Server Platform Selector
# Automatically selects the correct binary for the current platform

set -e

# Detect platform
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# Normalize architecture names to match our build targets
case "$ARCH" in
    x86_64)
        ARCH="amd64"
        ;;
    aarch64|arm64)
        ARCH="arm64"
        ;;
    *)
        echo "Unsupported architecture: $ARCH" >&2
        exit 1
        ;;
esac

# Normalize OS names
case "$OS" in
    linux)
        OS="linux"
        ;;
    darwin)
        OS="darwin"
        ;;
    *)
        echo "Unsupported operating system: $OS" >&2
        exit 1
        ;;
esac

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Construct path to platform-specific binary
BINARY_PATH="$SCRIPT_DIR/$OS-$ARCH/tdd-pro-mcp"

# Check if the binary exists
if [ ! -f "$BINARY_PATH" ]; then
    echo "Binary not found for platform $OS-$ARCH at: $BINARY_PATH" >&2
    echo "Available binaries:" >&2
    ls -la "$SCRIPT_DIR"/ >&2
    exit 1
fi

# Execute the platform-specific binary with all arguments
exec "$BINARY_PATH" "$@"
EOF

# Make wrapper script executable
chmod +x bin/tdd-pro-mcp

echo "Cross-compilation complete for all platforms"
echo "Version: $VERSION"
echo "Binaries created:"
echo "  - bin/linux-amd64/tdd-pro-mcp"
echo "  - bin/linux-arm64/tdd-pro-mcp"
echo "  - bin/darwin-amd64/tdd-pro-mcp"  
echo "  - bin/darwin-arm64/tdd-pro-mcp"
echo "  - bin/tdd-pro-mcp (platform selector wrapper)"