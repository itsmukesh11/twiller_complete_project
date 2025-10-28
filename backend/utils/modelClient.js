// Simple model client helper
// Maps user preference to a provider model identifier and exposes a stub for calling the provider

function getModelForPreference(pref) {
  if (!pref || pref === 'default') return process.env.DEFAULT_MODEL || 'gpt-4';
  // allow known values
  const allowed = ['gpt-5-mini', 'gpt-4', 'gpt-5'];
  if (allowed.includes(pref)) return pref;
  return process.env.DEFAULT_MODEL || 'gpt-4';
}

async function callModelForUser(user, payload) {
  // This is a stub. Integrate your provider here (OpenAI, Anthropic, etc.) using process.env keys.
  const model = getModelForPreference(user.modelPreference);
  // Log and return a fake response for local development
  console.debug('callModelForUser stub', { user: user._id ? String(user._id) : user.email, model, payload });
  return { model, result: 'stub-response', payload };
}

module.exports = { getModelForPreference, callModelForUser };
// Simple model client helper
// This module maps a user's model preference to a provider model id
// and provides a placeholder `callModel` function you can extend to call real APIs.
const MODEL_MAP = {
  default: 'gpt-4',
  'gpt-5-mini': 'gpt-5-mini',
  'gpt-4': 'gpt-4'
};

function getProviderModel(preference) {
  return MODEL_MAP[preference] || MODEL_MAP['default'];
}

async function callModel(user, input, options = {}) {
  // Placeholder: you should integrate your chosen model provider here using process.env keys.
  // For now we return a mock response indicating which provider model would be used.
  const model = getProviderModel(user?.modelPreference || 'default');
  return { model, output: `(mocked) response for model ${model}` };
}

module.exports = { getProviderModel, callModel };
