import OpenAI from "openai";

export async function POST(request) {
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { system, prompt } = await request.json();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
    return Response.json({ text: response.choices[0].message.content });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return Response.json({ error: "OpenAI API failed", text: "I was unable to respond at this time." }, { status: 500 });
  }
}
