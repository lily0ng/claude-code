import http from 'http';
import https from 'https';

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/v1/messages') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const anthropicRequest = JSON.parse(body);

        // Translate Anthropic request to OpenAI format for Ollama
        // Map Anthropic model names to Ollama model names
        const modelMapping = {
          'claude-3-5-sonnet-20241022': 'llama3.2',
          'llama3.2': 'llama3.2'
        };
        const ollamaModel = modelMapping[anthropicRequest.model] || anthropicRequest.model;

        const openaiRequest = {
          model: ollamaModel,
          messages: anthropicRequest.messages.map(msg => ({
            role: msg.role,
            content: Array.isArray(msg.content)
              ? msg.content.map(c => c.type === 'text' ? c.text : c).join('')
              : msg.content
          })),
          max_tokens: anthropicRequest.max_tokens,
          temperature: anthropicRequest.temperature,
          stream: false
        };

        // Forward to Ollama
        const ollamaReq = http.request({
          hostname: 'localhost',
          port: 11434,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization || 'Bearer ollama'
          }
        }, (ollamaRes) => {
          let ollamaData = '';
          ollamaRes.on('data', chunk => {
            ollamaData += chunk;
          });

          ollamaRes.on('end', () => {
            try {
              const openaiData = JSON.parse(ollamaData);

              // Translate OpenAI response back to Anthropic format
              const anthropicResponse = {
                id: openaiData.id || 'msg_' + Date.now(),
                type: 'message',
                role: 'assistant',
                content: [{
                  type: 'text',
                  text: openaiData.choices[0].message.content
                }],
                model: openaiData.model,
                stop_reason: openaiData.choices[0].finish_reason === 'stop' ? 'end_turn' : 'max_tokens',
                usage: {
                  input_tokens: openaiData.usage?.prompt_tokens || 0,
                  output_tokens: openaiData.usage?.completion_tokens || 0
                }
              };

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(anthropicResponse));
            } catch (error) {
              console.error('Error parsing Ollama response:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: { type: 'api_error', message: 'Failed to parse Ollama response' } }));
            }
          });
        });

        ollamaReq.on('error', (error) => {
          console.error('Error calling Ollama:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { type: 'api_error', message: 'Failed to call Ollama' } }));
        });

        ollamaReq.write(JSON.stringify(openaiRequest));
        ollamaReq.end();

      } catch (error) {
        console.error('Error parsing request:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { type: 'invalid_request_error', message: 'Invalid JSON' } }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { type: 'not_found', message: 'Endpoint not found' } }));
  }
});

server.listen(3000, () => {
  console.log('Anthropic-to-Ollama proxy running on port 3000');
});