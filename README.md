<div align="center">
  <img src="./logo.svg" width="120" height="120" alt="vxrt code logo" />
  <h1>Claude Code</h1>
  <p><em>Fork · Local Models · No API Billing</em></p>

  ![](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=for-the-badge&logo=node.js&logoColor=white)
  [![npm](https://img.shields.io/npm/v/@anthropic-ai/claude-code.svg?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/@anthropic-ai/claude-code)
  ![](https://img.shields.io/badge/fork-anthropics%2Fclaude--code-orange?style=for-the-badge&logo=github&logoColor=white)
  ![](https://img.shields.io/badge/Ollama-local%20free-black?style=for-the-badge&logoColor=white)
  ![](https://img.shields.io/badge/OpenRouter-cloud-7c3aed?style=for-the-badge)
  ![](https://img.shields.io/badge/security-offensive-cc2222?style=for-the-badge&logo=hackthebox&logoColor=white)
</div>

---

> **This is a personal fork** of [Anthropic's Claude Code](https://github.com/anthropics/claude-code) by [@lily0ng](https://github.com/lily0ng), extended to support local models via **Ollama** and cloud models via **OpenRouter** — no Anthropic API billing required. All core functionality and IP belongs to [Anthropic](https://anthropic.com). This fork is not affiliated with or endorsed by Anthropic.

Claude Code is an agentic coding tool that lives in your terminal, understands your codebase, and helps you code faster through natural language commands.

**[Official Docs](https://code.claude.com/docs/en/overview)** · **[Upstream Repo](https://github.com/anthropics/claude-code)** · **[npm](https://www.npmjs.com/package/@anthropic-ai/claude-code)**

<img src="./demo.gif" width="100%" />

---

## Features

### ✅ Supported in this fork

| Feature | Description |
|---|---|
| 🧠 Natural language coding | Ask in plain English — claude reads and edits your code |
| 📁 File read / write / edit | Full file system access via `FileReadTool`, `FileWriteTool`, `FileEditTool` |
| 🔍 Code search | `GlobTool` + `GrepTool` — find files and patterns across the repo |
| 💻 Shell execution | Run any bash/shell command via `BashTool` |
| 🔀 Git workflow | Commit, diff, branch, PR — git operations via shell |
| 🤖 Agentic sub-agents | `AgentTool` spawns parallel sub-agents for complex tasks |
| 📋 Task management | Create, list, stop tasks — full `TaskTool` suite |
| 📝 Todo tracking | `TodoWriteTool` — persistent task lists per session |
| 🗂 Plan mode | Enter plan-first mode before executing (`EnterPlanModeTool`) |
| 🌿 Worktree support | Git worktree isolation (`EnterWorktreeTool`) |
| 🔌 MCP servers | Connect external tools via Model Context Protocol |
| 🧩 Plugins | Slash-command plugins: code-review, feature-dev, security-guidance |
| ⚡ Skills | Custom skill files loaded at session start |
| 🕵️ Custom agents | `.claude/agents/` — domain-specific agent definitions |
| 🌐 Web fetch | `WebFetchTool` — fetch URLs (model-dependent) |
| 🔎 Web search | `WebSearchTool` — search the web (model-dependent) |
| 🎨 Custom theme | vxrt red/black theme (`/theme → vxrt`) |
| 📓 Notebook editing | Jupyter notebook cell editing via `NotebookEditTool` |
| 🖥 Offline mode | Full local operation — no internet needed (Ollama) |
| 🔒 No billing | Free with Ollama / OpenRouter pay-as-you-go |

### ❌ Not supported / limited in this fork

| Feature | Reason |
|---|---|
| 🔑 Anthropic OAuth login | Requires Anthropic account — not needed for Ollama/OpenRouter |
| 💳 Usage billing dashboard | Anthropic-only; use OpenRouter dashboard instead |
| 🧠 Extended thinking | Claude-specific feature — not available on local models |
| 👁 Vision / image input | Depends on model — llama3.2 does not support images |
| 🔄 Auto model updates | Upstream Anthropic release channel — manual pull needed |
| ☁️ Remote teleport sessions | Requires Anthropic infrastructure |
| 🔗 Claude.ai account sync | Tied to Anthropic account |
| ⚡ Prompt caching | Anthropic API optimization — not applicable to Ollama |
| 📊 Deep research mode | Claude-specific capability |
| 🤝 GitHub app integration | Requires Anthropic-signed GitHub app |

---

## Supported Models

### Ollama — Local Free Models

| Model | Size | Best For | Install |
|---|---|---|---|
| `llama3.2` ⭐ | 2 GB | General coding, chat | `ollama pull llama3.2` |
| `qwen2.5-coder:7b` 🏆 | 4.7 GB | **Recommended: coding** | `ollama pull qwen2.5-coder:7b` |
| `qwen2.5-coder:14b` 🔥 | 9 GB | **Best local coding** | `ollama pull qwen2.5-coder:14b` |
| `qwen2.5-coder:32b` 💪 | 19 GB | Maximum local quality | `ollama pull qwen2.5-coder:32b` |
| `deepseek-coder-v2` | 8.9 GB | Code completion | `ollama pull deepseek-coder-v2` |
| `deepseek-r1:7b` | 4.7 GB | Reasoning + code | `ollama pull deepseek-r1:7b` |
| `codellama:13b` | 7.4 GB | Code focused | `ollama pull codellama:13b` |
| `mistral:7b` | 4.1 GB | Fast general purpose | `ollama pull mistral:7b` |
| `gemma3:9b` | 5.4 GB | Google general purpose | `ollama pull gemma3:9b` |
| `phi4:14b` | 9.1 GB | Microsoft reasoning | `ollama pull phi4:14b` |

> **Currently installed:** `llama3.2:latest` (2.0 GB)

### OpenRouter — Cloud Models

| Model | Best For | Speed | Cost |
|---|---|---|---|
| `anthropic/claude-sonnet-4-5` 🏆 | **Best overall coding** | Medium | $$$ |
| `anthropic/claude-3.5-haiku` ⚡ | Fast coding tasks | Fast | $$ |
| `deepseek/deepseek-coder` 🔥 | **Best free coding** | Fast | Free tier |
| `qwen/qwen-2.5-coder-32b-instruct` | Large code tasks | Medium | $ |
| `openai/gpt-4o` | General purpose | Fast | $$$ |
| `google/gemini-pro-1.5` | Long context | Medium | $$ |
| `meta-llama/llama-3.1-405b-instruct` | Large tasks | Slow | $$ |
| `mistralai/mistral-large` | Code + reasoning | Medium | $$ |

### Recommended for Coding Tasks

```
🏆 Best quality (cloud):  anthropic/claude-sonnet-4-5
🔥 Best free (cloud):     deepseek/deepseek-coder
⚡ Best local fast:        qwen2.5-coder:7b
💪 Best local quality:    qwen2.5-coder:32b  (needs 20GB RAM)
🖥 Currently running:     llama3.2  (installed, ready)
```

---

## How to Run

### Requirements

| Tool | Version | Check |
|---|---|---|
| Claude Code CLI | ≥ 2.1.12 | `claude --version` |
| Ollama | ≥ 0.14.0 | `ollama --version` |
| Node.js | ≥ 18.0.0 | `node --version` |
| Bun (optional) | ≥ 1.0 | `bun --version` |

---

### Step 1 — Install Claude Code CLI

```bash
# macOS / Linux
curl -fsSL https://claude.ai/install.sh | bash

# macOS (Homebrew)
brew install --cask claude-code

# Windows
irm https://claude.ai/install.ps1 | iex

# Verify
claude --version   # should show ≥ 2.1.12
```

---

### Step 2A — Run with Ollama (Local, Free)

```bash
# Install Ollama
brew install ollama          # macOS
# Linux: curl -fsSL https://ollama.com/install.sh | sh

# Pull a model (pick one)
ollama pull llama3.2                 # 2GB  — quick start
ollama pull qwen2.5-coder:7b         # 4.7GB — recommended for code
ollama pull deepseek-r1:7b           # 4.7GB — reasoning

# Start Ollama server (keep this terminal open)
ollama serve

# In a new terminal — launch vxrt code
ANTHROPIC_AUTH_TOKEN=ollama \
ANTHROPIC_BASE_URL=http://localhost:11434 \
claude --model llama3.2
```

**Make it permanent** — add to `~/.zshrc` or `~/.bashrc`:
```bash
export ANTHROPIC_AUTH_TOKEN="ollama"
export ANTHROPIC_BASE_URL="http://localhost:11434"
```
Then just:
```bash
ollama serve &          # start server in background
claude --model llama3.2 # or: npm run dev
```

---

### Step 2B — Run with OpenRouter (Cloud)

```bash
# 1. Get API key at: https://openrouter.ai/keys

# 2. Launch
ANTHROPIC_AUTH_TOKEN=your-openrouter-key \
ANTHROPIC_BASE_URL=https://openrouter.ai/api/v1 \
claude --model anthropic/claude-3.5-sonnet
```

**Make it permanent:**
```bash
export ANTHROPIC_AUTH_TOKEN="sk-or-your-key-here"
export ANTHROPIC_BASE_URL="https://openrouter.ai/api/v1"
```

---

### Step 2C — Run with Anthropic API (Official)

```bash
export ANTHROPIC_API_KEY="sk-ant-your-key-here"
claude   # uses claude-sonnet by default
```

---

### npm Shortcuts

```bash
npm run setup         # pull llama3.2 model
npm run dev           # launch with Ollama + llama3.2
npm run start         # launch with Ollama (default model)
npm run ollama:serve  # start Ollama server
npm run ollama:list   # list downloaded models
npm run openrouter    # launch with OpenRouter (reads ANTHROPIC_* env)
```

---

### Verify connection

Once running, inside claude:
```
/status    → check model, base URL, auth token
/model     → switch model
/theme     → select vxrt (red/black theme)
```

Expected `/status` output for Ollama:
```
Auth token:         ollama
Anthropic base URL: http://localhost:11434
Model:              llama3.2
```

---

## Architecture

### 1 · Claude Code — Component Architecture

```mermaid
%%{init: {
  'theme': 'dark',
  'themeVariables': {
    'primaryColor': '#1a0000',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#cc2222',
    'lineColor': '#cc2222',
    'secondaryColor': '#0d0d0d',
    'tertiaryColor': '#1a0000',
    'clusterBkg': '#110000',
    'clusterBorder': '#cc2222',
    'titleColor': '#ff4444',
    'edgeLabelBackground': '#0d0d0d',
    'nodeTextColor': '#ffffff'
  }
}}%%
graph TD
    subgraph ENTRY["🚀 Entry Point"]
        MAIN["main.tsx · CLI bootstrap"]
        CLI["src/cli/ · Arg parsing · Handlers · Transports"]
    end

    subgraph CORE["⚙️ Core Engine"]
        COORD["Coordinator\nsrc/coordinator/"]
        ASSIST["Assistant\nsrc/assistant/\nGate · Session Discovery"]
        QUERY["Query Engine\nsrc/query/\nTransitions · Runner"]
        CONTEXT["Context\nsrc/context/\nSystem · User · Stats"]
        STATE["State Store\nsrc/state/\nAppState · Store · onChange"]
    end

    subgraph TOOLS["🔧 Tool Layer  ·  30+ tools"]
        T_FILE["📁 File\nRead · Write · Edit · Glob · Grep"]
        T_SHELL["💻 Shell\nBash · PowerShell · REPL"]
        T_WEB["🌐 Web\nWebFetch · WebSearch"]
        T_AGENT["🤖 Agent\nAgentTool · SendMessage · AskUser"]
        T_TASK["📋 Task\nCreate · Get · List · Output · Stop"]
        T_PLAN["🗂 Plan\nEnterPlanMode · Worktree"]
        T_MCP["🔌 MCP\nMCPTool · ListResources · Auth"]
        T_UTIL["🛠 Utility\nTodoWrite · ToolSearch · Skill"]
    end

    subgraph SERVICES["🛠 Services"]
        SVC_API["api/\nBootstrap · FilesApi · Referral"]
        SVC_MCP["mcp/\nClient · Config · Types · Utils"]
        SVC_ANAL["analytics/\nGrowthBook · Sink"]
        SVC_LSP["lsp/ · compact/ · AgentSummary"]
        SVC_OAUTH["oauth/ · settingsSync/ · tips/"]
    end

    subgraph UI["🖥 Terminal UI  ·  Ink / React"]
        INK["src/ink/\nRoot · Render · Ansi"]
        COMP["src/components/\nPromptInput · Settings · Spinner\nStructuredDiff · LogoV2 · HelpV2"]
        SCREENS["src/screens/\nWelcome · Error · Setup"]
    end

    subgraph PLUGINS["🧩 Plugins & Skills"]
        PLG["plugins/\ncode-review · feature-dev\nsecurity-guidance · hookify"]
        SKL["src/skills/bundled/"]
        AGENTS[".claude/agents/\npentesting-web-security"]
    end

    subgraph BACKEND["☁️ Model Backend"]
        BRIDGE["src/bridge/\nBridgeMain · BridgeEnabled"]
        OL["🖥 Ollama\nlocalhost:11434"]
        OR["☁️ OpenRouter\nopenrouter.ai/api/v1"]
        AN["🔑 Anthropic API\napi.anthropic.com"]
    end

    MAIN --> CLI --> COORD
    COORD --> ASSIST & QUERY & CONTEXT & STATE
    ASSIST & QUERY --> TOOLS
    TOOLS --> SERVICES & BRIDGE
    BRIDGE --> OL & OR & AN
    CLI --> UI
    UI --> INK --> COMP & SCREENS
    COORD --> PLUGINS
```

---

### 2 · System Design — Request Flow

```mermaid
%%{init: {
  'theme': 'dark',
  'themeVariables': {
    'primaryColor': '#1a0000',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#cc2222',
    'lineColor': '#cc2222',
    'secondaryColor': '#110000',
    'actorBkg': '#1a0000',
    'actorBorder': '#cc2222',
    'actorTextColor': '#ffffff',
    'actorLineColor': '#cc2222',
    'signalColor': '#cc2222',
    'signalTextColor': '#ffffff',
    'labelBoxBkgColor': '#0d0d0d',
    'labelBoxBorderColor': '#cc2222',
    'labelTextColor': '#ffffff',
    'loopTextColor': '#ffffff',
    'noteBorderColor': '#cc2222',
    'noteBkgColor': '#1a0000',
    'noteTextColor': '#ffffff',
    'activationBorderColor': '#ff2222',
    'activationBkgColor': '#330000',
    'sequenceNumberColor': '#ffffff'
  }
}}%%
sequenceDiagram
    actor User
    participant Term as Terminal
    participant Main as main.tsx
    participant Coord as Coordinator
    participant Tools as Tool Layer
    participant Bridge as API Bridge
    participant Backend as Model Backend<br/>(Ollama · OpenRouter · Anthropic)
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
            else Agent Tool
                Tools->>Coord: spawn sub-agent
                Coord-->>Tools: sub-agent result
            end
            Tools-->>Coord: tool_result
            Coord->>Backend: POST /v1/messages {tool_result}
        else stop_reason = end_turn
            Coord-->>Main: final response
        end
    end

    Main->>Term: render via Ink/React TUI
    Term-->>User: formatted output
```

---

### 3 · Tool System — Category Map

```mermaid
%%{init: {
  'theme': 'dark',
  'themeVariables': {
    'primaryColor': '#1a0000',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#cc2222',
    'lineColor': '#cc2222',
    'clusterBkg': '#110000',
    'clusterBorder': '#cc2222',
    'titleColor': '#ff4444',
    'nodeTextColor': '#ffffff',
    'edgeLabelBackground': '#0d0d0d'
  }
}}%%
graph LR
    CORE(["⚙️ Coordinator"]):::core

    subgraph FILE["📁 File Tools"]
        FR["FileReadTool"]:::tool
        FW["FileWriteTool"]:::tool
        FE["FileEditTool"]:::tool
        GL["GlobTool"]:::tool
        GR["GrepTool"]:::tool
        NB["NotebookEditTool"]:::tool
    end

    subgraph SHELL["💻 Shell Tools"]
        BT["BashTool"]:::tool
        PS["PowerShellTool"]:::tool
        RP["REPLTool"]:::tool
    end

    subgraph WEB["🌐 Web Tools"]
        WF["WebFetchTool"]:::tool
        WS["WebSearchTool"]:::tool
    end

    subgraph AGENT["🤖 Agent Tools"]
        AT["AgentTool"]:::tool
        SM["SendMessageTool"]:::tool
        AQ["AskUserQuestionTool"]:::tool
        BR["BriefTool"]:::tool
    end

    subgraph TASK["📋 Task Tools"]
        TC["TaskCreateTool"]:::tool
        TG["TaskGetTool"]:::tool
        TL["TaskListTool"]:::tool
        TO["TaskOutputTool"]:::tool
        TS["TaskStopTool"]:::tool
        TU["TaskUpdateTool"]:::tool
    end

    subgraph PLAN["🗂 Plan Tools"]
        EP["EnterPlanModeTool"]:::tool
        XP["ExitPlanModeTool"]:::tool
        EW["EnterWorktreeTool"]:::tool
        XW["ExitWorktreeTool"]:::tool
    end

    subgraph MCP["🔌 MCP Tools"]
        MT["MCPTool"]:::tool
        LM["ListMcpResourcesTool"]:::tool
        RM["ReadMcpResourceTool"]:::tool
        MA["McpAuthTool"]:::tool
        RT["RemoteTriggerTool"]:::tool
    end

    subgraph UTIL["🛠 Utility Tools"]
        TW["TodoWriteTool"]:::tool
        TS2["ToolSearchTool"]:::tool
        SK["SkillTool"]:::tool
        CF["ConfigTool"]:::tool
        SL["SleepTool"]:::tool
        SC["ScheduleCronTool"]:::tool
        LS["LSPTool"]:::tool
        SY["SyntheticOutputTool"]:::tool
    end

    CORE --> FILE & SHELL & WEB & AGENT
    CORE --> TASK & PLAN & MCP & UTIL

    classDef core fill:#cc2222,stroke:#ff4444,color:#fff,font-weight:bold
    classDef tool fill:#1a0000,stroke:#cc2222,color:#ffffff
```

---

### 4 · Backend Model Routing

```mermaid
%%{init: {
  'theme': 'dark',
  'themeVariables': {
    'primaryColor': '#1a0000',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#cc2222',
    'lineColor': '#cc2222',
    'clusterBkg': '#110000',
    'clusterBorder': '#882222',
    'titleColor': '#ff4444',
    'nodeTextColor': '#ffffff',
    'edgeLabelBackground': '#0d0d0d'
  }
}}%%
flowchart TD
    START(["`**claude** command`"]):::entry
    ENV{"`Read env vars
    **ANTHROPIC_AUTH_TOKEN**
    **ANTHROPIC_BASE_URL**`"}:::decision

    START --> ENV

    ENV -->|"localhost:11434"| OLLAMA
    ENV -->|"openrouter.ai/api/v1"| OPENROUTER
    ENV -->|"api.anthropic.com"| ANTHROPIC

    subgraph OLLAMA["🖥  Ollama — Local · Free · Offline"]
        OA["AUTH_TOKEN = ollama"]:::localnode
        OS["ollama serve · localhost:11434"]:::localnode
        OM["llama3.2 · qwen2.5-coder:7b\ndeepseek-r1 · mistral · gemma3"]:::localnode
        OA --> OS --> OM
    end

    subgraph OPENROUTER["☁️  OpenRouter — Cloud · 200+ Models"]
        RA["AUTH_TOKEN = sk-or-…"]:::cloudnode
        RP["openrouter.ai/api/v1"]:::cloudnode
        RM["claude-sonnet · gpt-4o\ngemini-pro · deepseek-coder"]:::cloudnode
        RA --> RP --> RM
    end

    subgraph ANTHROPIC["🔑  Anthropic — Official Claude Models"]
        AA["AUTH_TOKEN = sk-ant-…"]:::anthropicnode
        AP["api.anthropic.com/v1"]:::anthropicnode
        AM["claude-opus-4 · claude-sonnet-4\nclaude-haiku-3.5"]:::anthropicnode
        AA --> AP --> AM
    end

    OM & RM & AM --> RESP(["Response → Coordinator → TUI"]):::entry

    classDef entry fill:#cc2222,stroke:#ff4444,color:#fff,font-weight:bold
    classDef decision fill:#330000,stroke:#cc2222,color:#fff
    classDef localnode fill:#0d1a00,stroke:#44aa22,color:#ffffff
    classDef cloudnode fill:#0a0020,stroke:#7c3aed,color:#ffffff
    classDef anthropicnode fill:#1a1000,stroke:#cc8822,color:#ffffff
```

---

### 5 · Plugin & Skills System

```mermaid
%%{init: {
  'theme': 'dark',
  'themeVariables': {
    'primaryColor': '#1a0000',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#cc2222',
    'lineColor': '#cc2222',
    'clusterBkg': '#110000',
    'clusterBorder': '#cc2222',
    'titleColor': '#ff4444',
    'nodeTextColor': '#ffffff',
    'edgeLabelBackground': '#0d0d0d'
  }
}}%%
graph TD
    subgraph REG["📦 Plugin Registry"]
        MPL["Official Marketplace"]:::regnode
        LPL["Local  plugins/  dir"]:::regnode
    end

    subgraph PLUGINS["🧩 Bundled Plugins"]
        CR["code-review\nPR analysis · diff review"]:::plugin
        FD["feature-dev\nFeature planning"]:::plugin
        FE["frontend-design\nUI/UX guidance"]:::plugin
        SG["security-guidance\n⚔️ Security review"]:::plugin
        PR["pr-review-toolkit\nPR workflow"]:::plugin
        HK["hookify\nHook management"]:::plugin
        PD["plugin-dev · agent-sdk-dev"]:::plugin
        CC["commit-commands\nGit helpers"]:::plugin
    end

    subgraph SKILLS["⚡ Skills"]
        BSK["src/skills/bundled/\nBuilt-in skill index"]:::skill
        CSK[".claude/skills/\nCustom skills"]:::skill
        SKLT["SkillTool\nsrc/tools/SkillTool/"]:::skill
    end

    subgraph AGENTS["🕵️ Custom Agents"]
        AGDIR[".claude/agents/"]:::agent
        PEN["pentesting-web-security-automation\n• Web recon · Exploit chains\n• Vuln scanning · Report gen\n• OWASP Top 10 coverage"]:::agent
    end

    subgraph HOOKS["🪝 Hooks  ·  settings.json"]
        HK1["PreToolUse"]:::hook
        HK2["PostToolUse"]:::hook
        HK3["PreCompact"]:::hook
        HK4["Notification"]:::hook
    end

    MPL & LPL --> PLUGINS
    PLUGINS --> SKLT
    BSK & CSK --> SKLT
    AGDIR --> PEN
    SKLT --> COORD(["Coordinator"]):::core
    HK1 & HK2 & HK3 & HK4 --> COORD

    classDef core fill:#cc2222,stroke:#ff4444,color:#fff,font-weight:bold
    classDef regnode fill:#1a0000,stroke:#cc2222,color:#fff
    classDef plugin fill:#0d0020,stroke:#7c3aed,color:#fff
    classDef skill fill:#001a0d,stroke:#22aa66,color:#fff
    classDef agent fill:#1a0a00,stroke:#cc6622,color:#fff
    classDef hook fill:#0d0d0d,stroke:#888888,color:#aaa
```

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

## Plugins

| Plugin | Purpose |
|---|---|
| `code-review` | PR diff analysis |
| `feature-dev` | Feature planning workflow |
| `frontend-design` | UI/UX guidance |
| `security-guidance` | Security review & hardening |
| `pr-review-toolkit` | Full PR review workflow |
| `hookify` | Hook configuration |
| `commit-commands` | Git commit helpers |
| `agent-sdk-dev` | Agent SDK development |

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

## Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/lily0ng">
        <img src="https://github.com/lily0ng.png" width="80" height="80" style="border-radius:50%;border:2px solid #cc2222" alt="lily0ng" /><br/>
        <sub><b>lily0ng</b></sub>
      </a><br/>
      <sub>Fork Maintainer<br/>Config &amp; Integration</sub>
    </td>
    <td align="center">
      <a href="https://github.com/0xff0ay">
        <img src="https://github.com/0xff0ay.png" width="80" height="80" style="border-radius:50%;border:2px solid #cc2222" alt="0xff0ay" /><br/>
        <sub><b>0xff0ay</b></sub>
      </a><br/>
      <sub>Senior Offensive Security Engineer ( Hacker )<br/>Zero Day Researcher · VXRT, USA</sub>
    </td>
  </tr>
</table>

---

## Collaborators

| Handle | Role | Links |
|---|---|---|
| [@lily0ng](https://github.com/lily0ng) | Fork Maintainer · Integration | [GitHub](https://github.com/lily0ng) |
| [@0xff0ay](https://github.com/0xff0ay) | Senior Offensive Security Engineer ( Hacker ) · Zero Day Researcher · VXRT, USA | [GitHub](https://github.com/0xff0ay) · [Offensive-Security](https://github.com/0xff0ay/Offensive-Security) · [HTB](https://github.com/0xff0ay/HTB) |

---

## Community & support

- 📖 [Official docs](https://code.claude.com/docs/en/overview)
- 💬 [Claude Developers Discord](https://anthropic.com/discord)
- 🐛 [Report upstream bugs](https://github.com/anthropics/claude-code/issues)
- 📦 [npm package](https://www.npmjs.com/package/@anthropic-ai/claude-code)

---

## Credits & attribution

- **Original project**: [Claude Code](https://github.com/anthropics/claude-code) by [Anthropic](https://anthropic.com)
- **Original authors**: The Claude Code team at Anthropic — see [CHANGELOG.md](./CHANGELOG.md)
- **License**: [LICENSE.md](./LICENSE.md) — this fork inherits the upstream license
- **Local runtime**: [Ollama](https://ollama.com)
- **Cloud routing**: [OpenRouter](https://openrouter.ai)
- **Fork maintainer**: [@lily0ng](https://github.com/lily0ng)
- **Security contributor**: [@0xff0ay](https://github.com/0xff0ay) — Senior Offensive Security Engineer ( Hacker ) · Zero Day Researcher · VXRT, USA

> Claude Code and the Claude name are trademarks of Anthropic, PBC. This fork is an independent, unofficial project.
