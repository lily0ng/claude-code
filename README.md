# Claude Code

![](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=flat-square) [![npm]](https://www.npmjs.com/package/@anthropic-ai/claude-code) ![](https://img.shields.io/badge/fork-anthropics%2Fclaude--code-orange?style=flat-square) ![](https://img.shields.io/badge/local-Ollama-black?style=flat-square) ![](https://img.shields.io/badge/cloud-OpenRouter-purple?style=flat-square)

[npm]: https://img.shields.io/npm/v/@anthropic-ai/claude-code.svg?style=flat-square

> **This is a personal fork** of [Anthropic's Claude Code](https://github.com/anthropics/claude-code) by [@lily0ng](https://github.com/lily0ng), extended to support local models via **Ollama** and cloud models via **OpenRouter** — with no Anthropic API billing required. All core functionality, architecture, and intellectual property belongs to [Anthropic](https://anthropic.com). This fork is not affiliated with or endorsed by Anthropic.

Claude Code is an agentic coding tool that lives in your terminal, understands your codebase, and helps you code faster by executing routine tasks, explaining complex code, and handling git workflows — all through natural language commands.

**Learn more in the [official documentation](https://code.claude.com/docs/en/overview)** · **Original repo: [anthropics/claude-code](https://github.com/anthropics/claude-code)**

<img src="./demo.gif" />

---

## Architecture

### 1 · Claude Code Architecture Diagram

> Full component map derived from `src/` — shows how the CLI, coordinator, tools, services, and UI layer connect.

```mermaid
graph TD
    subgraph Entry["🚀 Entry Point"]
        MAIN["src/main.tsx\nCLI bootstrap"]
        CLI["src/cli/\nArg parsing · Handlers · Transports"]
    end

    subgraph Core["⚙️ Core Engine"]
        COORD["src/coordinator/\nCoordinator Mode"]
        ASSIST["src/assistant/\nGate · Session Discovery · Index"]
        QUERY["src/query/\nQuery Engine · Transitions"]
        CONTEXT["src/context/\nSystem · User · Stats"]
        STATE["src/state/\nApp State Store · Store · onChange"]
    end

    subgraph Tools["🔧 Tool Layer (30+)"]
        direction TB
        T_FILE["File\nFileRead · FileWrite · FileEdit\nGlob · Grep · Notebook"]
        T_SHELL["Shell\nBash · PowerShell · REPL"]
        T_WEB["Web\nWebFetch · WebSearch"]
        T_AGENT["Agent\nAgentTool · SendMessage\nAskUserQuestion"]
        T_TASK["Task\nTaskCreate · TaskGet · TaskList\nTaskOutput · TaskStop · TaskUpdate"]
        T_PLAN["Plan\nEnterPlanMode · ExitPlanMode\nEnterWorktree · ExitWorktree"]
        T_MCP["MCP\nMCPTool · ListMcpResources\nReadMcpResource · McpAuth"]
        T_UTIL["Utility\nTodoWrite · ToolSearch · Sleep\nSkill · Config · Brief"]
    end

    subgraph Services["🛠 Services"]
        SVC_API["api/\nBootstrap · FilesApi · Referral"]
        SVC_MCP["mcp/\nClient · Config · Types · Utils"]
        SVC_ANAL["analytics/\nGrowthBook · Sink · Config"]
        SVC_PLUG["plugins/\nPluginCliCommands"]
        SVC_LSP["lsp/ · compact/\nAgentSummary · MagicDocs"]
        SVC_OAUTH["oauth/ · settingsSync/\npolicyLimits · tips/"]
    end

    subgraph UI["🖥 Terminal UI (Ink/React)"]
        INK["src/ink/\nRoot · Render · Ansi · Instances"]
        COMP["src/components/\nPromptInput · Settings · Spinner\nStructuredDiff · HelpV2 · LogoV2\nHighlightedCode · TrustDialog"]
        SCREENS["src/screens/\nWelcome · Error · Setup"]
    end

    subgraph Plugins["🧩 Plugins & Skills"]
        PLG["plugins/\ncode-review · feature-dev\nfrontend-design · security-guidance\npr-review-toolkit · hookify"]
        SKL["src/skills/bundled/\nBuilt-in skill registry"]
        AGENTS[".claude/agents/\npentesting-web-security-automation"]
    end

    subgraph Backend["☁️ Model Backend"]
        BRIDGE["src/bridge/\nBridge Main · Bridge Enabled\nTrusted Device"]
        OLAMA["Ollama\nlocalhost:11434"]
        OPENR["OpenRouter\nopenrouter.ai/api/v1"]
        ANTHR["Anthropic API\napi.anthropic.com"]
    end

    MAIN --> CLI
    CLI --> COORD
    COORD --> ASSIST
    COORD --> QUERY
    COORD --> CONTEXT
    COORD --> STATE
    ASSIST --> Tools
    QUERY --> Tools
    Tools --> Services
    Tools --> BRIDGE
    BRIDGE --> OLAMA
    BRIDGE --> OPENR
    BRIDGE --> ANTHR
    CLI --> UI
    UI --> INK
    INK --> COMP
    INK --> SCREENS
    COORD --> Plugins
```

---

### 2 · System Design — Request Flow

> Sequence of events from a user prompt to a model response, including tool execution loops.

```mermaid
sequenceDiagram
    actor User
    participant Term as Terminal
    participant Main as main.tsx
    participant Coord as Coordinator
    participant Tools as Tool Layer
    participant Bridge as API Bridge
    participant Backend as Model Backend<br/>(Ollama / OpenRouter / Anthropic)
    participant FS as Filesystem / Shell

    User->>Term: types prompt
    Term->>Main: stdin input
    Main->>Main: parse CLI args<br/>load settings.json<br/>resolve ANTHROPIC_BASE_URL

    Main->>Coord: initSession(context, model)
    Coord->>Backend: POST /v1/messages<br/>{model, messages, tools[]}

    loop Agentic tool-use loop
        Backend-->>Coord: response {content, stop_reason}
        alt stop_reason = tool_use
            Coord->>Tools: dispatch(tool_name, input)
            alt File Tool
                Tools->>FS: read / write / edit file
                FS-->>Tools: result
            else Bash Tool
                Tools->>FS: exec shell command
                FS-->>Tools: stdout / stderr
            else Web Tool
                Tools->>Backend: fetch URL / search
                Backend-->>Tools: content
            else Agent Tool
                Tools->>Coord: spawn sub-agent
                Coord-->>Tools: sub-agent result
            end
            Tools-->>Coord: tool_result
            Coord->>Backend: POST /v1/messages<br/>{tool_result}
        else stop_reason = end_turn
            Coord-->>Main: final response
        end
    end

    Main->>Term: render via Ink/React TUI
    Term-->>User: formatted output
```

---

### 3 · Tool System Architecture

> All 30+ tools grouped by category, from `src/tools/`.

```mermaid
graph LR
    subgraph FILE["📁 File Tools"]
        FR["FileReadTool"]
        FW["FileWriteTool"]
        FE["FileEditTool"]
        GL["GlobTool"]
        GR["GrepTool"]
        NB["NotebookEditTool"]
    end

    subgraph SHELL["💻 Shell Tools"]
        BT["BashTool"]
        PS["PowerShellTool"]
        RP["REPLTool"]
    end

    subgraph WEB["🌐 Web Tools"]
        WF["WebFetchTool"]
        WS["WebSearchTool"]
    end

    subgraph AGENT["🤖 Agent Tools"]
        AT["AgentTool"]
        SM["SendMessageTool"]
        AQ["AskUserQuestionTool"]
        BR["BriefTool"]
    end

    subgraph TASK["📋 Task Tools"]
        TC["TaskCreateTool"]
        TG["TaskGetTool"]
        TL["TaskListTool"]
        TO["TaskOutputTool"]
        TS["TaskStopTool"]
        TU["TaskUpdateTool"]
    end

    subgraph PLAN["🗂 Plan / Worktree Tools"]
        EP["EnterPlanModeTool"]
        XP["ExitPlanModeTool"]
        EW["EnterWorktreeTool"]
        XW["ExitWorktreeTool"]
    end

    subgraph MCP["🔌 MCP Tools"]
        MT["MCPTool"]
        LM["ListMcpResourcesTool"]
        RM["ReadMcpResourceTool"]
        MA["McpAuthTool"]
        RT["RemoteTriggerTool"]
    end

    subgraph UTIL["🛠 Utility Tools"]
        TW["TodoWriteTool"]
        TS2["ToolSearchTool"]
        SK["SkillTool"]
        CF["ConfigTool"]
        SL["SleepTool"]
        SC["ScheduleCronTool"]
        TM["TeamCreateTool / TeamDeleteTool"]
        SY["SyntheticOutputTool"]
        LS["LSPTool"]
    end

    CORE["Coordinator\nsrc/coordinator/"] --> FILE
    CORE --> SHELL
    CORE --> WEB
    CORE --> AGENT
    CORE --> TASK
    CORE --> PLAN
    CORE --> MCP
    CORE --> UTIL
```

---

### 4 · Backend Model Routing (This Fork)

> How `ANTHROPIC_BASE_URL` routes Claude Code to different model backends.

```mermaid
flowchart TD
    START(["`**claude** command`"])
    ENV{"`Read env vars
    ANTHROPIC_AUTH_TOKEN
    ANTHROPIC_BASE_URL`"}

    START --> ENV

    ENV --> CHECK{"`What is
    BASE_URL?`"}

    CHECK -->|"http://localhost:11434"| OLLAMA
    CHECK -->|"https://openrouter.ai/api/v1"| OPENROUTER
    CHECK -->|"https://api.anthropic.com"| ANTHROPIC

    subgraph OLLAMA["🖥 Ollama — Local Free"]
        OL_AUTH["AUTH_TOKEN = ollama"]
        OL_SRV["ollama serve\nlocalhost:11434"]
        OL_MOD["Local Models\nllama3.2 · qwen2.5-coder:7b\ndeepseek-r1 · mistral"]
        OL_AUTH --> OL_SRV --> OL_MOD
    end

    subgraph OPENROUTER["☁️ OpenRouter — Cloud Multi-Model"]
        OR_AUTH["AUTH_TOKEN = sk-or-…"]
        OR_API["openrouter.ai/api/v1"]
        OR_MOD["200+ Models\nanthropic/claude-3.5-sonnet\nopenai/gpt-4o · google/gemini-pro\nmeta-llama/llama-3.1-405b"]
        OR_AUTH --> OR_API --> OR_MOD
    end

    subgraph ANTHROPIC["🔑 Anthropic API — Official"]
        AN_AUTH["AUTH_TOKEN = sk-ant-…"]
        AN_API["api.anthropic.com/v1"]
        AN_MOD["Claude Models\nclaude-opus-4 · claude-sonnet-4\nclaude-haiku-3.5"]
        AN_AUTH --> AN_API --> AN_MOD
    end

    OL_MOD --> RESP
    OR_MOD --> RESP
    AN_MOD --> RESP

    RESP(["Response → Coordinator → TUI"])
```

---

### 5 · Plugin & Skills System

> Plugin architecture from `plugins/` and `src/skills/`, including the custom agent in `.claude/agents/`.

```mermaid
graph TD
    subgraph REGISTRY["📦 Plugin Registry"]
        MPL["Official Marketplace\nanthropic plugins"]
        LPL["Local Plugins\nplugins/ directory"]
    end

    subgraph PLUGINS["🧩 Bundled Plugins"]
        CR["code-review\nPR analysis · diff review"]
        FD["feature-dev\nFeature planning"]
        FE["frontend-design\nUI/UX guidance"]
        SG["security-guidance\nSecurity review"]
        PR["pr-review-toolkit\nPR workflow"]
        HK["hookify\nHook management"]
        PD["plugin-dev\nPlugin development"]
        CC["commit-commands\nGit commit helpers"]
        RL["ralph-wiggum\nCustom assistant"]
        EO["explanatory-output-style"]
        LO["learning-output-style"]
    end

    subgraph SKILLS["⚡ Skills System"]
        BSK["src/skills/bundled/\nBuilt-in skill index"]
        CSK[".claude/skills/\nCustom skill files"]
        SKLT["SkillTool\nsrc/tools/SkillTool/"]
    end

    subgraph AGENTS["🕵️ Custom Agents"]
        direction TB
        AGDIR[".claude/agents/"]
        PEN["pentesting-web-security-automation.md\nWeb pentest · Recon · Exploit\nReport generation"]
    end

    subgraph HOOKS["🪝 Hooks"]
        HKS["settings.json hooks\npre-tool · post-tool\npre-compact · notification"]
    end

    MPL --> PLUGINS
    LPL --> PLUGINS
    PLUGINS --> SKLT
    BSK --> SKLT
    CSK --> SKLT
    AGDIR --> AGENTS
    SKLT --> COORD["Coordinator"]
    HKS --> COORD
```

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

**NPM (Deprecated):**
```bash
npm install -g @anthropic-ai/claude-code
```

Navigate to your project and run `claude`.

---

## Running with local models (this fork)

### Ollama (local, free, offline)

> Requires **Ollama v0.14.0+** and **Claude Code v2.1.12+**

```bash
# 1. Install Ollama
brew install ollama          # macOS
# or: curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull a model
ollama pull llama3.2
ollama pull qwen2.5-coder:7b   # better for code tasks

# 3. Start server + launch
ollama serve &
ANTHROPIC_AUTH_TOKEN=ollama \
ANTHROPIC_BASE_URL=http://localhost:11434 \
claude --model llama3.2
```

**Persistent setup** — add to `~/.zshrc`:
```bash
export ANTHROPIC_AUTH_TOKEN="ollama"
export ANTHROPIC_BASE_URL="http://localhost:11434"
```

**npm shortcuts:**
```bash
npm run setup   # pull llama3.2
npm run dev     # launch with Ollama
```

---

### OpenRouter (cloud, multi-model)

```bash
ANTHROPIC_AUTH_TOKEN=your-openrouter-key \
ANTHROPIC_BASE_URL=https://openrouter.ai/api/v1 \
claude --model anthropic/claude-3.5-sonnet
```

Get your key at [openrouter.ai/keys](https://openrouter.ai/keys) · browse models at [openrouter.ai/models](https://openrouter.ai/models).

---

## Fork changes vs upstream

| | [anthropics/claude-code](https://github.com/anthropics/claude-code) | [lily0ng/claude-code](https://github.com/lily0ng/claude-code) |
|---|---|---|
| Backend | Anthropic API only | Ollama · OpenRouter · Anthropic API |
| Billing | Pay-per-token | Free (local) / OpenRouter pricing |
| Offline | ✗ | ✓ via Ollama |
| Theme | Default blue | vxrt red/black (`/theme → vxrt`) |
| Agents | — | pentesting-web-security-automation |

---

## npm scripts

| Command | Description |
|---|---|
| `npm run dev` | Launch claude via Ollama (llama3.2) |
| `npm run start` | Launch claude via Ollama (default model) |
| `npm run setup` | Pull llama3.2 model |
| `npm run ollama:serve` | Start Ollama server |
| `npm run ollama:list` | List local models |
| `npm run openrouter` | Launch claude (reads env vars) |

---

## Plugins

Bundled plugins in `plugins/` extend Claude Code with custom slash commands and agents:

| Plugin | Purpose |
|---|---|
| `code-review` | PR diff analysis |
| `feature-dev` | Feature planning workflow |
| `frontend-design` | UI/UX guidance |
| `security-guidance` | Security review |
| `pr-review-toolkit` | Full PR review workflow |
| `hookify` | Hook configuration |
| `commit-commands` | Git commit helpers |

See the [plugins directory](./plugins/) for full documentation.

---

## Branches

| Branch | Purpose |
|---|---|
| `main` | Stable release |
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
