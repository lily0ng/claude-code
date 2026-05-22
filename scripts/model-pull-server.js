#!/usr/bin/env node
const http = require('http')
const { spawn } = require('child_process')

const PORT = process.env.MODEL_PULL_PORT || 5001

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {}
        resolve(parsed)
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(obj))
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, { ok: true })
  }

  if (req.method === 'POST' && req.url === '/api/models/pull') {
    try {
      const body = await parseJsonBody(req)
      const model = (body && body.model) || process.env.DEFAULT_MODEL
      if (!model) return sendJson(res, 400, { error: 'Missing model in body or DEFAULT_MODEL env var' })

      // Spawn ollama pull <model>
      const cmd = 'ollama'
      const args = ['pull', model]

      const child = spawn(cmd, args)

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      // Streaming JSON lines: {"type":"log","msg":"..."}\n
      child.stdout.on('data', (chunk) => {
        const msg = chunk.toString()
        res.write(JSON.stringify({ type: 'stdout', msg }) + '\n')
      })
      child.stderr.on('data', (chunk) => {
        const msg = chunk.toString()
        res.write(JSON.stringify({ type: 'stderr', msg }) + '\n')
      })

      child.on('close', (code) => {
        res.write(JSON.stringify({ type: 'exit', code }) + '\n')
        res.end()
      })

      child.on('error', (err) => {
        res.write(JSON.stringify({ type: 'error', msg: String(err) }) + '\n')
        res.end()
      })
    } catch (err) {
      return sendJson(res, 400, { error: 'Invalid JSON body', details: String(err) })
    }
    return
  }

  sendJson(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Model-pull server listening on http://localhost:${PORT}`)
})
