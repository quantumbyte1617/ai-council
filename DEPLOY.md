# AI Discussion Room — Deploy to Vercel
## Your friends get a live link in ~10 minutes

---

## STEP 1 — Get your API keys (5 mins)

### Claude (Anthropic)
1. Go to https://console.anthropic.com
2. Sign up / log in (separate from Claude.ai subscription)
3. Go to "API Keys" → Create new key
4. Copy it — starts with `sk-ant-...`
5. Add $5 credit under Billing

### ChatGPT (OpenAI)
1. Go to https://platform.openai.com
2. Sign up / log in (separate from ChatGPT Pro)
3. Go to "API Keys" → Create new key
4. Copy it — starts with `sk-...`
5. Add $5 credit under Billing

### Gemini (Google)
1. Go to https://aistudio.google.com
2. Click "Get API Key" → Create API key
3. Copy it
4. FREE — no billing needed up to generous limits

---

## STEP 2 — Put the project on GitHub (3 mins)

1. Go to https://github.com and create a free account if you don't have one
2. Click "New repository" → name it `ai-discussion-room` → Create
3. On your computer, open Terminal and run:

```bash
cd discussion-room
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-discussion-room.git
git push -u origin main
```

---

## STEP 3 — Deploy on Vercel (2 mins)

1. Go to https://vercel.com → Sign up with your GitHub account
2. Click "Add New Project"
3. Import your `ai-discussion-room` repository
4. Before clicking Deploy, click **"Environment Variables"** and add:

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | your sk-ant-... key |
| `OPENAI_API_KEY` | your sk-... key |
| `GEMINI_API_KEY` | your Google key |

5. Click **Deploy**
6. In ~1 minute you get a live URL like: `https://ai-discussion-room.vercel.app`

---

## STEP 4 — Share with friends

Send them the Vercel URL. Works on:
- iPhone Safari ✓
- Android Chrome ✓  
- Desktop browser ✓

No app install needed. They just open the link.

---

## Cost estimate for testing

One full debate = ~$0.03–0.06 total across all 3 APIs
100 test debates = ~$3–6 total

---

## To run locally first (optional)

```bash
cd discussion-room
cp .env.example .env.local
# Edit .env.local and paste your 3 API keys
npm install
npm run dev
```
Then open http://localhost:3000
