import OpenAI from "openai";

export async function POST(request) {
  try {
    const client = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: "https://api.x.ai/v1",
    });
    const { system, prompt } = await request.json();
    const response = await client.chat.completions.create({
      model: "grok-3-fast",
      max_tokens: 1024,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
    return Response.json({ text: response.choices[0].message.content });
  } catch (error) {
    console.error("Grok API error:", error);
    return Response.json({ error: "Grok API failed", text: "I was unable to respond at this time." }, { status: 500 });
  }
}
