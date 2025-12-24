
export const AI_CONFIG = {
    HUGGINGFACE_API_URL: 'https://api-inference.huggingface.co/models',
    DEFAULT_MODEL: 'HuggingFaceTB/SmolLM3-3B',  // Free model on hf-inference
    MAX_TOKENS: 1024,
    TEMPERATURE: 0.7
};

export function getApiKey() {
    return 'managed-by-netlify';
}

export function hasApiKey() {
    return true;
}