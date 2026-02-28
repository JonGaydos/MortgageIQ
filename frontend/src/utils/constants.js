export const LOAN_TYPES = [
  { value: 'mortgage', label: 'Mortgage', icon: '\u{1F3E0}', hasEscrow: true },
  { value: 'arm', label: 'ARM', icon: '\u{1F4C8}', hasEscrow: true },
  { value: 'heloc', label: 'HELOC', icon: '\u{1F3E6}', hasEscrow: false },
  { value: 'auto', label: 'Auto', icon: '\u{1F697}', hasEscrow: false },
  { value: 'personal', label: 'Personal', icon: '\u{1F464}', hasEscrow: false },
];

export const THEMES = [
  { id: 'light', label: 'Light', emoji: '\u2600\uFE0F', description: 'Warm cream' },
  { id: 'dark', label: 'Dark', emoji: '\u{1F319}', description: 'Deep navy' },
  { id: 'slate', label: 'Slate', emoji: '\u{1F30A}', description: 'Cool blue' },
  { id: 'greenred', label: 'Green & Red', emoji: '\u{1F7E2}', description: 'Financial classic' },
  { id: 'midnight', label: 'Midnight', emoji: '\u{1F30C}', description: 'Catppuccin-inspired' },
  { id: 'forest', label: 'Forest', emoji: '\u{1F332}', description: 'Earthy tones' },
  { id: 'ocean', label: 'Ocean', emoji: '\u{1F40B}', description: 'Ocean blue' },
];

export const AI_PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic)', keyField: 'claude_api_key' },
  { value: 'openai', label: 'ChatGPT (OpenAI)', keyField: 'openai_api_key' },
  { value: 'gemini', label: 'Gemini (Google)', keyField: 'gemini_api_key' },
  { value: 'copilot', label: 'Copilot (Microsoft)', keyField: 'copilot_api_key' },
  { value: 'ollama', label: 'Ollama (Local)', keyField: 'ollama_url' },
];

export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', label: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', label: 'British Pound' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'JPY', symbol: '\u00A5', label: 'Japanese Yen' },
  { code: 'CHF', symbol: 'Fr', label: 'Swiss Franc' },
  { code: 'INR', symbol: '\u20B9', label: 'Indian Rupee' },
  { code: 'MXN', symbol: 'Mex$', label: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', label: 'Brazilian Real' },
];
