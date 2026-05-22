#!/usr/bin/env node
const { spawnSync } = require('child_process')

const model = process.argv[2] || process.env.DEFAULT_MODEL
if (!model) {
  console.error('Usage: node scripts/pull-model.js <model>')
  process.exit(2)
}

const cmd = 'ollama'
const args = ['pull', model]
const r = spawnSync(cmd, args, { stdio: 'inherit' })
process.exit(r.status || 0)
