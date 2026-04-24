# vxrt code

![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=flat-square)
![Bun](https://img.shields.io/badge/Bun-1.0%2B-black?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-red?style=flat-square)
![Fork](https://img.shields.io/badge/fork-claude--code-orange?style=flat-square)

> **vxrt code** is a custom fork of [Anthropic's Claude Code](https://github.com/anthropics/claude-code), rebuilt to run fully local and cloud models — no Anthropic API billing required.

Supports **Ollama** (local, offline, free) and **OpenRouter** (cloud, multi-model) as drop-in backends via the Anthropic-compatible API layer.

---

## What's Different from Upstream

| Feature | claude-code (upstream) | vxrt code (this fork) |
|---|---|---|
| Model backend | Anthropic API only | Ollama + OpenRouter |
| Billing | Pay-per-token | Free (local) / OpenRouter pricing |
| Branding | Claude Code | vxrt code |
| Theme | Default blue | vxrt red/black |
| Offline support | ✗ | ✓ (via Ollama) |

---

## Requirements

- **Node.js** >= 18.0.0
- **Bun** >= 1.0 (used as runtime & bundler)
- **Ollama** >= 0.14.0 (for local models)
- **Claude Code CLI** >= 2.1.12

---

## Installation

### 1. Clone this repo

```bash
git clone https://github.com/lily0ng/vxrt-code.git
cd vxrt-code
```

### 2. Install dependencies

```bash
npm install
# or with bun (recommended)
bun install
```

### 3. Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

Pull a local coding model:

```bash
ollama pull llama3.2
# or for better code tasks:
ollama pull qwen2.5-coder:7b
```

---

## Running Locally

### Quick start (Ollama)

```bash
# 1. Start Ollama server (keep this terminal open)
ollama serve

# 2. In a new terminal — run vxrt code
ANTHROPIC_AUTH_TOKEN=ollama \
ANTHROPIC_BASE_URL=http://localhost:11434 \
claude --model llama3.2
```

### Persistent setup (recommended)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
export ANTHROPIC_AUTH_TOKEN="ollama"
export ANTHROPIC_BASE_URL="http://localhost:11434"
```

Then just run:

```bash
ollama serve        # start local model server
claude              # launch vxrt code
```

### Using OpenRouter (cloud)

```bash
ANTHROPIC_AUTH_TOKEN=your-openrouter-api-key \
ANTHROPIC_BASE_URL=https://openrouter.ai/api/v1 \
claude --model anthropic/claude-3.5-sonnet
```

Get your API key at [openrouter.ai/keys](https://openrouter.ai/keys).

---

## Project Structure

```
vxrt-code/
├── src/                    # Source code (TypeScript/TSX)
│   ├── main.tsx            # Entry point
│   ├── cli/                # CLI argument parsing
│   ├── commands/           # Slash commands (/status, /model, etc.)
│   ├── components/         # React TUI components
│   ├── assistant/          # AI response handling
│   ├── bridge/             # API bridge layer
│   ├── context/            # Session context management
│   ├── entrypoints/        # App entrypoints
│   └── coordinator/        # Task coordinator
├── plugins/                # Claude Code plugins
├── scripts/                # Build & utility scripts
├── .claude/
│   ├── settings.json       # Default model config
│   └── themes/vxrt.json    # vxrt red/black theme
├── package.json
├── bunfig.toml
└── tsconfig.json
```

---

## Development

### Run from source

```bash
bun run dev
# or
bun run src/main.tsx
```

### Build

```bash
bun run build
# output → dist/
```

### npm scripts

| Command | Description |
|---|---|
| `npm run start` | Run the app via Bun |
| `npm run dev` | Dev mode (same as start) |
| `npm run build` | Bundle to `dist/` |

---

## Theme

The **vxrt** theme uses a red/black color scheme matching the project logo.

Apply inside claude:

```
/theme → select vxrt
```

Theme file: `.claude/themes/vxrt.json`

---

## Branches

| Branch | Purpose |
|---|---|
| `main` | Stable release |
| `dev` | Integration / development |
| `feat/ollama-integration` | Local model backend |
| `feat/openrouter-integration` | Cloud model backend |
| `feat/themes` | vxrt theme |
| `feat/ui-branding` | Name & UI patches |

---

## Credits

- Forked from [anthropics/claude-code](https://github.com/anthropics/claude-code)
- Local model support via [Ollama](https://ollama.com)
- Cloud model routing via [OpenRouter](https://openrouter.ai)
