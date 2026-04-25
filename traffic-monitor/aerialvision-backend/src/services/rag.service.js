const { pipeline, env } = require('@xenova/transformers');
const axios = require('axios');

env.cacheDir = './.cache/transformers';

let embedder = null;

async function getPipeline() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

exports.getEmbedding = async (text) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('getEmbedding: text must be a non-empty string');
  }

  const pipe = await getPipeline();
  const output = await pipe(text.trim(), { pooling: 'mean', normalize: true });

  if (!output || !output.data) {
    throw new Error('getEmbedding: model returned empty output');
  }

  return Array.from(output.data);
};

function formatContextDocs(contextDocs) {
  if (!contextDocs || contextDocs.length === 0) {
    return 'No relevant context logs found in the database.';
  }

  return contextDocs
    .map((doc, i) => {
      const label = doc.type === 'ROUTING_SESSION' ? 'ROUTING SESSION' : 'INCIDENT';
      return `[${label} ${i + 1}]\n${doc.ragContent}`;
    })
    .join('\n---\n');
}

exports.generateCopilotResponse = async (query, contextDocs, conversationHistory = []) => {
  if (!query || typeof query !== 'string') {
    throw new Error('generateCopilotResponse: query must be a non-empty string');
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    throw new Error('generateCopilotResponse: GROQ_API_KEY is not set in environment');
  }

  const contextString = formatContextDocs(contextDocs);

  const systemPrompt = `You are AerialVision Copilot, an AI assistant for traffic operators. You have access to two types of real-time logs: Traffic Incidents and Emergency Routing Sessions. Answer the user's question using ONLY the provided context logs. Cross-reference incidents with routing data if necessary. Be concise, specific, and actionable.

Context Logs:
${contextString}`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-10);
    for (const msg of recent) {
      if (msg.role === 'user' || (msg.role === 'assistant' && msg.content)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  messages.push({ role: 'user', content: query });

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.3,
        max_tokens: 1024
      },
      {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('generateCopilotResponse: Groq returned unexpected response structure');
    }

    return response.data.choices[0].message.content;
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data;
      if (status === 401) {
        throw new Error('generateCopilotResponse: Invalid Groq API key');
      }
      if (status === 429) {
        throw new Error('generateCopilotResponse: Groq rate limit hit — please wait and try again');
      }
      throw new Error(`generateCopilotResponse: Groq API error ${status}: ${JSON.stringify(data)}`);
    }
    throw new Error(`generateCopilotResponse: ${err.message}`);
  }
};
