import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { system, prompt } = await request.json();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(`${system}\n\n${prompt}`);
    const text = result.response.text();
    return Response.json({ text });
  } catch (error) {
    console.error("Gemini API error:", error);
    return Response.json({ error: "Gemini API failed", text: "I was unable to respond at this time." }, { status: 500 });
  }
}
