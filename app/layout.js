export const metadata = {
  title: "AI Discussion Room",
  description: "Watch ChatGPT, Gemini, and Claude debate your question in real time.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0d1117" }}>
        {children}
      </body>
    </html>
  );
}
