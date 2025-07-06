#!/bin/bash

# TDD-Pro Build Script
# Builds binaries for multiple platforms and creates release archives

set -e

# Configuration
VERSION=${VERSION:-"v1.0.0"}
BINARY_NAME="tdd-pro"
BUILD_DIR="build"
DIST_DIR="dist"

# Supported platforms
PLATFORMS=(
    "darwin/amd64"
    "darwin/arm64"
    "linux/amd64"
    "linux/arm64"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Clean previous builds
clean_build() {
    log_info "Cleaning previous builds..."
    rm -rf "$BUILD_DIR" "$DIST_DIR"
    mkdir -p "$BUILD_DIR" "$DIST_DIR"
}

# Build TypeScript/Node.js components
build_node_components() {
    log_info "Building Node.js components..."
    cd packages/tdd-pro
    
    # Install dependencies
    npm install
    
    # Build the project
    npm run build
    
    cd ../..
}

# Build Go binary for specific platform
build_go_binary() {
    local platform=$1
    local goos=$(echo $platform | cut -d'/' -f1)
    local goarch=$(echo $platform | cut -d'/' -f2)
    
    log_info "Building for $goos/$goarch..."
    
    cd packages/tui
    
    # Set environment variables for cross-compilation
    export GOOS=$goos
    export GOARCH=$goarch
    export CGO_ENABLED=0
    
    # Build binary
    local binary_name="$BINARY_NAME"
    if [[ "$goos" == "windows" ]]; then
        binary_name="$BINARY_NAME.exe"
    fi
    
    local output_path="../../$BUILD_DIR/${goos}-${goarch}/$binary_name"
    mkdir -p "../../$BUILD_DIR/${goos}-${goarch}"
    
    go build -ldflags "-X main.version=$VERSION" -o "$output_path" .
    
    cd ../..
    
    log_info "✅ Built $goos/$goarch binary: $output_path"
}

# Create release archive for platform
create_archive() {
    local platform=$1
    local goos=$(echo $platform | cut -d'/' -f1)
    local goarch=$(echo $platform | cut -d'/' -f2)
    
    log_info "Creating archive for $goos/$goarch..."
    
    local platform_dir="$BUILD_DIR/${goos}-${goarch}"
    local archive_name="${BINARY_NAME}-${VERSION}-${goos}-${goarch}.tar.gz"
    local archive_path="$DIST_DIR/$archive_name"
    
    # Create archive
    tar -czf "$archive_path" -C "$platform_dir" .
    
    log_info "✅ Created archive: $archive_path"
    
    # Calculate SHA256
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$archive_path" | cut -d' ' -f1 > "$archive_path.sha256"
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$archive_path" | cut -d' ' -f1 > "$archive_path.sha256"
    else
        log_warn "No SHA256 utility found, skipping checksum"
    fi
}

# Create checksums file
create_checksums() {
    log_info "Creating checksums.txt..."
    
    cd "$DIST_DIR"
    
    # Create checksums file
    > checksums.txt
    
    for archive in *.tar.gz; do
        if [[ -f "$archive" ]]; then
            if command -v sha256sum >/dev/null 2>&1; then
                sha256sum "$archive" >> checksums.txt
            elif command -v shasum >/dev/null 2>&1; then
                shasum -a 256 "$archive" >> checksums.txt
            fi
        fi
    done
    
    cd ..
    
    log_info "✅ Created checksums.txt"
}

# Main build function
main() {
    log_info "Starting TDD-Pro build process..."
    log_info "Version: $VERSION"
    log_info "Binary name: $BINARY_NAME"
    log_info ""
    
    # Clean previous builds
    clean_build
    
    # Build Node.js components
    build_node_components
    
    # Build Go binaries for all platforms
    for platform in "${PLATFORMS[@]}"; do
        build_go_binary "$platform"
    done
    
    # Create archives
    for platform in "${PLATFORMS[@]}"; do
        create_archive "$platform"
    done
    
    # Create checksums
    create_checksums
    
    log_info ""
    log_info "🎉 Build completed successfully!"
    log_info "📦 Release artifacts in: $DIST_DIR/"
    log_info ""
    log_info "Release files:"
    ls -la "$DIST_DIR/"
}

# Check requirements
check_requirements() {
    log_info "Checking build requirements..."
    
    # Check Go
    if ! command -v go >/dev/null 2>&1; then
        log_error "Go is required but not installed"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js is required but not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm >/dev/null 2>&1; then
        log_error "npm is required but not installed"
        exit 1
    fi
    
    log_info "✅ All requirements satisfied"
    log_info "Go version: $(go version)"
    log_info "Node.js version: $(node --version)"
    log_info "npm version: $(npm --version)"
    log_info ""
}

# Run the build
check_requirements
main "$@"