
export const AI_CONFIG = {
    HUGGINGFACE_API_URL: 'https://api-inference.huggingface.co/models',
    DEFAULT_MODEL: 'Qwen/Qwen3-8B-Instruct',
    MAX_TOKENS: 1024,
    TEMPERATURE: 0.7
};

// No longer needed on client side - key is now in Netlify Function
export function getApiKey() {
    return 'managed-by-netlify';
}

export function hasApiKey() {
    return true; // Always true since Netlify handles it
}