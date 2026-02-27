"use client";
import { useState, useRef, useEffect } from "react";

const MAX_DEBATE_ROUNDS = 4;

const AI_PERSONAS = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    model: "GPT-4o",
    apiRoute: "/api/chatgpt",
    color: "#00c896",
    colorDim: "rgba(0,200,150,0.15)",
    colorBorder: "rgba(0,200,150,0.25)",
    colorGlow: "rgba(0,200,150,0.5)",
    initial: "G",
    blindPrompt: `You are ChatGPT (GPT-4o) by OpenAI. Answer the following question independently and thoroughly. Give your best factual answer. Be confident and clear. 3-5 sentences.`,
    debatePrompt: `You are ChatGPT (GPT-4o) by OpenAI in a live factual debate with Gemini and Claude. You have seen everyone's answers including previous debate rounds. Critically evaluate what was said — name names, point out where another AI was wrong or incomplete, defend your own previous points if challenged, and add new arguments. Be direct, factual, specific. Reference others by name (e.g. "Gemini was right about X but missed Y", "Claude's point on Z is incorrect because..."). 3-5 sentences. No fluff.`,
  },
  {
    id: "gemini",
    name: "Gemini",
    model: "Gemini 1.5 Pro",
    apiRoute: "/api/gemini",
    color: "#4d9eff",
    colorDim: "rgba(77,158,255,0.15)",
    colorBorder: "rgba(77,158,255,0.25)",
    colorGlow: "rgba(77,158,255,0.5)",
    initial: "◈",
    blindPrompt: `You are Gemini (1.5 Pro) by Google. Answer the following question independently and thoroughly. Give your best factual answer. Be confident and clear. 3-5 sentences.`,
    debatePrompt: `You are Gemini (1.5 Pro) by Google in a live factual debate with ChatGPT and Claude. You have seen everyone's answers including previous debate rounds. Critically evaluate what was said — name names, point out where another AI was wrong or incomplete, defend your own previous points if challenged, and add new arguments. Be direct, factual, specific. Reference others by name. 3-5 sentences. No fluff.`,
  },
  {
    id: "claude",
    name: "Claude",
    model: "Claude Opus 4",
    apiRoute: "/api/claude",
    color: "#ff8c5a",
    colorDim: "rgba(255,140,90,0.15)",
    colorBorder: "rgba(255,140,90,0.25)",
    colorGlow: "rgba(255,140,90,0.5)",
    initial: "◆",
    blindPrompt: `You are Claude (Opus 4) by Anthropic. Answer the following question independently and thoroughly. Give your best factual answer. Be confident and clear. 3-5 sentences.`,
    debatePrompt: `You are Claude (Opus 4) by Anthropic in a live factual debate with ChatGPT and Gemini. You have seen everyone's answers including previous debate rounds. Critically evaluate what was said — name names, point out where another AI was wrong or incomplete, defend your own previous points if challenged, and add new arguments. Be direct, factual, specific. Reference others by name. 3-5 sentences. No fluff.`,
  },
];

const COUNCIL_FINAL_SYSTEM = `You are the synthesizer for the Council of AI — a panel of ChatGPT, Gemini, and Claude that has just completed a multi-round debate. Deliver the FINAL answer on behalf of the entire council: determine what is most factually correct, where there was disagreement choose the most defensible position, write a clear polished complete answer the user can trust. 4-6 sentences, authoritative and direct. Do NOT reference the debate process or mention any individual AI by name. Speak directly to the user as the unified voice of the council.`;

async function callAI(persona, systemPrompt, userPrompt) {
  const res = await fetch(persona.apiRoute, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: systemPrompt, prompt: userPrompt }),
  });
  const data = await res.json();
  return data.text || "Unable to respond at this time.";
}

function buildBlindContext(q) {
  return `QUESTION: "${q}"\n\nGive your independent answer:`;
}

function buildDebateContext(q, msgs, name) {
  let ctx = `ORIGINAL QUESTION: "${q}"\n\n=== ALL RESPONSES SO FAR ===\n\n`;
  const byRound = {};
  msgs.forEach((m) => { if (!byRound[m.round]) byRound[m.round] = []; byRound[m.round].push(m); });
  Object.keys(byRound).sort().forEach((r) => {
    ctx += `--- ${parseInt(r) === 1 ? "INITIAL ANSWERS (Independent)" : `DEBATE ROUND ${r}`} ---\n`;
    byRound[r].forEach((m) => { ctx += `\n${m.personaName}: ${m.text}\n`; });
    ctx += "\n";
  });
  ctx += `\nYour turn, ${name}. Critically engage — reference specific points and names:`;
  return ctx;
}

function isSimpleGreeting(text) {
  const normalized = text.toLowerCase().replace(/[!?.,;:'"…\-()]/g, '').trim();
  const greetings = [
    'hi', 'hello', 'hey', 'howdy', 'sup', 'yo', 'hola', 'greetings',
    'good morning', 'good afternoon', 'good evening', 'good night',
    'whats up', "what's up", 'wassup', 'hii', 'hiii', 'heya', 'hey there',
    'hi there', 'hello there', 'thanks', 'thank you', 'bye', 'goodbye',
    'good bye', 'see you', 'see ya', 'later', 'gn', 'gm',
  ];
  return greetings.some((g) => normalized === g) || (normalized.split(/\s+/).length <= 3 && greetings.some((g) => normalized.startsWith(g)));
}

function checkConsensus(messages, round) {
  if (round < 3) return false;
  const last = messages.filter((m) => m.round === round);
  if (last.length < 3) return false;
  const words = ["agree", "consensus", "aligned", "correct", "all three", "we all", "settled", "no further disagreement"];
  return last.filter((m) => words.some((w) => m.text.toLowerCase().includes(w))).length >= 2;
}

// ── Components ─────────────────────────────────

function PulsingDots({ color }) {
  return (
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center", padding: "2px 0" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          display: "inline-block", width: 6, height: 6, borderRadius: "50%",
          background: color, opacity: 0.9,
          animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </span>
  );
}

function AIBadge({ persona, isActive, isDone }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      padding: "10px 14px",
      background: isActive ? persona.colorDim : "rgba(255,255,255,0.02)",
      border: `1px solid ${isActive ? persona.colorBorder : "rgba(255,255,255,0.05)"}`,
      borderRadius: 12,
      transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      transform: isActive ? "translateY(-2px)" : "none",
      boxShadow: isActive ? `0 8px 32px ${persona.colorGlow}` : "none",
      minWidth: 72,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%",
        background: isActive ? persona.colorDim : "rgba(255,255,255,0.03)",
        border: `1.5px solid ${isActive ? persona.color : "rgba(255,255,255,0.08)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, color: isActive ? persona.color : isDone ? persona.color : "#3a3a3a",
        fontWeight: 700, transition: "all 0.4s",
        boxShadow: isActive ? `0 0 20px ${persona.colorGlow}` : "none",
        animation: isActive ? "badgePulse 1.8s ease infinite" : "none",
      }}>
        {persona.initial}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 600,
          color: isActive ? persona.color : isDone ? "#555" : "#333",
          letterSpacing: 0.5, transition: "color 0.4s",
        }}>{persona.name}</div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: "#2a2a2a", marginTop: 1 }}>{persona.model}</div>
      </div>
      {isActive && <PulsingDots color={persona.color} />}
    </div>
  );
}

function RoundDivider({ round }) {
  const isBlind = round === 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "32px 0 24px", animation: "fadeIn 0.4s ease-out" }}>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06))" }} />
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "5px 14px",
        background: isBlind ? "rgba(255,255,255,0.03)" : "rgba(255,200,100,0.05)",
        border: `1px solid ${isBlind ? "rgba(255,255,255,0.07)" : "rgba(255,200,100,0.15)"}`,
        borderRadius: 20,
      }}>
        <span style={{ fontSize: 8, color: isBlind ? "#555" : "#a08020" }}>{isBlind ? "○" : "◉"}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: isBlind ? "#444" : "#a08020", whiteSpace: "nowrap" }}>
          {isBlind ? "INDEPENDENT ANSWERS" : `DEBATE ROUND ${round - 1}`}
        </span>
      </div>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.06), transparent)" }} />
    </div>
  );
}

function UserBubble({ text }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32, animation: "slideFromRight 0.4s cubic-bezier(0.34,1.2,0.64,1)" }}>
      <div style={{ maxWidth: "72%", minWidth: 120 }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "#333", textAlign: "right", marginBottom: 6, letterSpacing: 1.5 }}>
          YOU ASKED
        </div>
        <div style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px 3px 16px 16px",
          padding: "14px 18px",
          color: "#e8e8e8", fontSize: 15.5, lineHeight: 1.65,
          fontFamily: "'Playfair Display',Georgia,serif",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}>{text}</div>
      </div>
    </div>
  );
}

function AIMessage({ msg, persona, delay = 0 }) {
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 14, animation: `slideFromLeft 0.4s cubic-bezier(0.34,1.2,0.64,1) ${delay}s both` }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%", flexShrink: 0, marginTop: 2,
        background: persona.colorDim, border: `1.5px solid ${persona.colorBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, color: persona.color, fontWeight: 700,
      }}>{persona.initial}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ color: persona.color, fontWeight: 700, fontSize: 12, fontFamily: "'DM Mono',monospace", letterSpacing: 0.5 }}>{persona.name}</span>
          <span style={{ fontSize: 9, color: "#2e2e2e", fontFamily: "'DM Mono',monospace", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>{persona.model}</span>
        </div>
        <div style={{
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
          borderLeft: `2px solid ${persona.colorBorder}`,
          borderRadius: "0 12px 12px 12px", padding: "12px 16px",
          color: "#ccc", fontSize: 14, lineHeight: 1.75, fontFamily: "'Lora',Georgia,serif",
        }}>{msg.text}</div>
      </div>
    </div>
  );
}

function TypingMessage({ persona }) {
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 14, animation: "fadeIn 0.3s ease-out" }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%", flexShrink: 0, marginTop: 2,
        background: persona.colorDim, border: `1.5px solid ${persona.color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, color: persona.color, fontWeight: 700,
        animation: "badgePulse 1.8s ease infinite", boxShadow: `0 0 20px ${persona.colorGlow}`,
      }}>{persona.initial}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ color: persona.color, fontWeight: 700, fontSize: 12, fontFamily: "'DM Mono',monospace" }}>{persona.name}</span>
          <span style={{ color: "#333", fontSize: 10, fontFamily: "'DM Mono',monospace" }}>thinking...</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderLeft: `2px solid ${persona.colorBorder}`, borderRadius: "0 12px 12px 12px", padding: "14px 18px", display: "inline-block" }}>
          <PulsingDots color={persona.color} />
        </div>
      </div>
    </div>
  );
}

function DebateSection({ isOpen, onToggle, rounds, messages, typingAI, typingPersona, isFinalLoading, phase, debateStartTime, debateEndTime }) {
  const isDebating = phase !== "idle" && phase !== "done" && phase !== "stopped" && !isFinalLoading;
  const isComplete = phase === "done" || phase === "synthesizing" || isFinalLoading;
  const maxRound = messages.length > 0 ? Math.max(...messages.map(m => m.round)) : 0;
  const totalDebateRounds = MAX_DEBATE_ROUNDS - 1;
  const elapsedSeconds = debateEndTime && debateStartTime ? Math.round((debateEndTime - debateStartTime) / 1000) : null;

  let statusLabel = "";
  if (isDebating) {
    if (phase === "round1") {
      statusLabel = "Gathering independent answers...";
    } else {
      const debateRound = maxRound - 1;
      statusLabel = `Debating... Round ${debateRound} of ${totalDebateRounds}`;
    }
  } else if (isComplete) {
    statusLabel = elapsedSeconds
      ? `Debated in ${Math.max(maxRound - 1, 1)} round${maxRound - 1 !== 1 ? "s" : ""} (${elapsedSeconds}s)`
      : `Debated in ${Math.max(maxRound - 1, 1)} round${maxRound - 1 !== 1 ? "s" : ""}`;
  } else {
    statusLabel = `Debate transcript — ${messages.length} messages`;
  }

  if (messages.length === 0 && !typingAI) return null;

  return (
    <div style={{ marginBottom: 8, animation: "fadeIn 0.4s ease-out" }}>
      {/* Toggle Header */}
      <button
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%",
          padding: "12px 16px",
          background: isDebating ? "rgba(0,200,150,0.03)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${isDebating ? "rgba(0,200,150,0.12)" : "rgba(255,255,255,0.06)"}`,
          borderRadius: isOpen ? "12px 12px 0 0" : 12,
          cursor: "pointer",
          transition: "all 0.3s ease",
        }}
      >
        {/* Spinner or checkmark */}
        {isDebating ? (
          <div style={{
            width: 18, height: 18, borderRadius: "50%",
            border: "2px solid rgba(0,200,150,0.2)",
            borderTopColor: "#00c896",
            animation: "spin 0.8s linear infinite",
            flexShrink: 0,
          }} />
        ) : (
          <div style={{
            width: 18, height: 18, borderRadius: "50%",
            background: "rgba(0,200,150,0.08)",
            border: "1px solid rgba(0,200,150,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#00c896", fontSize: 9, flexShrink: 0,
          }}>✓</div>
        )}

        <span style={{
          fontFamily: "'DM Mono',monospace",
          fontSize: 11,
          color: isDebating ? "#00c896" : "#555",
          letterSpacing: 0.5,
          flex: 1,
          textAlign: "left",
        }}>
          {statusLabel}
        </span>

        {/* Three small AI color dots */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {AI_PERSONAS.map(p => (
            <div key={p.id} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: p.color,
              opacity: isDebating && typingAI === p.id ? 1 : 0.35,
              transition: "opacity 0.3s",
              boxShadow: isDebating && typingAI === p.id ? `0 0 6px ${p.color}` : "none",
            }} />
          ))}
        </div>

        {/* Chevron */}
        <span style={{
          fontFamily: "'DM Mono',monospace", fontSize: 12,
          color: "#444",
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.3s ease",
          display: "inline-block",
        }}>
          ▾
        </span>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div style={{
          border: "1px solid rgba(255,255,255,0.06)",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
          padding: "4px 16px 16px",
          background: "rgba(255,255,255,0.01)",
          maxHeight: 600,
          overflowY: "auto",
          animation: "fadeIn 0.3s ease-out",
        }}>
          {Object.keys(rounds).sort((a, b) => a - b).map((round) => (
            <div key={round}>
              <RoundDivider round={parseInt(round)} />
              {rounds[round].map((msg, i) => {
                const persona = AI_PERSONAS.find((p) => p.id === msg.personaId);
                return <AIMessage key={msg.id} msg={msg} persona={persona} delay={0} />;
              })}
            </div>
          ))}
          {typingAI && typingPersona && !isFinalLoading && <TypingMessage persona={typingPersona} />}
        </div>
      )}
    </div>
  );
}

function FinalVerdict({ text, isLoading }) {
  const verdictColor = "#c9a84c";
  const verdictColorDim = "rgba(201,168,76,0.1)";
  const verdictColorBorder = "rgba(201,168,76,0.25)";
  const verdictColorGlow = "rgba(201,168,76,0.3)";

  return (
    <div style={{ animation: "fadeIn 0.6s ease-out", marginTop: 24, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${verdictColorBorder})` }} />
        <div style={{ padding: "8px 20px", background: `linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.06))`, border: `1px solid ${verdictColorBorder}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: verdictColor, boxShadow: `0 0 10px ${verdictColorGlow}`, animation: isLoading ? "badgePulse 1s ease infinite" : "none" }} />
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2.5, color: verdictColor, fontWeight: 600 }}>COUNCIL OF AI — FINAL ANSWER</span>
        </div>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${verdictColorBorder}, transparent)` }} />
      </div>
      <div style={{
        position: "relative", overflow: "hidden",
        background: `linear-gradient(145deg, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.03) 100%)`,
        border: `1px solid ${verdictColorBorder}`, borderRadius: 16, padding: "24px 28px",
        boxShadow: `0 0 60px rgba(201,168,76,0.08), inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, rgba(201,168,76,0.15), transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            background: verdictColorDim, border: `2px solid ${isLoading ? verdictColor : verdictColorBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: verdictColor, fontWeight: 700,
            boxShadow: `0 0 ${isLoading ? 24 : 12}px ${verdictColorGlow}`,
            animation: isLoading ? "badgePulse 1.5s ease infinite" : "none",
          }}>⚖</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ color: verdictColor, fontWeight: 700, fontSize: 13, fontFamily: "'DM Mono',monospace" }}>Council of AI</span>
              <span style={{ color: "#5a4a20", fontSize: 9, fontFamily: "'DM Mono',monospace", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", padding: "2px 7px", borderRadius: 4 }}>Consensus Answer</span>
            </div>
            <div style={{ color: "#ede0c0", fontSize: 15, lineHeight: 1.85, fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700 }}>
              {isLoading ? <PulsingDots color={verdictColor} /> : text}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────

export default function AIDiscussionRoom() {
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingAI, setTypingAI] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [finalAnswer, setFinalAnswer] = useState(null);
  const [isFinalLoading, setIsFinalLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [phase, setPhase] = useState("idle");
  const [isDone, setIsDone] = useState(false);
  const [debateOpen, setDebateOpen] = useState(false);
  const [debateStartTime, setDebateStartTime] = useState(null);
  const [debateEndTime, setDebateEndTime] = useState(null);
  const bottomRef = useRef(null);
  const stopRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingAI, finalAnswer, isFinalLoading]);

  const runDiscussion = async () => {
    if (!question.trim() || isRunning) return;
    const q = question.trim();
    setSubmitted(q);
    setQuestion("");
    stopRef.current = false;
    setIsRunning(true);
    setIsDone(false);
    setMessages([]);
    setFinalAnswer(null);
    setIsFinalLoading(false);
    setPhase("round1");
    setDebateOpen(false);
    setDebateStartTime(Date.now());
    setDebateEndTime(null);

    const msgs = [];
    let consensusReached = false;

    const skipDebate = isSimpleGreeting(q);

    // Round 1 — blind
    setStatus(skipDebate ? "Each AI responds..." : "Round 1 — each AI answers independently...");
    for (const p of AI_PERSONAS) {
      if (stopRef.current) break;
      setTypingAI(p.id);
      const text = await callAI(p, p.blindPrompt, buildBlindContext(q));
      const msg = { id: `${p.id}-1`, personaId: p.id, personaName: p.name, text, round: 1 };
      msgs.push(msg);
      setMessages([...msgs]);
      setTypingAI(null);
      await new Promise((r) => setTimeout(r, 300));
    }

    // Skip debate and verdict for simple greetings
    if (skipDebate || stopRef.current) {
      setDebateEndTime(Date.now());
      setIsRunning(false);
      setPhase("done");
      setIsDone(true);
      setStatus(stopRef.current ? "Stopped." : "");
      return;
    }

    // Rounds 2+ — debate
    for (let round = 2; round <= MAX_DEBATE_ROUNDS && !stopRef.current && !consensusReached; round++) {
      setPhase(`round${round}`);
      setStatus(`Debate round ${round - 1} of ${MAX_DEBATE_ROUNDS - 1}...`);
      for (const p of AI_PERSONAS) {
        if (stopRef.current) break;
        setTypingAI(p.id);
        const text = await callAI(p, p.debatePrompt, buildDebateContext(q, msgs, p.name));
        const msg = { id: `${p.id}-${round}`, personaId: p.id, personaName: p.name, text, round };
        msgs.push(msg);
        setMessages([...msgs]);
        setTypingAI(null);
        await new Promise((r) => setTimeout(r, 300));
      }
      if (checkConsensus(msgs, round)) { consensusReached = true; setStatus("Consensus reached..."); }
    }

    if (stopRef.current) { setDebateEndTime(Date.now()); setIsRunning(false); setPhase("stopped"); setStatus("Stopped."); return; }

    // Council final synthesis
    setDebateEndTime(Date.now());
    setPhase("synthesizing");
    setStatus("Council is synthesizing the final answer...");
    setIsFinalLoading(true);
    setTypingAI("gemini");
    const fullCtx = `ORIGINAL QUESTION: "${q}"\n\nFULL DEBATE TRANSCRIPT:\n\n` +
      msgs.map((m) => `[Round ${m.round}] ${m.personaName}: ${m.text}`).join("\n\n");
    const geminiPersona = AI_PERSONAS[1];
    const final = await callAI(geminiPersona, COUNCIL_FINAL_SYSTEM, fullCtx);
    setFinalAnswer(final);
    setIsFinalLoading(false);
    setTypingAI(null);
    setPhase("done");
    setIsDone(true);
    setStatus("Discussion complete.");
    setIsRunning(false);
  };

  const stop = () => { stopRef.current = true; setIsRunning(false); setTypingAI(null); setStatus("Stopped."); };
  const reset = () => {
    stopRef.current = true;
    setMessages([]); setQuestion(""); setSubmitted("");
    setFinalAnswer(null); setIsFinalLoading(false);
    setTypingAI(null); setIsRunning(false);
    setPhase("idle"); setIsDone(false); setStatus("");
    setDebateOpen(false); setDebateStartTime(null); setDebateEndTime(null);
  };

  const rounds = {};
  messages.forEach((m) => { if (!rounds[m.round]) rounds[m.round] = []; rounds[m.round].push(m); });
  const typingPersona = AI_PERSONAS.find((p) => p.id === typingAI);
  const isGreeting = submitted && isSimpleGreeting(submitted);

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e0e0e0", display: "flex", flexDirection: "column", fontFamily: "'Lora',Georgia,serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Mono:wght@400;500&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0);opacity:0.9} 40%{transform:translateY(-6px);opacity:1} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideFromLeft { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideFromRight { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes badgePulse { 0%,100%{opacity:1} 50%{opacity:0.55} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:#0d1117} ::-webkit-scrollbar-thumb{background:#1e2530;border-radius:2px}
        button{cursor:pointer;transition:all 0.25s;border:none;outline:none}
        textarea{outline:none;resize:none}
      `}</style>

      {/* Header */}
      <header style={{
        padding: "0 24px", borderBottom: "1px solid rgba(255,255,255,0.05)",
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(13,17,23,0.95)", backdropFilter: "blur(16px)",
        display: "flex", alignItems: "stretch", justifyContent: "space-between", minHeight: 68,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #00c896, #4d9eff, #ff8c5a)",
            backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#0d1117",
          }}>AI</div>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: -0.3 }}>Discussion Room</h1>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: "#2e3a4a", letterSpacing: 2, marginTop: 1 }}>MULTI-AI DEBATE PROTOCOL</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {AI_PERSONAS.map((p) => <AIBadge key={p.id} persona={p} isActive={typingAI === p.id} isDone={isDone} />)}
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, maxWidth: 820, width: "100%", margin: "0 auto", padding: "28px 20px 0" }}>
        {phase === "idle" && !submitted && (
          <div style={{ textAlign: "center", marginTop: 100, animation: "fadeIn 0.6s ease-out" }}>
            <div style={{ display: "inline-flex", gap: 16, marginBottom: 24, alignItems: "center" }}>
              {AI_PERSONAS.map((p, i) => (
                <div key={p.id} style={{
                  width: 50, height: 50, borderRadius: "50%",
                  background: p.colorDim, border: `1px solid ${p.colorBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, color: p.color, opacity: 0.4,
                  animation: `fadeIn 0.6s ease-out ${i * 0.15}s both`,
                }}>{p.initial}</div>
              ))}
            </div>
            <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#1e2a38", letterSpacing: 3, marginBottom: 8 }}>POSE A QUESTION TO BEGIN</p>
            <p style={{ fontFamily: "'Lora',Georgia,serif", fontSize: 13, color: "#1e2a38", fontStyle: "italic" }}>
              Three AIs debate your question, then deliver a unified Council answer.
            </p>
          </div>
        )}

        {submitted && <UserBubble text={submitted} />}

        {/* Collapsible Debate Section — for real questions */}
        {submitted && !isGreeting && (messages.length > 0 || typingAI) && (
          <DebateSection
            isOpen={debateOpen}
            onToggle={() => setDebateOpen(prev => !prev)}
            rounds={rounds}
            messages={messages}
            typingAI={typingAI}
            typingPersona={typingPersona}
            isFinalLoading={isFinalLoading}
            phase={phase}
            debateStartTime={debateStartTime}
            debateEndTime={debateEndTime}
          />
        )}

        {/* Simple greetings — show answers directly */}
        {isGreeting && Object.keys(rounds).sort((a, b) => a - b).map((round) => (
          <div key={round}>
            <RoundDivider round={parseInt(round)} />
            {rounds[round].map((msg, i) => {
              const persona = AI_PERSONAS.find((p) => p.id === msg.personaId);
              return <AIMessage key={msg.id} msg={msg} persona={persona} delay={i * 0.05} />;
            })}
          </div>
        ))}
        {isGreeting && typingAI && typingPersona && <TypingMessage persona={typingPersona} />}

        {/* Council Final Answer — always visible, primary content */}
        {(isFinalLoading || finalAnswer) && <FinalVerdict text={finalAnswer} isLoading={isFinalLoading} />}

        <div ref={bottomRef} style={{ height: 40 }} />
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "18px 20px 24px",
        background: "rgba(13,17,23,0.98)",
        position: "sticky", bottom: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          {status && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#2a3a4a", letterSpacing: 1.5 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: isRunning ? "#00c896" : "#2a3a4a", boxShadow: isRunning ? "0 0 8px rgba(0,200,150,0.6)" : "none", animation: isRunning ? "badgePulse 1.2s ease infinite" : "none", flexShrink: 0 }} />
              {status}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "12px 12px 12px 18px" }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask the panel a question..."
              disabled={isRunning}
              rows={2}
              style={{ flex: 1, background: "transparent", border: "none", color: "#e8e8e8", fontSize: 14.5, fontFamily: "'Lora',Georgia,serif", lineHeight: 1.65, padding: 0, opacity: isRunning ? 0.4 : 1 }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isRunning) { e.preventDefault(); runDiscussion(); } }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              <button onClick={reset} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#2e3a4a", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }} title="Reset">↺</button>
              {!isRunning ? (
                <button onClick={runDiscussion} disabled={!question.trim()} style={{ height: 36, padding: "0 20px", background: question.trim() ? "linear-gradient(135deg, #00c896, #4d9eff, #ff8c5a)" : "rgba(255,255,255,0.04)", backgroundSize: "200% 200%", animation: question.trim() ? "gradientShift 3s ease infinite" : "none", border: question.trim() ? "none" : "1px solid rgba(255,255,255,0.05)", borderRadius: 10, color: question.trim() ? "#0d1117" : "#252f3a", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, cursor: question.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
                  DEBATE →
                </button>
              ) : (
                <button onClick={stop} style={{ height: 36, padding: "0 16px", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 10, color: "#cc4444", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>■ STOP</button>
              )}
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 10, fontFamily: "'DM Mono',monospace", fontSize: 9, color: "#1a2530", letterSpacing: 1 }}>
            Powered by real ChatGPT · Gemini · Claude APIs
          </div>
        </div>
      </footer>
    </div>
  );
}
