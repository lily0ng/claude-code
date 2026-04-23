#!/bin/bash

# Claude Code with Ollama Integration Script
# This script sets up the environment to use Claude Code with Ollama

# Set environment variables for Ollama integration
export ANTHROPIC_BASE_URL="http://localhost:3000"
export ANTHROPIC_API_KEY="ollama"

# Check if proxy is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "Error: Ollama proxy is not running on port 3000"
    echo "Please start the proxy first:"
    echo "  cd /Users/0xff/Desktop/Software\\ Engineering/claude-code"
    echo "  node ollama-proxy.js"
    exit 1
fi

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "Error: Ollama is not running on port 11434"
    echo "Please start Ollama first"
    exit 1
fi

echo "✅ Environment configured for Claude Code + Ollama integration"
echo "✅ Proxy server running on port 3000"
echo "✅ Ollama running on port 11434"
echo ""

# Run Claude Code with the provided arguments
exec claude "$@"