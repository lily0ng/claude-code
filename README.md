# Claude Code

![](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=flat-square) [![npm]](https://www.npmjs.com/package/@anthropic-ai/claude-code) ![](https://img.shields.io/badge/fork-anthropics%2Fclaude--code-orange?style=flat-square)

[npm]: https://img.shields.io/npm/v/@anthropic-ai/claude-code.svg?style=flat-square

> **This is a personal fork** of [Anthropic's Claude Code](https://github.com/anthropics/claude-code) by [@lily0ng](https://github.com/lily0ng), extended to support local models via **Ollama** and cloud models via **OpenRouter** — with no Anthropic API billing required. All core functionality, architecture, and intellectual property belongs to [Anthropic](https://anthropic.com). This fork is not affiliated with or endorsed by Anthropic.

Claude Code is an agentic coding tool that lives in your terminal, understands your codebase, and helps you code faster by executing routine tasks, explaining complex code, and handling git workflows — all through natural language commands. Use it in your terminal, IDE, or tag @claude on GitHub.

**Learn more in the [official documentation](https://code.claude.com/docs/en/overview)** · **Original repo: [anthropics/claude-code](https://github.com/anthropics/claude-code)**

<img src="./demo.gif" />

---

## Get started

> [!NOTE]
> This fork runs against **Ollama** (local, free) or **OpenRouter** (cloud). The standard Anthropic API setup still works — see [official setup docs](https://code.claude.com/docs/en/setup).

### Install Claude Code (upstream CLI)

**macOS / Linux (Recommended):**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Homebrew (macOS / Linux):**
```bash
brew install --cask claude-code
```

**Windows (Recommended):**
```powershell
irm https://claude.ai/install.ps1 | iex
```

**WinGet (Windows):**
```powershell
winget install Anthropic.ClaudeCode
```

**NPM (Deprecated):**
```bash
npm install -g @anthropic-ai/claude-code
```

Navigate to your project and run `claude`.

---

## Running with local models (this fork)

This fork routes Claude Code through Ollama or OpenRouter instead of the Anthropic API. The CLI itself is unchanged — only the backend endpoint and auth token differ.

### Ollama (local, free, offline)

> Requires **Ollama v0.14.0+** and **Claude Code v2.1.12+**

**1. Install Ollama:**
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

**2. Pull a model:**
```bash
ollama pull llama3.2
# recommended for coding tasks:
ollama pull qwen2.5-coder:7b
```

**3. Start the server:**
```bash
ollama serve
```

**4. Launch Claude Code against Ollama:**
```bash
ANTHROPIC_AUTH_TOKEN=ollama \
ANTHROPIC_BASE_URL=http://localhost:11434 \
claude --model llama3.2
```

**Persistent setup** — add to `~/.zshrc` or `~/.bashrc`:
```bash
export ANTHROPIC_AUTH_TOKEN="ollama"
export ANTHROPIC_BASE_URL="http://localhost:11434"
```
Then just run `claude` after `ollama serve`.

---

### OpenRouter (cloud, multi-model)

> Get your API key at [openrouter.ai/keys](https://openrouter.ai/keys)

```bash
ANTHROPIC_AUTH_TOKEN=your-openrouter-api-key \
ANTHROPIC_BASE_URL=https://openrouter.ai/api/v1 \
claude --model anthropic/claude-3.5-sonnet
```

Browse all supported models at [openrouter.ai/models](https://openrouter.ai/models).

---

## Fork changes vs upstream

| | [anthropics/claude-code](https://github.com/anthropics/claude-code) | [lily0ng/claude-code](https://github.com/lily0ng/claude-code) |
|---|---|---|
| Backend | Anthropic API | Ollama · OpenRouter · Anthropic API |
| Billing | Pay-per-token | Free (local) / OpenRouter pricing |
| Offline | ✗ | ✓ via Ollama |
| Theme | Default | vxrt red/black (`/theme → vxrt`) |

---

## Development (from source)

```bash
# Clone this fork
git clone https://github.com/lily0ng/claude-code.git
cd claude-code

# Install dependencies
npm install
# or (recommended)
bun install

# Run from source
bun run dev

# Build
bun run build   # → dist/
```

### npm scripts

| Command | Description |
|---|---|
| `npm run start` | Run via Bun |
| `npm run dev` | Development mode |
| `npm run build` | Bundle to `dist/` |

---

## Plugins

This repository includes Claude Code plugins that extend functionality with custom commands and agents. See the [plugins directory](./plugins/) for available plugins.

---

## Branches

| Branch | Purpose |
|---|---|
| `main` | Stable |
| `dev` | Development / integration |
| `feat/ollama-integration` | Local Ollama backend |
| `feat/openrouter-integration` | OpenRouter cloud backend |
| `feat/themes` | Custom vxrt theme |
| `feat/ui-branding` | UI patches |

---

## Community & support (upstream)

- 📖 [Official docs](https://code.claude.com/docs/en/overview)
- 💬 [Claude Developers Discord](https://anthropic.com/discord)
- 🐛 [Report bugs](https://github.com/anthropics/claude-code/issues) — use `/bug` inside Claude Code
- 📦 [npm package](https://www.npmjs.com/package/@anthropic-ai/claude-code)

---

## Credits & attribution

This fork exists thanks to the exceptional work of the Anthropic team. Full credit for the core product, architecture, and design belongs to them.

- **Original project**: [Claude Code](https://github.com/anthropics/claude-code) by [Anthropic](https://anthropic.com)
- **Original authors**: The Claude Code team at Anthropic — see [CHANGELOG.md](./CHANGELOG.md) for full history
- **License**: [See LICENSE.md](./LICENSE.md) — this fork inherits the upstream license
- **Local model runtime**: [Ollama](https://ollama.com)
- **Cloud model routing**: [OpenRouter](https://openrouter.ai)
- **Fork maintainer**: [@lily0ng](https://github.com/lily0ng)

> Claude Code and the Claude name are trademarks of Anthropic, PBC. This fork is an independent, unofficial project.
