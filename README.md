<div align="center">
  <img src="./logo.svg" width="140" height="140" alt="vxrt code logo" />
  <h1>Claude Code</h1>
  <p><em>Fork · Local Models · No API Billing</em></p>

  <!-- Row 1 -->
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/></a>
  <a href="https://www.npmjs.com/package/@anthropic-ai/claude-code"><img src="https://img.shields.io/npm/v/@anthropic-ai/claude-code?style=for-the-badge&logo=npm&logoColor=white&label=npm&color=CB3837" alt="npm"/></a>
  <a href="https://github.com/lily0ng/claude-code"><img src="https://img.shields.io/badge/v2.1.109-release-2563eb?style=for-the-badge&logo=github&logoColor=white" alt="version"/></a>
  <a href="https://github.com/anthropics/claude-code"><img src="https://img.shields.io/badge/fork-anthropics%2Fclaude--code-ea580c?style=for-the-badge&logo=github&logoColor=white" alt="fork"/></a>
  <br/>
  <!-- Row 2 -->
  <a href="https://ollama.com"><img src="https://img.shields.io/badge/Ollama-local%20free-111827?style=for-the-badge&logo=ollama&logoColor=white" alt="Ollama"/></a>
  <a href="https://openrouter.ai"><img src="https://img.shields.io/badge/OpenRouter-cloud-7c3aed?style=for-the-badge&logo=openai&logoColor=white" alt="OpenRouter"/></a>
  <a href="https://github.com/0xff0ay"><img src="https://img.shields.io/badge/security-offensive-cc2222?style=for-the-badge&logo=hackthebox&logoColor=white" alt="Offensive Security"/></a>
  <a href="https://github.com/lily0ng/claude-code/blob/main/LICENSE.md"><img src="https://img.shields.io/badge/license-MIT-6b7280?style=for-the-badge&logo=opensourceinitiative&logoColor=white" alt="License"/></a>
</div>

---

> **This is a personal fork** of [Anthropic's Claude Code](https://github.com/anthropics/claude-code) by [@lily0ng](https://github.com/lily0ng), extended to support local models via **Ollama** and cloud models via **OpenRouter** — no Anthropic API billing required. All core functionality and IP belongs to [Anthropic](https://anthropic.com). This fork is not affiliated with or endorsed by Anthropic.

Claude Code is an agentic coding tool that lives in your terminal, understands your codebase, and helps you code faster through natural language commands — file editing, shell execution, git workflows, and multi-agent tasks.

**[Official Docs](https://code.claude.com/docs/en/overview)** · **[Upstream Repo](https://github.com/anthropics/claude-code)** · **[npm](https://www.npmjs.com/package/@anthropic-ai/claude-code)** · **[OpenRouter Models](https://openrouter.ai/models)**

<img src="./demo.gif" width="100%" />

---

## Features

### Supported

| Feature | Description | Status |
|---|---|:---:|
| Natural language coding | Ask in plain English — claude reads, writes and edits code | ✅ |
| File read / write / edit | Full filesystem access via FileReadTool, FileWriteTool, FileEditTool | ✅ |
| Code search | GlobTool and GrepTool — find files and patterns across the repo | ✅ |
| Shell execution | Run any bash/shell command via BashTool | ✅ |
| Git workflow | Commit, diff, branch, PR — all git operations via shell | ✅ |
| Agentic sub-agents | AgentTool spawns parallel sub-agents for complex multi-step tasks | ✅ |
| Task management | Create, list, stop and get output from async tasks | ✅ |
| Todo tracking | TodoWriteTool — persistent task lists per session | ✅ |
| Plan mode | Enter plan-first mode before executing changes | ✅ |
| Worktree isolation | Git worktree support — EnterWorktreeTool / ExitWorktreeTool | ✅ |
| MCP servers | Connect external tools via Model Context Protocol | ✅ |
| Plugins | Slash-command plugins: code-review, feature-dev, security-guidance | ✅ |
| Skills | Custom skill files loaded at session start | ✅ |
| Custom agents | `.claude/agents/` — domain-specific agent definitions | ✅ |
| Web fetch | Fetch and read URLs via WebFetchTool | ✅ |
| Web search | Search the web via WebSearchTool | ✅ |
| Notebook editing | Jupyter notebook cell editing via NotebookEditTool | ✅ |
| Custom theme | vxrt red/black theme — `/theme → vxrt` | ✅ |
| Offline mode | Full local operation with no internet needed (Ollama) | ✅ |
| No billing | Free with Ollama / pay-as-you-go with OpenRouter | ✅ |

### Not Supported / Limited

| Feature | Reason | Status |
|---|---|:---:|
| Anthropic OAuth login | Requires Anthropic account — not needed with Ollama or OpenRouter | ❌ |
| Usage billing dashboard | Anthropic-only — use OpenRouter dashboard for cloud spend tracking | ❌ |
| Extended thinking | Claude-specific capability — unavailable on local models | ❌ |
| Vision / image input | Model-dependent — llama3.2 does not support image input | ⚠️ |
| Auto model updates | Tied to Anthropic release channel — manual `ollama pull` required | ⚠️ |
| Remote teleport sessions | Requires Anthropic infrastructure | ❌ |
| Claude.ai account sync | Tied to Anthropic account system | ❌ |
| Prompt caching | Anthropic API optimization — not applicable to Ollama | ❌ |
| Deep research mode | Claude-specific capability | ❌ |
| GitHub app integration | Requires Anthropic-signed GitHub app | ❌ |

---

## Supported Models

### Ollama — Local Free Models

| Model | Size | Best For | Command |
|---|---|---|---|
| `llama3.2` ⭐ | 2.0 GB | General coding, quick tasks | `ollama pull llama3.2` |
| `qwen2.5-coder:7b` 🏆 | 4.7 GB | **Recommended — coding** | `ollama pull qwen2.5-coder:7b` |
| `qwen2.5-coder:14b` 🔥 | 9.0 GB | **Best mid-range coding** | `ollama pull qwen2.5-coder:14b` |
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
| `anthropic/claude-sonnet-4-5` 🏆 | Best overall coding | Medium | $$$ |
| `anthropic/claude-3.5-haiku` | Fast coding tasks | Fast | $$ |
| `deepseek/deepseek-coder` 🔥 | Best free coding tier | Fast | Free |
| `qwen/qwen-2.5-coder-32b-instruct` | Large code tasks | Medium | $ |
| `openai/gpt-4o` | General purpose | Fast | $$$ |
| `google/gemini-pro-1.5` | Long context tasks | Medium | $$ |
| `meta-llama/llama-3.1-405b-instruct` | Large reasoning | Slow | $$ |
| `mistralai/mistral-large` | Code + reasoning | Medium | $$ |

### Model Recommendations

```
Best quality (cloud)   →  anthropic/claude-sonnet-4-5
Best free (cloud)      →  deepseek/deepseek-coder
Best local fast        →  qwen2.5-coder:7b     (needs ~6GB RAM)
Best local quality     →  qwen2.5-coder:32b    (needs ~22GB RAM)
Currently installed    →  llama3.2             (ready, 2GB)
```

---

## How to Run

### Requirements

| Tool | Min Version | Check |
|---|---|---|
| Claude Code CLI | 2.1.12 | `claude --version` |
| Ollama | 0.14.0 | `ollama --version` |
| Node.js | 18.0.0 | `node --version` |

---

### Step 1 — Install Claude Code CLI

```bash
# macOS / Linux
curl -fsSL https://claude.ai/install.sh | bash

# macOS via Homebrew
brew install --cask claude-code

# Windows (PowerShell)
irm https://claude.ai/install.ps1 | iex

# Verify
claude --version   # expect ≥ 2.1.12
```

---

### Step 2A — Ollama (Local, Free, Offline)

```bash
# Install Ollama
brew install ollama                      # macOS
curl -fsSL https://ollama.com/install.sh | sh  # Linux

# Pull a model
ollama pull llama3.2                     # 2 GB  — quick start
ollama pull qwen2.5-coder:7b             # 4.7 GB — recommended for code

# Start server (keep this running)
ollama serve

# Launch in a new terminal
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
ollama serve &
claude --model llama3.2
```

---

### Step 2B — OpenRouter (Cloud, 200+ Models)

```bash
# Get your key at: https://openrouter.ai/keys

ANTHROPIC_AUTH_TOKEN=your-openrouter-key \
ANTHROPIC_BASE_URL=https://openrouter.ai/api/v1 \
claude --model anthropic/claude-3.5-sonnet
```

**Persistent setup:**
```bash
export ANTHROPIC_AUTH_TOKEN="sk-or-your-key"
export ANTHROPIC_BASE_URL="https://openrouter.ai/api/v1"
```

---

### Step 2C — Anthropic API (Official)

```bash
export ANTHROPIC_API_KEY="sk-ant-your-key"
claude
```

---

### npm Shortcuts

```bash
npm run setup          # pull llama3.2 model
npm run dev            # launch with Ollama + llama3.2
npm run start          # launch with Ollama (default model)
npm run ollama:serve   # start Ollama server
npm run ollama:list    # list downloaded models
npm run openrouter     # launch with OpenRouter (reads env vars)
```

---

### Verify Connection

Inside claude, run:
```
/status
```

Expected output for Ollama:
```
Auth token:         ollama
Anthropic base URL: http://localhost:11434
Model:              llama3.2
```

Then apply the vxrt theme:
```
/theme → select vxrt
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
    ANTHROPIC_AUTH_TOKEN
    ANTHROPIC_BASE_URL`"}:::decision

    START --> ENV
    ENV -->|"localhost:11434"| OLLAMA
    ENV -->|"openrouter.ai/api/v1"| OPENROUTER
    ENV -->|"api.anthropic.com"| ANTHROPIC

    subgraph OLLAMA["Ollama — Local · Free · Offline"]
        OA["AUTH_TOKEN = ollama"]:::localnode
        OS["ollama serve · localhost:11434"]:::localnode
        OM["llama3.2 · qwen2.5-coder:7b\ndeepseek-r1 · mistral · gemma3"]:::localnode
        OA --> OS --> OM
    end

    subgraph OPENROUTER["OpenRouter — Cloud · 200+ Models"]
        RA["AUTH_TOKEN = sk-or-…"]:::cloudnode
        RP["openrouter.ai/api/v1"]:::cloudnode
        RM["claude-sonnet · gpt-4o\ngemini-pro · deepseek-coder"]:::cloudnode
        RA --> RP --> RM
    end

    subgraph ANTHROPIC["Anthropic — Official Claude Models"]
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
    subgraph REG["Plugin Registry"]
        MPL["Official Marketplace"]:::regnode
        LPL["Local plugins/ dir"]:::regnode
    end

    subgraph PLUGINS["Bundled Plugins"]
        CR["code-review\nPR analysis · diff review"]:::plugin
        FD["feature-dev\nFeature planning"]:::plugin
        FE["frontend-design\nUI/UX guidance"]:::plugin
        SG["security-guidance\nSecurity review"]:::plugin
        PR["pr-review-toolkit\nPR workflow"]:::plugin
        HK["hookify\nHook management"]:::plugin
        PD["plugin-dev · agent-sdk-dev"]:::plugin
        CC["commit-commands\nGit helpers"]:::plugin
    end

    subgraph SKILLS["Skills"]
        BSK["src/skills/bundled/\nBuilt-in skill index"]:::skill
        CSK[".claude/skills/\nCustom skills"]:::skill
        SKLT["SkillTool\nsrc/tools/SkillTool/"]:::skill
    end

    subgraph AGENTS["Custom Agents"]
        AGDIR[".claude/agents/"]:::agent
        PEN["pentesting-web-security-automation\nWeb recon · Exploit chains\nVuln scanning · Report gen\nOWASP Top 10 coverage"]:::agent
    end

    subgraph HOOKS["Hooks · settings.json"]
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
| Offline | No | Yes — via Ollama |
| Theme | Default blue | vxrt red/black |
| Custom agents | None | pentesting-web-security-automation |
| Branding | Claude Code | vxrt code |

---

## Plugins

| Plugin | Purpose |
|---|---|
| `code-review` | PR diff analysis and inline review |
| `feature-dev` | Feature planning and development workflow |
| `frontend-design` | UI/UX guidance and component generation |
| `security-guidance` | Security review and vulnerability hardening |
| `pr-review-toolkit` | Full pull request review workflow |
| `hookify` | Hook configuration and management |
| `commit-commands` | Git commit message helpers |
| `agent-sdk-dev` | Agent SDK development assistance |

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
    <td align="center" width="200">
      <a href="https://github.com/lily0ng">
        <img src="https://github.com/lily0ng.png" width="90" height="90" style="border-radius:50%;border:3px solid #cc2222" alt="lily0ng" />
        <br/><b>lily0ng</b>
      </a>
      <br/>
      <sub>Fork Maintainer</sub><br/>
      <sub>Config · Integration · Theming</sub><br/>
      <sub>
        <a href="https://github.com/lily0ng">GitHub</a> ·
        <a href="https://github.com/lily0ng/claude-code">claude-code</a>
      </sub>
    </td>
    <td align="center" width="200">
      <a href="https://github.com/0xff0ay">
        <img src="https://github.com/0xff0ay.png" width="90" height="90" style="border-radius:50%;border:3px solid #cc2222" alt="0xff0ay" />
        <br/><b>0xff0ay</b>
      </a>
      <br/>
      <sub>Senior Offensive Security Engineer ( Hacker )</sub><br/>
      <sub>Zero Day Researcher · VXRT, USA</sub><br/>
      <sub>
        <a href="https://github.com/0xff0ay">GitHub</a> ·
        <a href="https://github.com/0xff0ay/Offensive-Security">Offensive-Security</a> ·
        <a href="https://github.com/0xff0ay/HTB">HTB</a>
      </sub>
    </td>
  </tr>
</table>

---

## Collaborators

| Handle | Role | Repos |
|---|---|---|
| [@lily0ng](https://github.com/lily0ng) | Fork Maintainer · Config & Integration | [claude-code](https://github.com/lily0ng/claude-code) |
| [@0xff0ay](https://github.com/0xff0ay) | Senior Offensive Security Engineer ( Hacker ) · Zero Day Researcher · VXRT, USA | [Offensive-Security](https://github.com/0xff0ay/Offensive-Security) · [HTB](https://github.com/0xff0ay/HTB) · [0xff](https://github.com/0xff0ay/0xff) |

---

## About This Fork

This fork was created to make Claude Code usable without an Anthropic account or API billing. The primary goal is to route all AI inference through local Ollama models (free, offline, private) or OpenRouter (cloud, flexible pricing) instead of the Anthropic API.

The codebase is Anthropic's proprietary source — the `src/` directory contains the full TypeScript/TSX source that compiles into the `claude` binary. This fork does not redistribute the compiled binary; it configures the existing installed CLI to route to alternative backends.

**Why this matters:**
- Run a full agentic coding assistant with zero ongoing cost
- Keep code and prompts private — nothing leaves your machine with Ollama
- Access 200+ models via OpenRouter with a single API key
- Use specialized coding models like `qwen2.5-coder` for better code quality

---

## License

This fork inherits the upstream license. See [LICENSE.md](./LICENSE.md).

Original work © Anthropic, PBC. Fork modifications by [@lily0ng](https://github.com/lily0ng).

> Claude Code and the Claude name are trademarks of Anthropic, PBC. This fork is an independent, unofficial project not affiliated with or endorsed by Anthropic.
