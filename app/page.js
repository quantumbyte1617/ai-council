"use client";
import { useState, useRef, useEffect } from "react";

const MAX_DEBATE_ROUNDS = 4;

const AI_PERSONAS = [
  { id: "chatgpt", name: "ChatGPT", model: "GPT-4o", apiRoute: "/api/chatgpt", initial: "G",
    blindPrompt: `You are ChatGPT (GPT-4o) by OpenAI. Answer the following question independently and thoroughly. Give your best factual answer. Be confident and clear. 3-5 sentences.`,
    debatePrompt: `You are ChatGPT (GPT-4o) by OpenAI in a live factual debate. You have seen everyone's answers including previous debate rounds. Critically evaluate what was said — name names, point out where another AI was wrong or incomplete, defend your own previous points if challenged, and add new arguments. Be direct, factual, specific. Reference others by name. 3-5 sentences. No fluff.` },
  { id: "gemini", name: "Gemini", model: "Gemini 1.5 Pro", apiRoute: "/api/gemini", initial: "◈",
    blindPrompt: `You are Gemini (1.5 Pro) by Google. Answer the following question independently and thoroughly. Give your best factual answer. Be confident and clear. 3-5 sentences.`,
    debatePrompt: `You are Gemini (1.5 Pro) by Google in a live factual debate. You have seen everyone's answers including previous debate rounds. Critically evaluate what was said — name names, point out where another AI was wrong or incomplete, defend your own previous points if challenged, and add new arguments. Be direct, factual, specific. Reference others by name. 3-5 sentences. No fluff.` },
  { id: "claude", name: "Claude", model: "Claude Opus 4", apiRoute: "/api/claude", initial: "◆",
    blindPrompt: `You are Claude (Opus 4) by Anthropic. Answer the following question independently and thoroughly. Give your best factual answer. Be confident and clear. 3-5 sentences.`,
    debatePrompt: `You are Claude (Opus 4) by Anthropic in a live factual debate. You have seen everyone's answers including previous debate rounds. Critically evaluate what was said — name names, point out where another AI was wrong or incomplete, defend your own previous points if challenged, and add new arguments. Be direct, factual, specific. Reference others by name. 3-5 sentences. No fluff.` },
];

const COUNCIL_FINAL_SYSTEM = `You are the synthesizer for the Council of AI — a panel that has just completed a multi-round debate. Deliver the FINAL answer on behalf of the entire council: determine what is most factually correct, where there was disagreement choose the most defensible position, write a clear polished complete answer the user can trust. 4-6 sentences, authoritative and direct. Do NOT reference the debate process or mention any individual AI by name. Speak directly to the user as the unified voice of the council.`;

const PRESET_TOPICS = [
  { emoji: "🧠", label: "Ethics", question: "Is it ethical for AI to make life-or-death decisions in healthcare?" },
  { emoji: "🚀", label: "Technology", question: "Will quantum computing make current encryption obsolete?" },
  { emoji: "🌍", label: "Science", question: "Should humanity prioritize Mars colonization or ocean exploration?" },
  { emoji: "⚡", label: "Hypothetical", question: "If AI could dream, what would it dream about?" },
];

function getAIColors(id, dark) {
  const c = {
    chatgpt: dark ? { color: "#10b981", dim: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", glow: "rgba(16,185,129,0.2)" }
                   : { color: "#059669", dim: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.2)", glow: "rgba(5,150,105,0.15)" },
    gemini: dark ? { color: "#60a5fa", dim: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.25)", glow: "rgba(96,165,250,0.2)" }
                 : { color: "#2563eb", dim: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.2)", glow: "rgba(37,99,235,0.15)" },
    claude: dark ? { color: "#f59e0b", dim: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", glow: "rgba(245,158,11,0.2)" }
                 : { color: "#c2570a", dim: "rgba(194,87,10,0.08)", border: "rgba(194,87,10,0.2)", glow: "rgba(194,87,10,0.15)" },
  };
  return c[id];
}

function getTheme(dark) {
  return dark ? {
    bg: "#2b2a27", text: "#eee", title: "#fff",
    textSec: "#999", textMut: "#777", textDim: "#666", textFaint: "#555",
    headerBg: "rgba(43,42,39,0.95)", footerBg: "rgba(43,42,39,0.98)",
    border: "rgba(255,255,255,0.06)", borderMed: "rgba(255,255,255,0.08)",
    surface: "rgba(255,255,255,0.025)", surfaceH: "rgba(255,255,255,0.04)", surfaceA: "rgba(255,255,255,0.05)",
    inputBg: "rgba(255,255,255,0.03)", inputBorder: "rgba(255,255,255,0.07)",
    cardBg: "rgba(255,255,255,0.025)", cardBorder: "rgba(255,255,255,0.06)",
    scrollTrack: "#2b2a27", scrollThumb: "#454340",
    msgText: "#ccc",
    bubbleG1: "rgba(255,255,255,0.06)", bubbleG2: "rgba(255,255,255,0.03)",
    bubbleBorder: "rgba(255,255,255,0.1)", bubbleShadow: "rgba(0,0,0,0.25)",
    vc: "#c9a84c", vDim: "rgba(201,168,76,0.1)", vBorder: "rgba(201,168,76,0.25)", vGlow: "rgba(201,168,76,0.2)",
    vText: "#ede0c0", vBadge: "#aa9a50",
    stopBg: "rgba(255,80,80,0.08)", stopBorder: "rgba(255,80,80,0.2)",
    dActBg: "rgba(16,185,129,0.05)", dActBorder: "rgba(16,185,129,0.15)",
    dChkBg: "rgba(16,185,129,0.1)", dChkBorder: "rgba(16,185,129,0.25)", dChkColor: "#10b981",
    roundBg: "rgba(255,255,255,0.03)", roundBorder: "rgba(255,255,255,0.07)",
    roundDebBg: "rgba(180,140,50,0.08)", roundDebBorder: "rgba(180,140,50,0.18)",
    gradient: "linear-gradient(135deg, #10b981, #60a5fa, #f59e0b)",
  } : {
    bg: "#F5F5F0", text: "#3d3929", title: "#1a1a18",
    textSec: "#7a7570", textMut: "#9a9488", textDim: "#b5b0a8", textFaint: "#c5c0b8",
    headerBg: "rgba(245,245,240,0.95)", footerBg: "rgba(245,245,240,0.98)",
    border: "rgba(0,0,0,0.06)", borderMed: "rgba(0,0,0,0.08)",
    surface: "rgba(0,0,0,0.02)", surfaceH: "rgba(0,0,0,0.03)", surfaceA: "rgba(0,0,0,0.04)",
    inputBg: "rgba(0,0,0,0.03)", inputBorder: "rgba(0,0,0,0.07)",
    cardBg: "rgba(0,0,0,0.02)", cardBorder: "rgba(0,0,0,0.05)",
    scrollTrack: "#F5F5F0", scrollThumb: "#d5d0c8",
    msgText: "#4a4540",
    bubbleG1: "rgba(0,0,0,0.04)", bubbleG2: "rgba(0,0,0,0.02)",
    bubbleBorder: "rgba(0,0,0,0.08)", bubbleShadow: "rgba(0,0,0,0.04)",
    vc: "#9a7a20", vDim: "rgba(154,122,32,0.08)", vBorder: "rgba(154,122,32,0.2)", vGlow: "rgba(154,122,32,0.15)",
    vText: "#3d3929", vBadge: "#8a7a40",
    stopBg: "rgba(220,60,60,0.06)", stopBorder: "rgba(220,60,60,0.15)",
    dActBg: "rgba(5,150,105,0.04)", dActBorder: "rgba(5,150,105,0.15)",
    dChkBg: "rgba(5,150,105,0.08)", dChkBorder: "rgba(5,150,105,0.2)", dChkColor: "#059669",
    roundBg: "rgba(0,0,0,0.03)", roundBorder: "rgba(0,0,0,0.06)",
    roundDebBg: "rgba(180,140,50,0.06)", roundDebBorder: "rgba(180,140,50,0.15)",
    gradient: "linear-gradient(135deg, #059669, #2563eb, #c2570a)",
  };
}

async function callAI(persona, systemPrompt, userPrompt) {
  const res = await fetch(persona.apiRoute, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system: systemPrompt, prompt: userPrompt }) });
  const data = await res.json();
  return data.text || "Unable to respond at this time.";
}

function buildBlindContext(q) { return `QUESTION: "${q}"\n\nGive your independent answer:`; }

function buildDebateContext(q, msgs, name) {
  let ctx = `ORIGINAL QUESTION: "${q}"\n\n=== ALL RESPONSES SO FAR ===\n\n`;
  const byRound = {};
  msgs.forEach((m) => { if (!byRound[m.round]) byRound[m.round] = []; byRound[m.round].push(m); });
  Object.keys(byRound).sort().forEach((r) => {
    ctx += `--- ${parseInt(r) === 1 ? "INITIAL ANSWERS" : `DEBATE ROUND ${r}`} ---\n`;
    byRound[r].forEach((m) => { ctx += `\n${m.personaName}: ${m.text}\n`; });
    ctx += "\n";
  });
  ctx += `\nYour turn, ${name}. Critically engage — reference specific points and names:`;
  return ctx;
}

function isSimpleGreeting(text) {
  const n = text.toLowerCase().replace(/[!?.,;:'"…\-()]/g, '').trim();
  const g = ['hi','hello','hey','howdy','sup','yo','hola','greetings','good morning','good afternoon','good evening','good night','whats up',"what's up",'wassup','hii','hiii','heya','hey there','hi there','hello there','thanks','thank you','bye','goodbye','good bye','see you','see ya','later','gn','gm'];
  return g.some((x) => n === x) || (n.split(/\s+/).length <= 3 && g.some((x) => n.startsWith(x)));
}

function checkConsensus(messages, round) {
  if (round < 3) return false;
  const last = messages.filter((m) => m.round === round);
  if (last.length < 3) return false;
  const w = ["agree","consensus","aligned","correct","all three","we all","settled","no further disagreement"];
  return last.filter((m) => w.some((x) => m.text.toLowerCase().includes(x))).length >= 2;
}

// ── Components ─────────────────────────────────

function PulsingDots({ color }) {
  return (
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center", padding: "2px 0" }}>
      {[0,1,2].map((i) => (
        <span key={i} style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: color, opacity: 0.9, animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </span>
  );
}

function AIBadge({ persona, ac, isActive, isDone, enabled, onToggle, isRunning, t }) {
  return (
    <div
      onClick={() => !isRunning && onToggle()}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "6px 10px", flex: 1,
        background: !enabled ? t.surface : isActive ? ac.dim : t.surface,
        border: `1px solid ${!enabled ? t.border : isActive ? ac.border : t.border}`,
        borderRadius: 10, cursor: isRunning ? "default" : "pointer",
        transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        transform: isActive ? "translateY(-2px)" : "none",
        boxShadow: isActive ? `0 4px 16px ${ac.glow}` : "none",
        opacity: enabled ? 1 : 0.4,
        position: "relative",
      }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: isActive ? ac.dim : t.surfaceH,
        border: `1.5px solid ${isActive ? ac.color : t.borderMed}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, color: isActive ? ac.color : isDone && enabled ? ac.color : t.textDim,
        fontWeight: 700, transition: "all 0.4s",
        boxShadow: isActive ? `0 0 12px ${ac.glow}` : "none",
        animation: isActive ? "badgePulse 1.8s ease infinite" : "none",
      }}>
        {persona.initial}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 600, color: isActive ? ac.color : isDone && enabled ? t.textSec : t.textDim, letterSpacing: 0.5, transition: "color 0.4s" }}>{persona.name}</div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: t.textFaint, marginTop: 1 }}>{persona.model}</div>
      </div>
      {isActive && enabled && <PulsingDots color={ac.color} />}
      {!enabled && (
        <div style={{ position: "absolute", top: 3, right: 5, fontFamily: "'DM Mono',monospace", fontSize: 6, color: t.textMut, letterSpacing: 0.5, background: t.surfaceA, padding: "1px 4px", borderRadius: 3, border: `1px solid ${t.border}` }}>OFF</div>
      )}
    </div>
  );
}

function RoundDivider({ round, t }) {
  const isBlind = round === 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "32px 0 24px", animation: "fadeIn 0.4s ease-out" }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${t.border})` }} />
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "5px 14px",
        background: isBlind ? t.roundBg : t.roundDebBg,
        border: `1px solid ${isBlind ? t.roundBorder : t.roundDebBorder}`,
        borderRadius: 20,
      }}>
        <span style={{ fontSize: 8, color: isBlind ? t.textMut : "#9a7a20" }}>{isBlind ? "○" : "◉"}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: isBlind ? t.textMut : "#9a7a20", whiteSpace: "nowrap" }}>
          {isBlind ? "INDEPENDENT ANSWERS" : `DEBATE ROUND ${round - 1}`}
        </span>
      </div>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${t.border}, transparent)` }} />
    </div>
  );
}

function UserBubble({ text, t }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32, animation: "slideFromRight 0.4s cubic-bezier(0.34,1.2,0.64,1)" }}>
      <div style={{ maxWidth: "72%", minWidth: 120 }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.textMut, textAlign: "right", marginBottom: 6, letterSpacing: 1.5 }}>YOU ASKED</div>
        <div style={{
          background: `linear-gradient(135deg, ${t.bubbleG1}, ${t.bubbleG2})`,
          border: `1px solid ${t.bubbleBorder}`,
          borderRadius: "16px 3px 16px 16px", padding: "14px 18px",
          color: t.text, fontSize: 15.5, lineHeight: 1.65,
          fontFamily: "'Playfair Display',Georgia,serif",
          boxShadow: `0 2px 12px ${t.bubbleShadow}`,
        }}>{text}</div>
      </div>
    </div>
  );
}

function AIMessage({ msg, ac, persona, delay = 0, t }) {
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 14, animation: `slideFromLeft 0.4s cubic-bezier(0.34,1.2,0.64,1) ${delay}s both` }}>
      <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, marginTop: 2, background: ac.dim, border: `1.5px solid ${ac.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: ac.color, fontWeight: 700 }}>{persona.initial}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ color: ac.color, fontWeight: 700, fontSize: 12, fontFamily: "'DM Mono',monospace", letterSpacing: 0.5 }}>{persona.name}</span>
          <span style={{ fontSize: 9, color: t.textMut, fontFamily: "'DM Mono',monospace", background: t.surfaceH, border: `1px solid ${t.border}`, padding: "2px 6px", borderRadius: 4 }}>{persona.model}</span>
        </div>
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderLeft: `2px solid ${ac.border}`, borderRadius: "0 12px 12px 12px", padding: "12px 16px", color: t.msgText, fontSize: 14, lineHeight: 1.75, fontFamily: "'Lora',Georgia,serif" }}>{msg.text}</div>
      </div>
    </div>
  );
}

function TypingMessage({ ac, persona, t }) {
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 14, animation: "fadeIn 0.3s ease-out" }}>
      <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, marginTop: 2, background: ac.dim, border: `1.5px solid ${ac.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: ac.color, fontWeight: 700, animation: "badgePulse 1.8s ease infinite", boxShadow: `0 0 12px ${ac.glow}` }}>{persona.initial}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ color: ac.color, fontWeight: 700, fontSize: 12, fontFamily: "'DM Mono',monospace" }}>{persona.name}</span>
          <span style={{ color: t.textMut, fontSize: 10, fontFamily: "'DM Mono',monospace" }}>thinking...</span>
        </div>
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderLeft: `2px solid ${ac.border}`, borderRadius: "0 12px 12px 12px", padding: "14px 18px", display: "inline-block" }}>
          <PulsingDots color={ac.color} />
        </div>
      </div>
    </div>
  );
}

function DebateSection({ isOpen, onToggle, rounds, messages, typingAI, typingPersona, isFinalLoading, phase, debateStartTime, debateEndTime, dark, t }) {
  const isDebating = phase !== "idle" && phase !== "done" && phase !== "stopped" && !isFinalLoading;
  const isComplete = phase === "done" || phase === "synthesizing" || isFinalLoading;
  const maxRound = messages.length > 0 ? Math.max(...messages.map(m => m.round)) : 0;
  const totalDebateRounds = MAX_DEBATE_ROUNDS - 1;
  const elapsedSeconds = debateEndTime && debateStartTime ? Math.round((debateEndTime - debateStartTime) / 1000) : null;

  let statusLabel = "";
  if (isDebating) {
    statusLabel = phase === "round1" ? "Gathering independent answers..." : `Debating... Round ${maxRound - 1} of ${totalDebateRounds}`;
  } else if (isComplete) {
    statusLabel = elapsedSeconds ? `Debated in ${Math.max(maxRound - 1, 1)} round${maxRound - 1 !== 1 ? "s" : ""} (${elapsedSeconds}s)` : `Debated in ${Math.max(maxRound - 1, 1)} round${maxRound - 1 !== 1 ? "s" : ""}`;
  } else {
    statusLabel = `Debate transcript — ${messages.length} messages`;
  }

  if (messages.length === 0 && !typingAI) return null;

  return (
    <div style={{ marginBottom: 8, animation: "fadeIn 0.4s ease-out" }}>
      <button onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: isDebating ? t.dActBg : t.surface, border: `1px solid ${isDebating ? t.dActBorder : t.border}`, borderRadius: isOpen ? "12px 12px 0 0" : 12, cursor: "pointer", transition: "all 0.3s ease" }}>
        {isDebating ? (
          <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${t.dChkBorder}`, borderTopColor: t.dChkColor, animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: t.dChkBg, border: `1px solid ${t.dChkBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.dChkColor, fontSize: 9, flexShrink: 0 }}>✓</div>
        )}
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: isDebating ? t.dChkColor : t.textSec, letterSpacing: 0.5, flex: 1, textAlign: "left" }}>{statusLabel}</span>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {AI_PERSONAS.map(p => { const ac = getAIColors(p.id, dark); return (
            <div key={p.id} style={{ width: 6, height: 6, borderRadius: "50%", background: ac.color, opacity: isDebating && typingAI === p.id ? 1 : 0.35, transition: "opacity 0.3s", boxShadow: isDebating && typingAI === p.id ? `0 0 6px ${ac.color}` : "none" }} />
          ); })}
        </div>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: t.textMut, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease", display: "inline-block" }}>▾</span>
      </button>
      {isOpen && (
        <div style={{ border: `1px solid ${t.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "4px 16px 16px", background: t.surface, maxHeight: 600, overflowY: "auto", animation: "fadeIn 0.3s ease-out" }}>
          {Object.keys(rounds).sort((a, b) => a - b).map((round) => (
            <div key={round}>
              <RoundDivider round={parseInt(round)} t={t} />
              {rounds[round].map((msg) => {
                const persona = AI_PERSONAS.find(p => p.id === msg.personaId);
                const ac = getAIColors(persona.id, dark);
                return <AIMessage key={msg.id} msg={msg} persona={persona} ac={ac} t={t} delay={0} />;
              })}
            </div>
          ))}
          {typingAI && typingPersona && !isFinalLoading && <TypingMessage persona={typingPersona} ac={getAIColors(typingPersona.id, dark)} t={t} />}
        </div>
      )}
    </div>
  );
}

function FinalVerdict({ text, isLoading, t }) {
  return (
    <div style={{ animation: "fadeIn 0.6s ease-out", marginTop: 24, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${t.vBorder})` }} />
        <div style={{ padding: "8px 20px", background: `linear-gradient(135deg, ${t.vDim}, rgba(0,0,0,0))`, border: `1px solid ${t.vBorder}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.vc, boxShadow: `0 0 8px ${t.vGlow}`, animation: isLoading ? "badgePulse 1s ease infinite" : "none" }} />
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2.5, color: t.vc, fontWeight: 600 }}>COUNCIL OF AI — FINAL ANSWER</span>
        </div>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${t.vBorder}, transparent)` }} />
      </div>
      <div style={{ position: "relative", overflow: "hidden", background: `linear-gradient(145deg, ${t.vDim} 0%, rgba(0,0,0,0) 100%)`, border: `1px solid ${t.vBorder}`, borderRadius: 16, padding: "24px 28px", boxShadow: `0 2px 24px ${t.vGlow}` }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, ${t.vDim}, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: t.vDim, border: `2px solid ${isLoading ? t.vc : t.vBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: t.vc, fontWeight: 700, boxShadow: `0 0 ${isLoading ? 16 : 8}px ${t.vGlow}`, animation: isLoading ? "badgePulse 1.5s ease infinite" : "none" }}>⚖</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ color: t.vc, fontWeight: 700, fontSize: 13, fontFamily: "'DM Mono',monospace" }}>Council of AI</span>
              <span style={{ color: t.vBadge, fontSize: 9, fontFamily: "'DM Mono',monospace", background: t.vDim, border: `1px solid ${t.vBorder}`, padding: "2px 7px", borderRadius: 4 }}>Consensus Answer</span>
            </div>
            <div style={{ color: t.vText, fontSize: 15, lineHeight: 1.85, fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700 }}>
              {isLoading ? <PulsingDots color={t.vc} /> : text}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Renders a completed conversation from history
function ConversationThread({ conv, dark, t }) {
  const rounds = {};
  conv.messages.forEach((m) => { if (!rounds[m.round]) rounds[m.round] = []; rounds[m.round].push(m); });

  return (
    <div style={{ marginBottom: 16 }}>
      <UserBubble text={conv.question} t={t} />
      {conv.isGreeting ? (
        Object.keys(rounds).sort((a, b) => a - b).map((round) => (
          <div key={round}>
            <RoundDivider round={parseInt(round)} t={t} />
            {rounds[round].map((msg, i) => {
              const persona = AI_PERSONAS.find(p => p.id === msg.personaId);
              const ac = getAIColors(persona.id, dark);
              return <AIMessage key={msg.id} msg={msg} persona={persona} ac={ac} t={t} delay={0} />;
            })}
          </div>
        ))
      ) : (
        <>
          <DebateSection isOpen={conv.debateOpen} onToggle={() => {}} rounds={rounds} messages={conv.messages} typingAI={null} typingPersona={null} isFinalLoading={false} phase="done" debateStartTime={conv.debateStartTime} debateEndTime={conv.debateEndTime} dark={dark} t={t} />
          {conv.finalAnswer && <FinalVerdict text={conv.finalAnswer} isLoading={false} t={t} />}
        </>
      )}
      {/* Follow-up divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "24px 0 16px" }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${t.border})` }} />
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: t.textFaint, letterSpacing: 2 }}>FOLLOW-UP</span>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${t.border}, transparent)` }} />
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
  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [enabledAIs, setEnabledAIs] = useState(new Set(["chatgpt", "gemini", "claude"]));
  const bottomRef = useRef(null);
  const stopRef = useRef(false);

  const t = getTheme(darkMode);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingAI, finalAnswer, isFinalLoading]);

  const toggleAI = (id) => {
    setEnabledAIs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 2) return prev; // minimum 2
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const runDiscussion = async (presetQ) => {
    const q = (presetQ || question).trim();
    if (!q || isRunning) return;

    // Save previous conversation to history if exists
    if (submitted && (phase === "done" || phase === "stopped")) {
      setHistory(prev => [...prev, {
        question: submitted, messages: [...messages], finalAnswer,
        isGreeting: isSimpleGreeting(submitted), debateOpen, debateStartTime, debateEndTime,
      }]);
    }

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

    const activePersonas = AI_PERSONAS.filter(p => enabledAIs.has(p.id));
    const msgs = [];
    let consensusReached = false;
    const skipDebate = isSimpleGreeting(q);

    setStatus(skipDebate ? "Each AI responds..." : "Round 1 — each AI answers independently...");
    for (const p of activePersonas) {
      if (stopRef.current) break;
      setTypingAI(p.id);
      const text = await callAI(p, p.blindPrompt, buildBlindContext(q));
      msgs.push({ id: `${p.id}-1`, personaId: p.id, personaName: p.name, text, round: 1 });
      setMessages([...msgs]);
      setTypingAI(null);
      await new Promise((r) => setTimeout(r, 300));
    }

    if (skipDebate || stopRef.current) {
      setDebateEndTime(Date.now()); setIsRunning(false); setPhase("done"); setIsDone(true);
      setStatus(stopRef.current ? "Stopped." : ""); return;
    }

    for (let round = 2; round <= MAX_DEBATE_ROUNDS && !stopRef.current && !consensusReached; round++) {
      setPhase(`round${round}`);
      setStatus(`Debate round ${round - 1} of ${MAX_DEBATE_ROUNDS - 1}...`);
      for (const p of activePersonas) {
        if (stopRef.current) break;
        setTypingAI(p.id);
        const text = await callAI(p, p.debatePrompt, buildDebateContext(q, msgs, p.name));
        msgs.push({ id: `${p.id}-${round}`, personaId: p.id, personaName: p.name, text, round });
        setMessages([...msgs]);
        setTypingAI(null);
        await new Promise((r) => setTimeout(r, 300));
      }
      if (checkConsensus(msgs, round)) { consensusReached = true; setStatus("Consensus reached..."); }
    }

    if (stopRef.current) { setDebateEndTime(Date.now()); setIsRunning(false); setPhase("stopped"); setStatus("Stopped."); return; }

    setDebateEndTime(Date.now());
    setPhase("synthesizing");
    setStatus("Council is synthesizing the final answer...");
    setIsFinalLoading(true);
    const synthPersona = activePersonas.find(p => p.id === "gemini") || activePersonas[0];
    setTypingAI(synthPersona.id);
    const fullCtx = `ORIGINAL QUESTION: "${q}"\n\nFULL DEBATE TRANSCRIPT:\n\n` + msgs.map(m => `[Round ${m.round}] ${m.personaName}: ${m.text}`).join("\n\n");
    const final = await callAI(synthPersona, COUNCIL_FINAL_SYSTEM, fullCtx);
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
    setHistory([]);
  };

  const rounds = {};
  messages.forEach((m) => { if (!rounds[m.round]) rounds[m.round] = []; rounds[m.round].push(m); });
  const typingPersona = AI_PERSONAS.find(p => p.id === typingAI);
  const isGreeting = submitted && isSimpleGreeting(submitted);
  const showIdle = phase === "idle" && !submitted && history.length === 0;

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, display: "flex", flexDirection: "column", fontFamily: "'Lora',Georgia,serif", transition: "background 0.4s, color 0.4s" }}>
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
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:${t.scrollTrack}} ::-webkit-scrollbar-thumb{background:${t.scrollThumb};border-radius:2px}
        button{cursor:pointer;transition:all 0.25s;border:none;outline:none}
        textarea{outline:none;resize:none}
        ::placeholder{color:${t.textDim}}
      `}</style>

      {/* Header */}
      <header style={{ padding: "10px 16px", borderBottom: `1px solid ${t.border}`, position: "sticky", top: 0, zIndex: 20, background: t.headerBg, backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: t.gradient, backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>AI</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 15, fontWeight: 700, color: t.title, letterSpacing: -0.3 }}>Discussion Room</h1>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: t.textDim, letterSpacing: 2, marginTop: 1 }}>MULTI-AI DEBATE PROTOCOL</div>
          </div>
          {/* Dark mode toggle */}
          <button onClick={() => setDarkMode(prev => !prev)} style={{ width: 32, height: 32, borderRadius: 8, background: t.surfaceA, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: t.textMut, flexShrink: 0 }} title={darkMode ? "Light mode" : "Dark mode"}>
            {darkMode ? "☀" : "🌙"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          {AI_PERSONAS.map((p) => {
            const ac = getAIColors(p.id, darkMode);
            return <AIBadge key={p.id} persona={p} ac={ac} isActive={typingAI === p.id} isDone={isDone} enabled={enabledAIs.has(p.id)} onToggle={() => toggleAI(p.id)} isRunning={isRunning} t={t} />;
          })}
        </div>
        {enabledAIs.size < 3 && (
          <div style={{ textAlign: "center", marginTop: 4, fontFamily: "'DM Mono',monospace", fontSize: 7, color: t.textFaint, letterSpacing: 1 }}>
            Tap badges to toggle AIs · min 2 required
          </div>
        )}
      </header>

      {/* Main */}
      <main style={{ flex: 1, maxWidth: 820, width: "100%", margin: "0 auto", padding: "28px 20px 100px" }}>
        {showIdle && (
          <div style={{ textAlign: "center", marginTop: 80, animation: "fadeIn 0.6s ease-out" }}>
            <div style={{ display: "inline-flex", gap: 16, marginBottom: 24, alignItems: "center" }}>
              {AI_PERSONAS.map((p, i) => {
                const ac = getAIColors(p.id, darkMode);
                return (
                  <div key={p.id} style={{ width: 50, height: 50, borderRadius: "50%", background: ac.dim, border: `1px solid ${ac.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: ac.color, opacity: enabledAIs.has(p.id) ? 0.5 : 0.15, animation: `fadeIn 0.6s ease-out ${i * 0.15}s both`, transition: "opacity 0.3s" }}>{p.initial}</div>
                );
              })}
            </div>
            <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textDim, letterSpacing: 3, marginBottom: 8 }}>POSE A QUESTION TO BEGIN</p>
            <p style={{ fontFamily: "'Lora',Georgia,serif", fontSize: 13, color: t.textMut, fontStyle: "italic", marginBottom: 28 }}>
              {enabledAIs.size} AIs debate your question, then deliver a unified Council answer.
            </p>
            {/* Preset topic buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 400, margin: "0 auto" }}>
              {PRESET_TOPICS.map((topic) => (
                <button key={topic.label} onClick={() => runDiscussion(topic.question)} style={{
                  padding: "8px 14px", borderRadius: 20,
                  background: t.surfaceH, border: `1px solid ${t.border}`,
                  color: t.textSec, fontSize: 12, fontFamily: "'DM Mono',monospace",
                  display: "flex", alignItems: "center", gap: 6,
                  letterSpacing: 0.3,
                }}>
                  <span style={{ fontSize: 14 }}>{topic.emoji}</span>
                  {topic.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History (completed conversations) */}
        {history.map((conv, i) => <ConversationThread key={i} conv={conv} dark={darkMode} t={t} />)}

        {/* Current conversation */}
        {submitted && <UserBubble text={submitted} t={t} />}

        {submitted && !isGreeting && (messages.length > 0 || typingAI) && (
          <DebateSection isOpen={debateOpen} onToggle={() => setDebateOpen(prev => !prev)} rounds={rounds} messages={messages} typingAI={typingAI} typingPersona={typingPersona} isFinalLoading={isFinalLoading} phase={phase} debateStartTime={debateStartTime} debateEndTime={debateEndTime} dark={darkMode} t={t} />
        )}

        {isGreeting && Object.keys(rounds).sort((a, b) => a - b).map((round) => (
          <div key={round}>
            <RoundDivider round={parseInt(round)} t={t} />
            {rounds[round].map((msg, i) => {
              const persona = AI_PERSONAS.find(p => p.id === msg.personaId);
              const ac = getAIColors(persona.id, darkMode);
              return <AIMessage key={msg.id} msg={msg} persona={persona} ac={ac} t={t} delay={i * 0.05} />;
            })}
          </div>
        ))}
        {isGreeting && typingAI && typingPersona && <TypingMessage persona={typingPersona} ac={getAIColors(typingPersona.id, darkMode)} t={t} />}

        {(isFinalLoading || finalAnswer) && <FinalVerdict text={finalAnswer} isLoading={isFinalLoading} t={t} />}

        <div ref={bottomRef} style={{ height: 40 }} />
      </main>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${t.border}`, padding: "12px 12px 16px", background: t.footerBg, position: "sticky", bottom: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          {status && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.textMut, letterSpacing: 1.5 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: isRunning ? t.dChkColor : t.textFaint, boxShadow: isRunning ? `0 0 8px ${t.dChkColor}40` : "none", animation: isRunning ? "badgePulse 1.2s ease infinite" : "none", flexShrink: 0 }} />
              {status}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 14, padding: "8px 8px 8px 14px" }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={history.length > 0 || submitted ? "Ask a follow-up..." : "Ask the panel a question..."}
              disabled={isRunning}
              rows={1}
              style={{ flex: 1, background: "transparent", border: "none", color: t.text, fontSize: 14, fontFamily: "'Lora',Georgia,serif", lineHeight: 1.5, padding: 0, opacity: isRunning ? 0.4 : 1 }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isRunning) { e.preventDefault(); runDiscussion(); } }}
            />
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              <button onClick={reset} style={{ width: 32, height: 32, borderRadius: 8, background: t.surfaceA, border: `1px solid ${t.border}`, color: t.textMut, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }} title="Reset all">↺</button>
              {!isRunning ? (
                <button onClick={() => runDiscussion()} disabled={!question.trim()} style={{ height: 32, padding: "0 14px", background: question.trim() ? t.gradient : t.surfaceA, backgroundSize: "200% 200%", animation: question.trim() ? "gradientShift 3s ease infinite" : "none", border: question.trim() ? "none" : `1px solid ${t.border}`, borderRadius: 8, color: question.trim() ? "#fff" : t.textFaint, fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: 1.5, cursor: question.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
                  DEBATE →
                </button>
              ) : (
                <button onClick={stop} style={{ height: 32, padding: "0 12px", background: t.stopBg, border: `1px solid ${t.stopBorder}`, borderRadius: 8, color: "#cc4444", fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>■ STOP</button>
              )}
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 6, fontFamily: "'DM Mono',monospace", fontSize: 8, color: t.textFaint, letterSpacing: 1 }}>
            Powered by real ChatGPT · Gemini · Claude APIs
          </div>
        </div>
      </footer>
    </div>
  );
}
