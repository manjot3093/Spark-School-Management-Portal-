const DEFAULT_TIMEOUT_MS = 30000;

function providerUrl() {
  const raw = process.env.VLLM_BASE_URL;
  if (!raw) throw new Error('AI provider is not configured');
  const url = new URL(raw);
  if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:')) {
    throw new Error('AI provider requires HTTPS');
  }
  return `${url.toString().replace(/\/$/, '')}/chat/completions`;
}

async function generateJson(messages, schemaHint) {
  const key = process.env.VLLM_API_KEY;
  const model = process.env.VLLM_MODEL;
  if (!key || !model) throw new Error('AI provider is not configured');
  const timeout = Number(process.env.VLLM_TIMEOUT_S || 30) * 1000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeout) && timeout > 0 ? Math.min(timeout, 120000) : DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(providerUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: `Return only valid JSON. ${schemaHint}` }, ...messages], temperature: 0.4 }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('AI provider request failed');
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('AI provider returned an invalid response');
    const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    return JSON.parse(cleaned);
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('AI provider timed out');
    if (error instanceof SyntaxError) throw new Error('AI provider returned invalid JSON');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { generateJson };
