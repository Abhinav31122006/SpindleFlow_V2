# Quick Test Commands

## Overview
Provider and model configuration now in YAML `models` section. API key via CLI or env.

## Setup (One-time)
```bash
cd /Users/abhinavagarwal/Desktop/SpindleFlow_V2
cp .env.example .env
# Add API keys to .env or pass via --api-key flag
```

## YAML Structure (NEW)
```yaml
models:
  gemini:
    provider: gemini
    model: gemini-flash-latest
    max_tokens: 8000
  openai:
    provider: openai
    model: gpt-4o-mini
    max_tokens: 4096

provider: gemini  # Which model to use

agents: [...]
workflow: [...]
```

## Test File
```yaml
configs/test-gemini-openai.yml
# Contains: provider: gemini
```

## 1️⃣ Test with GEMINI

**YAML has**: `provider: gemini`

```bash
npm run dev -- run configs/test-gemini-openai.yml -i "Research the impact of AI on software development" --api-key "your_gemini_key"
```

**Or with GEMINI_API_KEY in .env:**
```bash
npm run dev -- run configs/test-gemini-openai.yml -i "Research the impact of AI on software development"
```

**Expected:** 
- ✅ Provider selected: gemini
- ✅ All 3 agents execute successfully
- ✅ Logs show gemini API calls

---

## 2️⃣ Test with OPENAI

**First, create a test YAML with OpenAI:**
```yaml
provider: openai

agents:
  - id: researcher
    role: "Market Researcher"
    goal: "Research and analyze market trends for the given topic"

  - id: analyst
    role: "Data Analyst"
    goal: "Analyze the research data and provide insights"

  - id: writer
    role: "Technical Writer"
    goal: "Write a comprehensive summary based on the analysis"

workflow:
  type: sequential
  steps:
    - agent: researcher
    - agent: analyst
    - agent: writer
```

Save as: `configs/test-openai.yml`

Then run:
```bash
npm run dev -- run configs/test-openai.yml -i "Research the impact of AI on software development" --api-key "your_openai_key"
```

**Or with OPENAI_API_KEY in .env:**
```bash
npm run dev -- run configs/test-openai.yml -i "Research the impact of AI on software development"
```

**Expected:**
- ✅ Provider selected: openai  
- ✅ All 3 agents execute successfully
- ✅ Logs show openai API calls

---

## 3️⃣ Test with Invalid Provider in YAML

Create invalid config:
```yaml
provider: anthropic  # INVALID!

agents: [...]
workflow: [...]
```

Expected error during parse:
```
❌ Zod validation error: Provider must be "openai" or "gemini"
```

---

## 📋 Workflow Structure

The test config has this structure:

```
Researcher Agent
      ↓
   Analyst Agent
      ↓
    Writer Agent
```

Each agent processes the user input sequentially using the selected LLM provider.

---

## 🔑 API Keys

**Gemini**: Get from https://aistudio.google.com/app/apikeys
**OpenAI**: Get from https://platform.openai.com/api/keys

Add to `.env`:
```dotenv
GEMINI_API_KEY=your_key
OPENAI_API_KEY=your_key
```

---

## ✅ Success Indicators

✓ Gemini test completes without errors  
✓ OpenAI test completes without errors  
✓ Invalid provider test throws expected error  
✓ Logs show correct provider name  
✓ All agents produce output  

**If all pass: Multi-provider restriction is working!**
