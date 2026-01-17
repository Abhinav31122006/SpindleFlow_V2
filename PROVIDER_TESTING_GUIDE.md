# Multi-Provider Testing Guide

## Overview

This guide walks you through testing the SpindleFlow system with both **Gemini** and **OpenAI** providers.

The system now supports **ONLY**:
- ✅ OpenAI
- ✅ Gemini
- ❌ Any other provider will be rejected

## Key Architecture Change

**Provider is now specified in YAML config, not environment variables!**

```yaml
provider: gemini  # or "openai"

agents: [...]
workflow: [...]
```

## Test Configuration

**File**: `configs/test-gemini-openai.yml`

This is a simple sequential workflow with 3 agents:
1. **Researcher** - Researches a topic
2. **Analyst** - Analyzes the research
3. **Writer** - Writes a summary

## Setup

### 1. Create `.env` file

```bash
cp .env.example .env
```

### 2. Add your API keys to `.env`

```dotenv
# For Gemini (Google)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_RPM=5

# For OpenAI
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_RPM=3

LOG_LEVEL=trace
```

Note: No `LLM_PROVIDER` env var needed - provider comes from YAML!

## Test Cases

### Test 1: Run with Gemini

**YAML Config** (`configs/test-gemini-openai.yml`):
```yaml
provider: gemini
agents: [...]
workflow: [...]
```

**Command:**
```bash
npm run dev -- run configs/test-gemini-openai.yml -i "Research the impact of AI on software development"
```

Or with explicit API key:
```bash
npm run dev -- run configs/test-gemini-openai.yml -i "Research the impact of AI on software development" --api-key "your_key"
```
npm run dev -- run configs/test-gemini-openai.yml -i "Research the impact of AI on software development"
```


**What to expect:**
- ✅ Loads config successfully
- ✅ Reads provider from YAML: `provider: gemini`
- ✅ Uses `GEMINI_API_KEY` from env
- ✅ Calls Gemini API for each agent
- ✅ Displays execution logs with provider: "gemini"

**Output will show:**
```
✅ LLM provider selected: gemini
🚀 Agent: researcher
🚀 Agent: analyst
🚀 Agent: writer
```

---

### Test 2: Run with OpenAI

**Create YAML Config** (`configs/test-openai.yml`):
```yaml
provider: openai

agents:
  - id: researcher
    role: "Market Researcher"
    goal: "Research and analyze market trends"
  
  - id: analyst
    role: "Data Analyst"
    goal: "Analyze the research data"
  
  - id: writer
    role: "Technical Writer"
    goal: "Write a comprehensive summary"

workflow:
  type: sequential
  steps:
    - agent: researcher
    - agent: analyst
    - agent: writer
```

**Command:**
```bash
npm run dev -- run configs/test-openai.yml -i "Research the impact of AI on software development"
```

Or with explicit API key:
```bash
npm run dev -- run configs/test-openai.yml -i "Research the impact of AI on software development" --api-key "your_key"
```

**What to expect:**
- ✅ Loads config successfully
- ✅ Reads provider from YAML: `provider: openai`
- ✅ Uses `OPENAI_API_KEY` from env
- ✅ Calls OpenAI API for each agent
- ✅ Displays execution logs with provider: "openai"

**Output will show:**
```
✅ LLM provider selected: openai
🚀 Agent: researcher
🚀 Agent: analyst
🚀 Agent: writer
```

---

### Test 4: Missing API Key

**Command (with no GEMINI_API_KEY set and no CLI key):**
```bash
unset GEMINI_API_KEY
npm run dev -- run configs/test-gemini-openai.yml -i "Test"
```

**Expected Error:**
```
❌ Error: No API key provided. Use --api-key or set GEMINI_API_KEY.
```

---

### Test 5: Provide API Key via CLI (Priority over env)

**Command with explicit API key:**
```bash
npm run dev -- run configs/test-gemini-openai.yml -i "Research AI" --api-key "your_gemini_key"
```

**What to expect:**
- ✅ Uses provided key via `--api-key` flag
- ✅ Does NOT require GEMINI_API_KEY in env
- ✅ Works with either provider (Gemini or OpenAI)

---

### Test 6: Provider Selection Default

**Default behavior** (when no explicit provider in common workflows):
```yaml
# config.yml - provider is OPTIONAL, defaults to gemini
agents:
  - id: agent1
    role: "Test"
    goal: "Test"

workflow:
  type: sequential
  steps:
    - agent: agent1
```

**Command:**
```bash
npm run dev -- run config.yml -i "Test"
```

**What to expect:**
- ✅ Uses `provider: gemini` (default)
- ✅ Uses `GEMINI_API_KEY` env var
- ✅ Workflow executes with Gemini

---

## Verification Checklist

After running tests, verify:

- [ ] **Test 1 - Gemini from YAML**: Config with `provider: gemini` works correctly
- [ ] **Test 2 - OpenAI from YAML**: Config with `provider: openai` works correctly
- [ ] **Test 3 - Invalid provider rejected**: YAML with `provider: anthropic` fails validation
- [ ] **Test 4 - Missing API key caught**: Error thrown when API key not provided
- [ ] **Test 5 - CLI API key works**: `--api-key` flag overrides env vars
- [ ] **Test 6 - Default to Gemini**: Missing provider field defaults to gemini
- [ ] **Logs show correct provider**: Check execution logs display "gemini" or "openai"
- [ ] **No code breaks**: All orchestrators, reporters, context work unchanged
- [ ] **Type safety**: Zod validates provider enum strictly

---

## Provider Implementation Details

### Gemini Provider
- **File**: `src/llm/gemini.ts`
- **Model**: `gemini-flash-latest`
- **Rate Limit Env**: `GEMINI_RPM` (default: 5)
- **SDK**: `@google/generative-ai`

### OpenAI Provider
- **File**: `src/llm/openai.ts`
- **Model**: `gpt-4o-mini` (configurable)
- **Rate Limit Env**: `OPENAI_RPM` (default: 3)
- **SDK**: `openai`

### Provider Selection Flow

```
environment variable (LLM_PROVIDER)
    ↓
getLLMProvider() validates provider
    ↓
provider !== "openai" && provider !== "gemini"? 
    ↓ YES → Throw error
    ↓ NO
Resolve API key (GEMINI_API_KEY or OPENAI_API_KEY)
    ↓
Instantiate correct provider class
    ↓
Return LLMProvider interface
```

---

## Troubleshooting

### Error: "Unsupported LLM provider: ..."
**Cause**: `LLM_PROVIDER` is set to something other than "openai" or "gemini"  
**Fix**: Set `LLM_PROVIDER=gemini` or `LLM_PROVIDER=openai`

### Error: "No API key provided"
**Cause**: Correct API key env var not set  
**Fix**: 
- For Gemini: `export GEMINI_API_KEY=...`
- For OpenAI: `export OPENAI_API_KEY=...`

### Error: "GEMINI_API_KEY is not set" 
**Cause**: Trying to use Gemini without API key  
**Fix**: `export GEMINI_API_KEY=your_key_here`

### Error: "OPENAI_API_KEY is not set"
**Cause**: Trying to use OpenAI without API key  
**Fix**: `export OPENAI_API_KEY=your_key_here`

---

## Files Created/Modified

### New Files
- `src/llm/openai.ts` - OpenAI provider implementation
- `configs/test-gemini-openai.yml` - Test workflow configuration
- `TEST_PROVIDERS.sh` - Testing script
- `PROVIDER_TESTING_GUIDE.md` - This file

### Modified Files
- `src/llm/index.ts` - Provider selector (now supports both)
- `package.json` - Added openai SDK
- `.env.example` - Added OPENAI_API_KEY example

---

## Next Steps

1. ✅ Set up `.env` with your API keys
2. ✅ Run Test 1 (Gemini)
3. ✅ Run Test 3 (OpenAI)
4. ✅ Run Test 4 (Invalid provider - verify rejection)
5. ✅ Check all output logs

All tests passing means the multi-provider restriction is working correctly!
