function hasOperatorKeys(value, depth = 0) {
  if (depth > 12) return true;
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    key.startsWith('$') || key.includes('.') || hasOperatorKeys(child, depth + 1));
}

function rejectOperatorKeys(req, res, next) {
  if (hasOperatorKeys(req.body) || hasOperatorKeys(req.query) || hasOperatorKeys(req.params)) {
    return res.status(400).json({ error: 'Invalid request field' });
  }
  next();
}

module.exports = { hasOperatorKeys, rejectOperatorKeys };
