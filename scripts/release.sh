#!/bin/bash

# TDD-Pro Release Script
# Creates a new release with proper tagging and triggers GitHub Actions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Show usage
show_usage() {
    cat << EOF
TDD-Pro Release Script

USAGE:
  ./scripts/release.sh <version>

EXAMPLES:
  ./scripts/release.sh v1.0.0    # Create release v1.0.0
  ./scripts/release.sh v1.0.1    # Create patch release
  ./scripts/release.sh v2.0.0    # Create major release

REQUIREMENTS:
  - Git repository with 'origin' remote
  - Clean working directory (no uncommitted changes)
  - GitHub repository with Actions enabled

EOF
}

# Check if version is provided
if [[ $# -eq 0 ]]; then
    log_error "Version argument required"
    show_usage
    exit 1
fi

VERSION="$1"

# Validate version format
if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
    log_error "Invalid version format: $VERSION"
    log_error "Expected format: vX.Y.Z (e.g., v1.0.0)"
    exit 1
fi

log_info "Creating release: $VERSION"

# Check git status
log_step "Checking git repository status..."

if ! git rev-parse --git-dir >/dev/null 2>&1; then
    log_error "Not a git repository"
    exit 1
fi

if ! git diff-index --quiet HEAD --; then
    log_error "Working directory is not clean"
    log_error "Please commit or stash your changes first"
    git status --short
    exit 1
fi

# Check if tag already exists
if git rev-parse "$VERSION" >/dev/null 2>&1; then
    log_error "Tag $VERSION already exists"
    log_error "Please use a different version or delete the existing tag:"
    log_error "  git tag -d $VERSION"
    log_error "  git push origin :refs/tags/$VERSION"
    exit 1
fi

# Fetch latest changes
log_step "Fetching latest changes..."
git fetch origin

# Check if we're on main branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$current_branch" != "main" ]]; then
    log_warn "Not on main branch (currently on: $current_branch)"
    read -p "Continue with release from $current_branch? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Release cancelled"
        exit 0
    fi
fi

# Update package.json version (if exists)
log_step "Updating package versions..."

if [[ -f "packages/tdd-pro/package.json" ]]; then
    # Extract version without 'v' prefix
    VERSION_NUMBER="${VERSION#v}"
    
    # Update package.json
    sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION_NUMBER\"/" packages/tdd-pro/package.json
    rm packages/tdd-pro/package.json.bak
    
    log_info "Updated packages/tdd-pro/package.json to version $VERSION_NUMBER"
    
    # Commit version bump
    git add packages/tdd-pro/package.json
    git commit -m "Bump version to $VERSION"
fi

# Create and push tag
log_step "Creating git tag..."
git tag -a "$VERSION" -m "Release $VERSION"

log_step "Pushing changes and tag..."
git push origin HEAD
git push origin "$VERSION"

log_info "✅ Release $VERSION created successfully!"
log_info ""
log_info "📋 What happens next:"
log_info "  1. 🔄 GitHub Actions 'publish' workflow triggered"
log_info "  2. 🏗️  GoReleaser builds binaries for multiple platforms"
log_info "  3. 📦 Creates GitHub Release with assets"
log_info "  4. 🍺 Updates Homebrew tap (if configured)"
log_info "  5. 📋 Updates AUR package (if configured)"
log_info "  6. 📝 Publishes NPM package (if configured)"
log_info ""
log_info "🔗 Links:"
log_info "  • Actions: https://github.com/tdd-pro/tdd-pro/actions"
log_info "  • Release: https://github.com/tdd-pro/tdd-pro/releases/tag/$VERSION"
log_info ""
log_info "🚀 Install command (works once release completes):"
log_info "   curl -fsSL https://raw.githubusercontent.com/tdd-pro/tdd-pro/main/install | bash"