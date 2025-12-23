// ===========================================
// ai-config.js - AI Configuration
// ===========================================

export const AI_CONFIG = {
    HUGGINGFACE_API_URL: 'https://api-inference.huggingface.co/models',
    DEFAULT_MODEL: 'microsoft/DialoGPT-small',
    MAX_TOKENS: 150,
    TEMPERATURE: 0.7
};

export function getApiKey() {
    return localStorage.getItem('huggingface_api_key') || '';
}

export function setApiKey(key) {
    localStorage.setItem('huggingface_api_key', key);
}

export function hasApiKey() {
    return !!getApiKey();
}

