# Architecture Update: Provider in YAML, API Key in CLI

## Summary

The provider selection has been moved from environment variables to the YAML configuration file.

### Before (Option A)
```bash
LLM_PROVIDER=gemini npm run dev -- run config.yml --api-key "key"
```

### Now (Option B - Implemented)
```bash
npm run dev -- run config.yml --api-key "key"
# Provider specified in YAML: provider: gemini
```

---

## Changes Made

### 1. Schema Update
**File**: [src/config/schema.ts](src/config/schema.ts)

Added `provider` field to `RootConfigSchema`:
```typescript
export const RootConfigSchema = z.object({
  provider: z.enum(["openai", "gemini"]).default("gemini"),
  agents: z.array(AgentSchema).min(1),
  workflow: WorkflowSchema,
});
```

**Key points**:
- `provider` is optional (defaults to `"gemini"`)
- Only accepts `"openai"` or `"gemini"` (validated by Zod)
- Invalid values cause schema validation error

---

### 2. Provider Function Update
**File**: [src/llm/index.ts](src/llm/index.ts)

Changed function signature:
```typescript
// BEFORE
export function getLLMProvider(options?: { apiKey?: string }): LLMProvider

// AFTER
export function getLLMProvider(
  provider: "openai" | "gemini",
  options?: { apiKey?: string }
): LLMProvider
```

**Changes**:
- Provider is now required parameter (not env var)
- `LLM_PROVIDER` env var removed
- API key resolution logic unchanged

---

### 3. CLI Update
**File**: [src/cli/run.ts](src/cli/run.ts)

Updated provider selection logic:
```typescript
// BEFORE
const llm = getLLMProvider({ apiKey });

// AFTER
const llm = getLLMProvider(parsed.provider, { apiKey });
```

---

### 4. Test YAML Files Updated

All config files now include `provider` field:

| File | Provider | Status |
|------|----------|--------|
| [configs/test-gemini-openai.yml](configs/test-gemini-openai.yml) | `gemini` | ✅ Updated |
| [configs/demo-parallel.yml](configs/demo-parallel.yml) | `gemini` | ✅ Updated |
| [configs/demo-sequential.yml](configs/demo-sequential.yml) | `gemini` | ✅ Updated |
| [configs/demo-parallel-feedback.yml](configs/demo-parallel-feedback.yml) | `gemini` | ✅ Updated |
| [configs/tests/tool-sequential.yml](configs/tests/tool-sequential.yml) | `gemini` | ✅ Updated |
| [configs/tests/tool-parallel.yml](configs/tests/tool-parallel.yml) | `gemini` | ✅ Updated |

---

### 5. Environment Configuration
**File**: [.env.example](.env.example)

Removed `LLM_PROVIDER` (now in YAML):
```dotenv
# REMOVED: LLM_PROVIDER=gemini

# KEPT:
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_RPM=5
OPENAI_RPM=3
LOG_LEVEL=trace
```

---

## Usage

### Example YAML with Gemini
```yaml
provider: gemini

agents:
  - id: researcher
    role: "Market Researcher"
    goal: "Research trends"

workflow:
  type: sequential
  steps:
    - agent: researcher
```

### Example YAML with OpenAI
```yaml
provider: openai

agents:
  - id: researcher
    role: "Market Researcher"
    goal: "Research trends"

workflow:
  type: sequential
  steps:
    - agent: researcher
```

### Running Tests

**With Gemini (API key from env):**
```bash
npm run dev -- run configs/test-gemini-openai.yml -i "Your task"
```

**With Gemini (API key via CLI):**
```bash
npm run dev -- run configs/test-gemini-openai.yml -i "Your task" --api-key "key"
```

---

## Validation & Safety

### 1. Schema Validation
- ✅ Provider enum strictly checked by Zod
- ✅ Only `"openai"` or `"gemini"` allowed
- ✅ Invalid provider causes validation error before execution

### 2. API Key Resolution
- ✅ CLI `--api-key` takes priority
- ✅ Falls back to environment variable
- ✅ Error thrown if neither provided

### 3. Type Safety
- ✅ TypeScript enforces provider type at compile time
- ✅ Runtime validation via Zod
- ✅ No untyped string providers possible

---

## Testing

See [QUICK_TEST_COMMANDS.md](QUICK_TEST_COMMANDS.md) for quick reference.

See [PROVIDER_TESTING_GUIDE.md](PROVIDER_TESTING_GUIDE.md) for comprehensive guide.

### Test Cases
1. ✅ Gemini from YAML config
2. ✅ OpenAI from YAML config
3. ✅ Invalid provider in YAML (should fail)
4. ✅ Missing API key (should fail)
5. ✅ CLI API key override
6. ✅ Default to Gemini when provider omitted

---

## Backward Compatibility

### Breaking Changes
- ⚠️ `LLM_PROVIDER` environment variable no longer used
- ⚠️ All YAML configs must now include `provider` field (or accept default)

### Migration Path
1. Add `provider: gemini` to top of existing YAML files
2. Remove any `LLM_PROVIDER=...` from deployment scripts
3. Update CI/CD to pass `--api-key` flag if needed

### Defaults
- If `provider` omitted from YAML: defaults to `"gemini"`
- No breaking change for existing workflows (they'll use Gemini)

---

## Files Modified

### Code Changes
- [src/config/schema.ts](src/config/schema.ts) - Added provider enum field
- [src/llm/index.ts](src/llm/index.ts) - Provider now parameter, not env var
- [src/cli/run.ts](src/cli/run.ts) - Pass provider from config to provider selector

### Configuration Changes
- [configs/*.yml](configs/) - Added `provider` field to all configs
- [.env.example](.env.example) - Removed LLM_PROVIDER example

### Documentation Updates
- [QUICK_TEST_COMMANDS.md](QUICK_TEST_COMMANDS.md) - Updated with new flow
- [PROVIDER_TESTING_GUIDE.md](PROVIDER_TESTING_GUIDE.md) - Updated with new tests

---

## Compilation Status

✅ **TypeScript compilation**: PASSED  
✅ **No type errors**: All files compile correctly  
✅ **Schema validation**: All test configs validate  
✅ **Functionality**: All orchestrators remain unchanged  

---
