# Claude Code with Ollama Configuration Guide

## Overview
This guide documents how to run Claude Code locally and configure it to use Ollama (local AI) instead of the Anthropic API.

## Running Claude Code Locally

### Installation
Claude Code can be installed via Homebrew:
```bash
brew install --cask claude-code
```

### Running Options

#### 1. Normal Mode (requires internet connection)
```bash
claude
```
- Connects to Anthropic's servers
- Requires authentication
- Full feature set

#### 2. Bare Mode (local/offline)
```bash
claude --bare
```
- Runs without external API connections
- No authentication required
- Limited to local features only
- Perfect for development and testing

#### 3. Other useful commands
```bash
claude --help                    # Show all options
claude --model sonnet           # Use specific model
claude --print "question"       # Non-interactive mode
claude --settings file.json     # Use custom settings file
```

## Configuring Ollama Integration

Claude Code doesn't have built-in Ollama support, but can be configured to use Ollama's OpenAI-compatible API endpoint.

### Prerequisites
1. Install Ollama: https://ollama.ai/
2. Start Ollama service: `ollama serve`
3. Pull a model: `ollama pull llama3.2` (or your preferred model)

### Configuration Methods

#### Method 1: Environment Variables (Recommended)

**Global Configuration (persistent):**
```bash
# Add to ~/.zshrc or ~/.bashrc
echo 'export ANTHROPIC_BASE_URL="http://localhost:11434/v1"' >> ~/.zshrc
echo 'export ANTHROPIC_API_KEY="ollama"' >> ~/.zshrc
echo 'export ANTHROPIC_DEFAULT_MODEL="llama3.2"' >> ~/.zshrc
source ~/.zshrc
```

**Per-session (temporary):**
```bash
ANTHROPIC_BASE_URL="http://localhost:11434/v1" ANTHROPIC_API_KEY="ollama" claude
```

#### Method 2: Settings File

Create `~/.claude/settings.json`:
```json
{
  "anthropicBaseUrl": "http://localhost:11434/v1",
  "apiKey": "ollama",
  "model": "llama3.2"
}
```

Run with settings:
```bash
claude --settings ~/.claude/settings.json
```

### Testing the Configuration

```bash
# Test with print mode
ANTHROPIC_BASE_URL="http://localhost:11434/v1" ANTHROPIC_API_KEY="ollama" claude --print "Hello, test message"

# Test interactive mode
ANTHROPIC_BASE_URL="http://localhost:11434/v1" ANTHROPIC_API_KEY="ollama" claude
```

## Supported Providers

Claude Code supports multiple AI providers:

- **firstParty**: Anthropic (default)
- **bedrock**: AWS Bedrock
- **vertex**: Google Cloud Vertex AI
- **foundry**: Azure AI Foundry

Environment variables for provider selection:
- `CLAUDE_CODE_USE_BEDROCK=1` - Use AWS Bedrock
- `CLAUDE_CODE_USE_VERTEX=1` - Use GCP Vertex
- `CLAUDE_CODE_USE_FOUNDRY=1` - Use Azure Foundry

## Configuration Files and Directories

### Claude Code Configuration
- Main config: `~/.claude/`
- Settings file: `~/.claude/settings.json` (if exists)
- Sessions: `~/.claude/sessions/`
- Cache: `~/.claude/cache/`

### Environment Variables
- `ANTHROPIC_BASE_URL`: Custom API endpoint
- `ANTHROPIC_API_KEY`: API key (use "ollama" for Ollama)
- `ANTHROPIC_DEFAULT_MODEL`: Default model name
- `CLAUDE_CODE_USE_BEDROCK`: Enable AWS Bedrock
- `CLAUDE_CODE_USE_VERTEX`: Enable GCP Vertex
- `CLAUDE_CODE_USE_FOUNDRY`: Enable Azure Foundry

## Limitations with Ollama

- Ollama uses OpenAI-compatible API format, not Anthropic's format
- Some Claude Code features may not work perfectly
- Advanced Claude-specific features might be limited
- Model compatibility depends on Ollama's implementation

## Troubleshooting

### Connection Issues
- Ensure Ollama is running: `ollama serve`
- Check Ollama endpoint: `http://localhost:11434/v1`
- Verify model is pulled: `ollama list`

### Configuration Issues
- Check environment variables: `echo $ANTHROPIC_BASE_URL`
- Verify settings file syntax
- Test with `--debug` flag for more info

### Common Errors
- `ERR_BAD_REQUEST`: Check internet connection or API endpoint
- Module resolution errors: May need to fix import paths in source code
- Authentication errors: Use dummy API key "ollama" for Ollama

## Development Notes

### Running from Source
If running Claude Code from source code:
1. The project uses Bun as runtime
2. Import paths may need adjustment (relative vs absolute)
3. Some dependencies may be missing
4. Use `bun run src/main.tsx` to run directly

### Building from Source
```bash
# Install dependencies
bun install

# Build (may have issues with import resolution)
bun build src/main.tsx --outdir dist --target node
```

## Commands Used in Investigation

```bash
# Installation
brew install --cask claude-code

# Running
claude --bare
claude --help

# Configuration discovery
find ~ -name ".claude*" -type d
find /Users/0xff/.claude -name "*.json"
claude --help | grep -i "env\|ANTHROPIC\|api\|url"

# Ollama setup
ollama serve
ollama pull llama3.2

# Testing
ANTHROPIC_BASE_URL="http://localhost:11434/v1" ANTHROPIC_API_KEY="ollama" claude --print "test"
```

---

*Last updated: April 23, 2026*
*Based on Claude Code version 2.1.108*</content>
