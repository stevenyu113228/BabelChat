#!/usr/bin/env bash
set -e

# ─────────────────────────────────────────────────────────────
#  BabelChat Installer — Vencord Userplugin
#  Supports macOS and Linux
# ─────────────────────────────────────────────────────────────

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Symbols
CHECK="${GREEN}✔${NC}"
CROSS="${RED}✘${NC}"
WARN="${YELLOW}⚠${NC}"

# Detect OS
OS="unknown"
case "$(uname -s)" in
    Darwin*) OS="macos" ;;
    Linux*)  OS="linux" ;;
esac

# Resolve the directory where this script lives (i.e., the plugin source root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Vencord path: use argument if provided, otherwise default
DEFAULT_VENCORD_DIR="$HOME/.vencord-src"
VENCORD_DIR="${1:-$DEFAULT_VENCORD_DIR}"

TOTAL_STEPS=6

echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${CYAN}        BabelChat Installer for Vencord${NC}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  OS detected:      ${BOLD}${OS}${NC}"
echo -e "  Plugin source:    ${BOLD}${SCRIPT_DIR}${NC}"
echo -e "  Vencord directory: ${BOLD}${VENCORD_DIR}${NC}"
echo ""

# ─────────────────────────────────────────────────────────────
#  [1/6] Check prerequisites
# ─────────────────────────────────────────────────────────────
echo -e "${BOLD}[1/${TOTAL_STEPS}] Checking prerequisites...${NC}"
echo ""

MISSING=0

# --- git ---
if command -v git &>/dev/null; then
    echo -e "  ${CHECK} git found: $(git --version)"
else
    echo -e "  ${CROSS} git is not installed."
    if [ "$OS" = "macos" ]; then
        echo -e "     ${WARN} Install Xcode Command Line Tools:  ${BOLD}xcode-select --install${NC}"
    else
        echo -e "     ${WARN} Install git:  ${BOLD}sudo apt install git${NC}"
    fi
    MISSING=1
fi

# --- node ---
if command -v node &>/dev/null; then
    NODE_VERSION="$(node -v)"
    NODE_MAJOR="${NODE_VERSION#v}"
    NODE_MAJOR="${NODE_MAJOR%%.*}"
    if [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
        echo -e "  ${CHECK} node found: ${NODE_VERSION}"
    else
        echo -e "  ${CROSS} node ${NODE_VERSION} is too old (v18+ required)."
        echo -e "     ${WARN} Update via ${BOLD}https://nodejs.org/${NC} or nvm"
        MISSING=1
    fi
else
    echo -e "  ${CROSS} node is not installed."
    echo -e "     ${WARN} Install from ${BOLD}https://nodejs.org/${NC} or use nvm (https://github.com/nvm-sh/nvm)"
    MISSING=1
fi

# --- pnpm ---
if command -v pnpm &>/dev/null; then
    echo -e "  ${CHECK} pnpm found: $(pnpm --version)"
elif [ "$MISSING" -ne 0 ]; then
    # node/npm is missing, can't install pnpm automatically
    echo -e "  ${CROSS} pnpm is not installed (install node first, then re-run)."
    MISSING=1
else
    echo -e "  ${WARN} pnpm is not installed."
    echo ""
    read -rp "     Would you like to install pnpm now via npm? (y/n) " INSTALL_PNPM
    if [[ "$INSTALL_PNPM" =~ ^[Yy]$ ]]; then
        echo -e "     Installing pnpm..."
        npm install -g pnpm
        if command -v pnpm &>/dev/null; then
            echo -e "  ${CHECK} pnpm installed: $(pnpm --version)"
        else
            echo -e "  ${CROSS} pnpm installation failed."
            MISSING=1
        fi
    else
        echo -e "  ${CROSS} pnpm is required. Please install it and re-run this script."
        MISSING=1
    fi
fi

echo ""

if [ "$MISSING" -ne 0 ]; then
    echo -e "${RED}${BOLD}Some prerequisites are missing. Please install them and try again.${NC}"
    exit 1
fi

echo -e "  ${CHECK} All prerequisites satisfied."
echo ""

# ─────────────────────────────────────────────────────────────
#  [2/6] Clone or update Vencord
# ─────────────────────────────────────────────────────────────
echo -e "${BOLD}[2/${TOTAL_STEPS}] Setting up Vencord...${NC}"
echo ""

if [ -d "$VENCORD_DIR/.git" ]; then
    echo -e "  Vencord directory already exists. Pulling latest changes..."
    pushd "$VENCORD_DIR" > /dev/null
    git pull
    popd > /dev/null
    echo -e "  ${CHECK} Vencord updated."
elif [ -d "$VENCORD_DIR" ]; then
    # Directory exists but is not a git repo — could be a problem
    echo -e "  ${WARN} ${VENCORD_DIR} exists but is not a git repository."
    echo -e "     Attempting to use it as-is."
else
    echo -e "  Cloning Vencord into ${VENCORD_DIR}..."
    git clone https://github.com/Vendicated/Vencord.git "$VENCORD_DIR"
    echo -e "  ${CHECK} Vencord cloned."
fi

echo ""

# ─────────────────────────────────────────────────────────────
#  [3/6] Install Vencord dependencies
# ─────────────────────────────────────────────────────────────
echo -e "${BOLD}[3/${TOTAL_STEPS}] Installing Vencord dependencies...${NC}"
echo ""

pushd "$VENCORD_DIR" > /dev/null
pnpm install
popd > /dev/null

echo ""
echo -e "  ${CHECK} Dependencies installed."
echo ""

# ─────────────────────────────────────────────────────────────
#  [4/6] Copy the BabelChat plugin
# ─────────────────────────────────────────────────────────────
echo -e "${BOLD}[4/${TOTAL_STEPS}] Copying BabelChat plugin...${NC}"
echo ""

PLUGIN_SRC="$SCRIPT_DIR/src/userplugins/babelChat"
PLUGIN_DEST="$VENCORD_DIR/src/userplugins/babelChat"

if [ ! -d "$PLUGIN_SRC" ]; then
    echo -e "  ${CROSS} Plugin source not found at: ${PLUGIN_SRC}"
    echo -e "     Make sure you are running this script from the BabelChat repository root."
    exit 1
fi

# Remove old copy if it exists, then copy fresh
if [ -d "$PLUGIN_DEST" ]; then
    echo -e "  Removing previous BabelChat installation..."
    rm -rf "$PLUGIN_DEST"
fi

mkdir -p "$(dirname "$PLUGIN_DEST")"
cp -R "$PLUGIN_SRC" "$PLUGIN_DEST"

echo -e "  ${CHECK} BabelChat copied to ${PLUGIN_DEST}"
echo ""

# ─────────────────────────────────────────────────────────────
#  [5/6] Build Vencord
# ─────────────────────────────────────────────────────────────
echo -e "${BOLD}[5/${TOTAL_STEPS}] Building Vencord (this may take a moment)...${NC}"
echo ""

pushd "$VENCORD_DIR" > /dev/null
pnpm build
popd > /dev/null

echo ""
echo -e "  ${CHECK} Build complete."
echo ""

# ─────────────────────────────────────────────────────────────
#  [6/6] Inject into Discord
# ─────────────────────────────────────────────────────────────
echo -e "${BOLD}[6/${TOTAL_STEPS}] Inject Vencord into Discord${NC}"
echo ""

echo -e "  ${WARN} ${BOLD}Please close Discord completely before injecting.${NC}"
echo -e "     (macOS: right-click the Dock icon > Quit. Windows: close from system tray.)"
echo ""
read -rp "  Do you want to inject Vencord into Discord now? (y/n) " DO_INJECT

if [[ "$DO_INJECT" =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "  The injector will ask which Discord version to use."
    echo -e "  ${BOLD}Pick \"Discord\" (Stable) if you're not sure.${NC}"
    echo ""
    pushd "$VENCORD_DIR" > /dev/null
    pnpm inject
    popd > /dev/null
    echo ""
    echo -e "  ${CHECK} Vencord injected into Discord."
else
    echo ""
    echo -e "  ${WARN} Skipped injection. You can run it later with:"
    echo -e "     ${BOLD}cd ${VENCORD_DIR} && pnpm inject${NC}"
fi

echo ""

# ─────────────────────────────────────────────────────────────
#  Done!
# ─────────────────────────────────────────────────────────────
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}        Installation complete!${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Next steps:"
echo -e "    1. ${BOLD}Restart Discord${NC} completely (quit and reopen, not just reload)."
echo -e "    2. Open ${BOLD}Settings > Vencord > Plugins${NC}."
echo -e "    3. Search for ${BOLD}BabelChat${NC} and enable it."
echo ""
echo -e "  If you need to rebuild later:"
echo -e "    ${BOLD}cd ${VENCORD_DIR} && pnpm build${NC}"
echo ""
echo -e "  Enjoy translating with BabelChat!"
echo ""
