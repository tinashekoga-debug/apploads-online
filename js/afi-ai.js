
// ===========================================
// afi-ai.js
// Frontend client for Afi AI (streaming)
// ===========================================

import { buildContext } from './ai-context.js'

export async function askAfi(userMessage, onToken) {
    const context = buildContext(userMessage)

    const prompt = `
SYSTEM:
You are Afi, an AI logistics assistant for AppLoads operating in Southern Africa (SADC).

${context}

USER QUESTION:
${userMessage}

ANSWER:
`.trim()

    const response = await fetch(
        "https://tinashechristian-afi-ai.hf.space/chat",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt,
                max_tokens: 250
            })
        }
    )

    if (!response.body) {
        throw new Error("Streaming not supported")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    let fullText = ""

    while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        if (chunk.includes("[DONE]")) break

        const clean = chunk.replace(/^data:\s*/gm, "")
        fullText += clean

        // 🔴 stream token to UI
        if (onToken) onToken(clean)
    }

    return fullText
}
