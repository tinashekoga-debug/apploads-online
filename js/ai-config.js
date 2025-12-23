export const AI_CONFIG = {
    HUGGINGFACE_API_URL: 'https://api-inference.huggingface.co/models',
    DEFAULT_MODEL: 'Qwen/Qwen3-8B-Instruct', // ⬅️ LATEST & BEST
    MAX_TOKENS: 1024, // ⬅️ Can go higher now!
export const HF_TOKEN = null;    TEMPERATURE: 0.7
};

const CENTRALIZED_API_KEY';

export function getApiKey() {
    return CENTRALIZED_API_KEY;
}

export function hasApiKey() {
    return !!CENTRALIZED_API_KEY && CENTRALIZED_API_KEY !== 'hf_YOUR_API_KEY_HERE';
}
