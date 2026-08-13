# INTERACTIVE_DEMANDSENSING_AGENT — Skill Framework Architecture

**Document Type:** Architecture Design Document  
**Author:** Principal AI Solution Architect  
**Database:** DEMANDSENSING_AI  
**Agent:** INTERACTIVE_DEMANDSENSING_AGENT (single deployed Cortex Agent)  
**Date:** July 2026  

---

## Foundational Principle: Single Agent, Multiple Skills

> **CRITICAL DESIGN DECISION:** There is exactly ONE deployed Snowflake Cortex Agent —
> `INTERACTIVE_DEMANDSENSING_AGENT`. All intelligence, workflows, and analytical capabilities
> are delivered through **skills attached to this single agent**. The 14 "agents" referenced
> in the Process View are **logical roles** — they do NOT exist as separate deployed Cortex Agents.
> Their behaviors, workflows, and domain logic are encoded as instructions WITHIN the skills
> that belong to INTERACTIVE_DEMANDSENSING_AGENT.

**Deployment Reality:**
```
┌─────────────────────────────────────────────────────────────┐
│         SNOWFLAKE CORTEX AGENT DEPLOYMENT                   │
│                                                             │
│   Deployed Agents: 1 (ONE)                                  │
│   Agent Name:      INTERACTIVE_DEMANDSENSING_AGENT          │
│   Skills Attached: 6                                        │
│   Separate Agents: 0 (ZERO)                                 │
│                                                             │
│   The 14 "agents" from the Process View are NOT deployed.   │
│   They are logical capabilities INSIDE the 6 skills.        │
└─────────────────────────────────────────────────────────────┘
```

**Why this matters:**
- User interacts with ONE agent only — `INTERACTIVE_DEMANDSENSING_AGENT`
- All skills are registered in the single agent's `CREATE CORTEX AGENT` DDL
- The agent's LLM backbone routes to skills based on user intent
- No inter-agent communication protocols needed — it's intra-agent skill invocation
- Simpler deployment, lower latency, unified session/memory

---

## A. Current-State Assumptions

### A.1 Process View Logical Roles (NOT Deployed Agents)

The Process View diagram depicts 14 logical roles. These represent **business capabilities**, not deployment units. Each role's behavior will be absorbed into one of the 6 skills attached to INTERACTIVE_DEMANDSENSING_AGENT:

| # | Logical Role (Process View) | Category | Fate in Skill Architecture |
|---|---------------------------|----------|---------------------------|
| 1 | Master Agent | Orchestration | **IS** the INTERACTIVE_DEMANDSENSING_AGENT itself (not a skill) |
| 2 | Persona Context Agent | Scoping | Becomes `persona_context_scope` skill |
| 3 | Data Gathering Agent | Data Related | Absorbed into `data_preparation` skill (Step 1) |
| 4 | Feature Enhancement Agent | Data Related | Absorbed into `data_preparation` skill (Step 2) |
| 5 | Business Analyst Agent | Descriptive | Absorbed into `descriptive_demand_analysis` skill (orchestration logic) |
| 6 | Root Cause Analysis Agent | Diagnostic | Absorbed into `descriptive_demand_analysis` skill (attribution workflow) |
| 7 | Trend Discovery Agent | Descriptive | Absorbed into `descriptive_demand_analysis` skill (pattern detection workflow) |
| 8 | Dimension Analysis Agent | Descriptive | Absorbed into `descriptive_demand_analysis` skill (drill-down workflow) |
| 9 | Insight Narration Agent | Narration | Absorbed into `insight_communication` skill (narrative generation) |
| 10 | Visualization Agent | Narration | Absorbed into `insight_communication` skill (chart generation) |
| 11 | Validation Agent | Quality Gate | Becomes `demand_validation` skill |
| 12 | Data Scientist Agent | Predictive & Prescriptive | Absorbed into `predictive_prescriptive` skill (model selection logic) |
| 13 | Predictive Agent | Predictive & Prescriptive | Absorbed into `predictive_prescriptive` skill (inference workflow) |
| 14 | Prescriptive Agent | Predictive & Prescriptive | Absorbed into `predictive_prescriptive` skill (recommendation workflow) |

### A.2 How Logical Roles Map to Skill Instructions

Each "agent" from the Process View becomes a **section or step within a skill's SKILL.md instructions**:

```
Example: descriptive_demand_analysis/SKILL.md

instructions: |
  ## Step 1: Scope the Analysis (← Business Analyst Agent logic)
  - Determine which dimensions to analyze
  - Select appropriate time grain and comparison windows
  
  ## Step 2: Driver Attribution (← Root Cause Analysis Agent logic)
  - Decompose demand_deviation_pct into 5 causal drivers
  - Run collinearity checks
  - Perform counterfactual validation
  
  ## Step 3: Pattern Detection (← Trend Discovery Agent logic)
  - Detect seasonality on NRF 4-4-5 calendar
  - Identify changepoints and regime shifts
  - Compute YoY/QoQ/MoM comparisons
  
  ## Step 4: Dimensional Drill-Down (← Dimension Analysis Agent logic)
  - Split by sub-category, region, store cluster
  - Identify concentration patterns
  - Rank segments by contribution to deviation
  
  ## Step 5: Consolidate Findings
  - Merge attribution + patterns + drill-downs into unified diagnostic
  - Prepare structured output for validation
```

**The logical roles become workflow steps, NOT separate invocations.**

### A.3 Inter-Skill Dependencies (Within INTERACTIVE_DEMANDSENSING_AGENT)

```
User Query → INTERACTIVE_DEMANDSENSING_AGENT
                    │
                    │ (Agent's LLM decides which skill to invoke based on intent)
                    │
                    ├── Skill: persona_context_scope
                    │       (provides persona context to all subsequent skill invocations)
                    │
                    ├── Skill: data_preparation
                    │       (ensures data readiness before analytical skills)
                    │
                    ├── Skill: descriptive_demand_analysis
                    │       (the "what happened and why" capability)
                    │
                    ├── Skill: predictive_prescriptive
                    │       (the "what will happen and what to do" capability)
                    │
                    ├── Skill: demand_validation
                    │       (quality gate for any analytical output)
                    │
                    └── Skill: insight_communication
                            (persona-tailored formatting and visualization)
```

**All skills are invoked BY the INTERACTIVE_DEMANDSENSING_AGENT's own LLM backbone.**
The agent reads the user query, matches it against skill descriptions, and invokes the appropriate skill(s). There is no external router — the agent IS the router.

### A.4 Data Flow Assumptions

| Flow | From (Skill) | To (Skill) | Payload | Mechanism |
|------|-------------|------------|---------|-----------|
| Persona context | `persona_context_scope` | All other skills | Dept scope, KPI focus, detail level | Agent session memory |
| Data readiness | `data_preparation` | Analytical skills | Table refs, freshness status | Skill output → agent context |
| Analytical output | `descriptive_demand_analysis` | `demand_validation` | Metrics, attributions, patterns | Agent passes output as input to next skill |
| Prediction results | `predictive_prescriptive` | `demand_validation` | Forecasts, recommendations | Agent passes output as input to next skill |
| Validation verdict | `demand_validation` | `insight_communication` | Pass/fail, corrections | Agent passes output as input to next skill |
| All validated findings | Multiple skills | `insight_communication` | Complete analysis package | Agent aggregates prior outputs |

**Key: The INTERACTIVE_DEMANDSENSING_AGENT's LLM backbone manages all data flow between skills. Skills don't call each other — the agent sequences them.**

---

## B. Skill Design Strategy

### B.1 Design Principles

1. **Single Agent, Multiple Skills** — ALL skills belong to INTERACTIVE_DEMANDSENSING_AGENT; no other agents exist
2. **Logical Roles ≠ Deployed Agents** — Process View "agents" are absorbed into skill instructions
3. **Domain-Driven Skill Boundaries** — Skills map to business capabilities, not logical roles
4. **Minimal Skill Count** — Fewer skills = simpler routing by the agent's LLM
5. **Cohesion Within Skills** — Group logical roles that always execute together
6. **Single Responsibility per Skill** — Each skill answers one category of business question
7. **Agent-Mediated Composition** — Skills are chained by the agent's LLM, not by inter-skill calls

### B.2 Consolidation Analysis

**Why NOT 14 skills (one per Process View role)?**

| Problem with 1:1 mapping | Impact |
|--------------------------|--------|
| 14 skill descriptions overwhelm the agent's routing LLM | Misrouting, ambiguous matches |
| Tightly coupled roles become artificially separated | Agent must make unnecessary sequential decisions |
| Higher maintenance burden (14 SKILL.md files to update) | Drift between related skills |
| Agent must manage hand-offs between roles that ALWAYS execute together | Wasted tokens on orchestration |

**Why 6 skills is optimal:**

| Benefit | Explanation |
|---------|-------------|
| Clear routing signal | 6 distinct business capabilities are unambiguous for LLM intent matching |
| Natural cohesion | Grouped roles share inputs, execute together, produce combined output |
| Minimal maintenance | 6 files to maintain, each with clear ownership |
| No artificial hand-offs | The agent doesn't need to decide "should I do trend detection after root cause?" — the skill handles both internally |
| Room to grow | New capabilities slot into existing skills OR justify a new 7th skill |

### B.3 Skill Hierarchy — All Attached to INTERACTIVE_DEMANDSENSING_AGENT

```
┌─────────────────────────────────────────────────────────────────────┐
│                 INTERACTIVE_DEMANDSENSING_AGENT                      │
│              (Single Deployed Snowflake Cortex Agent)                │
│                                                                     │
│   CREATE CORTEX AGENT INTERACTIVE_DEMANDSENSING_AGENT               │
│   IN DATABASE DEMANDSENSING_AI                                      │
│   SCHEMA DEMANDSENSING_SCHEMA                                       │
│   SKILLS = (                                                        │
│     'persona_context_scope',                                        │
│     'data_preparation',                                             │
│     'descriptive_demand_analysis',                                  │
│     'predictive_prescriptive',                                      │
│     'demand_validation',                                            │
│     'insight_communication'                                         │
│   )                                                                 │
│   ...                                                               │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ persona_context_    │  │ data_preparation                    │  │
│  │ scope               │  │                                     │  │
│  │                     │  │ Contains logic of:                  │  │
│  │ Contains logic of:  │  │ • Data Gathering Agent (Step 1)     │  │
│  │ • Persona Context   │  │ • Feature Enhancement Agent (Step 2)│  │
│  │   Agent             │  │                                     │  │
│  └─────────────────────┘  └─────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ descriptive_demand_analysis                                  │   │
│  │                                                              │   │
│  │ Contains logic of:                                           │   │
│  │ • Business Analyst Agent (orchestration/sequencing logic)    │   │
│  │ • Root Cause Analysis Agent (driver attribution workflow)    │   │
│  │ • Trend Discovery Agent (pattern detection workflow)         │   │
│  │ • Dimension Analysis Agent (drill-down workflow)             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ predictive_prescriptive                                      │   │
│  │                                                              │   │
│  │ Contains logic of:                                           │   │
│  │ • Data Scientist Agent (model selection logic)               │   │
│  │ • Predictive Agent (inference execution workflow)            │   │
│  │ • Prescriptive Agent (recommendation generation workflow)   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ demand_validation   │  │ insight_communication               │  │
│  │                     │  │                                     │  │
│  │ Contains logic of:  │  │ Contains logic of:                  │  │
│  │ • Validation Agent  │  │ • Insight Narration Agent           │  │
│  │                     │  │ • Visualization Agent               │  │
│  └─────────────────────┘  └─────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### B.4 Skill Responsibilities

| Skill (Attached to INTERACTIVE_DEMANDSENSING_AGENT) | Business Question It Answers | Logical Roles Absorbed | Input | Output |
|-----------------------------------------------------|-----------------------------|-----------------------|-------|--------|
| `persona_context_scope` | "Who is asking and what do they care about?" | Persona Context Agent | Login event / session start | Persona profile: dept scope, KPI focus, detail level, communication style |
| `data_preparation` | "Is the data ready and are derived features computed?" | Data Gathering + Feature Enhancement | Scope + query intent | Data readiness report, derived KPI availability |
| `descriptive_demand_analysis` | "What happened, why, and what patterns exist?" | BA Agent + Root Cause + Trend Discovery + Dimension Analysis | Scope + time range + metrics | Driver attribution, trend patterns, dimensional views |
| `predictive_prescriptive` | "What will happen and what should we do?" | Data Scientist + Predictive + Prescriptive | Current state + scenario params | Forecasts (P10/P90), guardrail-compliant recommendations |
| `demand_validation` | "Is this analysis correct and complete?" | Validation Agent | Any analytical output | Validation verdict (pass/fail), corrections |
| `insight_communication` | "How should we present this to this persona?" | Insight Narration + Visualization | Validated analysis + persona profile | Formatted narrative with embedded charts |

---

## C. Master Agent Design

### C.1 Clarification: "Master Agent" = INTERACTIVE_DEMANDSENSING_AGENT

The "Master Agent" from the Process View is NOT a separate entity. It IS the INTERACTIVE_DEMANDSENSING_AGENT. Its orchestration logic lives in the agent's **system prompt and model instructions**, not in a skill.

```
┌─────────────────────────────────────────────────────────────┐
│         INTERACTIVE_DEMANDSENSING_AGENT                      │
│                                                             │
│   System Prompt (orchestration logic):                      │
│   ├── Intent classification rules                          │
│   ├── Skill routing decision tree                          │
│   ├── Multi-skill sequencing rules                         │
│   ├── Context propagation instructions                     │
│   ├── Response aggregation guidelines                      │
│   └── Guardrail enforcement post-conditions                │
│                                                             │
│   Skills (domain execution logic):                         │
│   ├── persona_context_scope                                │
│   ├── data_preparation                                     │
│   ├── descriptive_demand_analysis                          │
│   ├── predictive_prescriptive                              │
│   ├── demand_validation                                    │
│   └── insight_communication                                │
│                                                             │
│   Tools (shared across all skills):                        │
│   ├── Cortex Analyst (semantic model queries)              │
│   ├── Cortex Search (RAG retrieval)                        │
│   ├── Code Execution (Python sandbox)                      │
│   ├── Data to Chart (visualization)                        │
│   └── Web Search (external context)                        │
└─────────────────────────────────────────────────────────────┘
```

### C.2 Responsibilities of INTERACTIVE_DEMANDSENSING_AGENT

| Responsibility | Implementation Location | Mechanism |
|---------------|------------------------|-----------|
| Intent Classification | Agent system prompt | LLM classifies user query against skill descriptions |
| Skill Routing | Agent system prompt | LLM selects skill(s) to invoke based on intent |
| Multi-Skill Sequencing | Agent system prompt | Instructions specify when to chain skills |
| Context Propagation | Agent conversation memory | Prior skill outputs available in conversation context |
| Response Aggregation | Agent system prompt | Instructions on how to combine multi-skill outputs |
| Guardrail Enforcement | Agent system prompt + `demand_validation` skill | Post-condition checks |
| Conversation Memory | Native Cortex Agent session | Maintains state across turns |
| Failure Recovery | Agent system prompt | Fallback instructions when skills produce incomplete output |

### C.3 Intent Classification Approach

**The agent's LLM performs intent classification natively** — no separate classifier is needed. The skill descriptions in the agent DDL serve as the routing signal:

```sql
-- Each skill's description tells the agent WHEN to invoke it:

-- persona_context_scope description:
"Use when the user logs in, changes persona, or asks to switch role/scope."

-- data_preparation description:
"Use when the user asks about data freshness, signal status, or availability."

-- descriptive_demand_analysis description:
"Use when the user asks what happened, why demand changed, what the root cause is,
 what trends exist, or requests diagnostic/descriptive analysis."

-- predictive_prescriptive description:
"Use when the user asks what will happen, requests forecasts, scenarios, projections,
 recommendations, or asks what action to take."

-- demand_validation description:
"Use when the user asks to verify, validate, or check the accuracy of analysis."

-- insight_communication description:
"Use when analysis is complete and needs to be formatted for the user's persona,
 or when the user requests visualizations or narrative summaries."
```

**Intent-to-Skill Mapping:**

| User Intent | Skill Invoked | Example Queries |
|------------|---------------|-----------------|
| DETECT | `descriptive_demand_analysis` | "What changed overnight?", "Show me anomalies" |
| EXPLAIN | `descriptive_demand_analysis` | "Why did Fresh Produce spike 28%?", "What's driving this?" |
| PROJECT | `predictive_prescriptive` | "What will demand look like next week?", "Run the heatwave scenario" |
| RECOMMEND | `predictive_prescriptive` | "What should I do about this?", "Recommended actions?" |
| VALIDATE | `demand_validation` | "Is this analysis correct?", "Check the numbers" |
| CONFIGURE | `persona_context_scope` | "Switch to David Park's view", "Change my scope" |
| DATA_STATUS | `data_preparation` | "Is the data fresh?", "What signals are available?" |

### C.4 Skill Invocation Workflow (All Within Single Agent)

```
User Message arrives at INTERACTIVE_DEMANDSENSING_AGENT
    │
    ▼
[1] Agent LLM reads message + conversation history
    │
    ▼
[2] Agent LLM matches intent against skill descriptions
    │   (native LLM capability — no external classifier)
    │
    ▼
[3] Agent invokes selected skill
    │   The skill's SKILL.md instructions guide execution
    │   The skill uses tools (Cortex Analyst, Code Execution, etc.)
    │
    ▼
[4] Skill produces output (structured analysis, charts, etc.)
    │
    ▼
[5] Agent LLM evaluates: "Is another skill needed?"
    │   ├── If YES (e.g., need validation) → invoke next skill with prior output as context
    │   └── If NO → proceed to response
    │
    ▼
[6] Agent formats final response to user
    │   (using insight_communication skill if formatting needed,
    │    or directly if response is simple)
    │
    ▼
[7] Response delivered to user
```

**Multi-Skill Chaining Example (Diagnostic Query):**

```
User: "Why did Fresh Produce spike 28% last week?"

INTERACTIVE_DEMANDSENSING_AGENT:
  │
  ├─ [Invokes] descriptive_demand_analysis skill
  │     → Executes driver attribution (Root Cause logic)
  │     → Detects seasonal patterns (Trend Discovery logic)
  │     → Drills into sub-categories (Dimension Analysis logic)
  │     → Returns structured diagnostic
  │
  ├─ [Invokes] demand_validation skill
  │     → Checks driver sum identity (5 drivers = total deviation)
  │     → Validates guardrail compliance
  │     → Returns: PASS, confidence = 0.87
  │
  ├─ [Invokes] insight_communication skill
  │     → Formats for Sarah Mitchell (Fresh & Grocery persona)
  │     → Generates waterfall chart via Data to Chart tool
  │     → Returns persona-tailored narrative + visual
  │
  └─ [Agent delivers] single consolidated response to user
```

---

## D. Multi-Skill Workflow Design

### D.1 Request Lifecycle (All Within INTERACTIVE_DEMANDSENSING_AGENT)

```
Phase 1: INTAKE
├── Agent receives user message
├── Agent retrieves persona context from session (or invokes persona_context_scope if first turn)
├── Agent's LLM classifies intent
└── Agent determines skill execution sequence

Phase 2: PREPARATION (conditional)
├── [If data freshness unknown] Agent invokes data_preparation skill
├── Skill verifies signal availability and freshness
└── Skill returns readiness status to agent context

Phase 3: ANALYSIS (primary work)
├── Agent invokes lead skill (descriptive or predictive)
├── Skill executes its full multi-step workflow internally
│   (all logical role behaviors happen INSIDE the skill)
├── Skill uses tools: Cortex Analyst, Code Execution, etc.
└── Skill returns structured analytical output to agent

Phase 4: QUALITY GATE (mandatory for analytical output)
├── Agent invokes demand_validation skill
├── Skill checks correctness rules against the analytical output
└── Skill returns pass/fail + any corrections

Phase 5: COMMUNICATION (final mile)
├── Agent invokes insight_communication skill
├── Skill formats output for detected persona
├── Skill generates visualizations via Data to Chart
└── Skill returns formatted narrative + charts

Phase 6: DELIVERY
├── Agent assembles final response from skill outputs
└── Agent delivers to user as single message
```

### D.2 Context Propagation Between Skills

Since all skills belong to ONE agent, context propagation is handled by the **agent's conversation memory**. Each skill's output remains in the conversation context and is available to subsequent skill invocations within the same turn:

```
┌────────────────────────────────────────────────────────────┐
│   INTERACTIVE_DEMANDSENSING_AGENT — Conversation Context   │
│                                                            │
│   Turn N:                                                  │
│   ├── User message: "Why did Fresh Produce spike 28%?"     │
│   ├── Skill output: descriptive_demand_analysis → {...}    │
│   ├── Skill output: demand_validation → {verdict: PASS}    │
│   ├── Skill output: insight_communication → {narrative}    │
│   └── Agent response: [formatted response to user]         │
│                                                            │
│   Turn N+1:                                                │
│   ├── User message: "Now project this forward"             │
│   │   (Agent has FULL context from Turn N available)       │
│   ├── Skill output: predictive_prescriptive → {...}        │
│   ├── Skill output: demand_validation → {verdict: PASS}    │
│   └── Agent response: [forecast + recommendations]         │
└────────────────────────────────────────────────────────────┘
```

**No external context store needed.** The Cortex Agent's native session memory handles cross-skill and cross-turn context propagation.

### D.3 Execution Patterns

| Pattern | Description | When Used |
|---------|-------------|-----------|
| **Single Skill** | Agent invokes one skill, returns result | Simple queries: "What's the trend for Dairy?" |
| **Sequential Chain** | Agent invokes skills in order, each receiving prior output | Diagnostic flows: analysis → validation → communication |
| **Within-Skill Parallelism** | A skill's instructions execute multiple workflows internally | `descriptive_demand_analysis` runs attribution + trends + drill-down |
| **Conditional Skip** | Agent skips a skill if not needed | Skip `data_preparation` if data was verified this session |
| **Multi-Skill Merge** | Agent invokes 2+ skills and merges outputs | "Diagnose AND project forward" → descriptive + predictive |

**Important: Parallelism between skills is decided by the agent's LLM.** Within a skill, parallelism is encoded in the SKILL.md instructions (e.g., "Run Steps 2, 3, and 4 simultaneously").

### D.4 Failure Handling

| Failure Type | Detection | Recovery (All Within Agent) |
|-------------|-----------|---------------------------|
| Skill produces incomplete output | Agent LLM evaluates output quality | Agent retries skill with refined parameters |
| Validation skill returns FAIL | Explicit failure verdict | Agent re-invokes analytical skill with corrections noted |
| Tool failure (e.g., Cortex Analyst timeout) | Tool error in skill execution | Skill retries tool call; if persistent, returns partial results |
| Guardrail breach (GR-008: confidence < 0.6) | Post-check in agent system prompt | Agent suppresses recommendations, returns diagnostic only with warning |
| Data unavailable | `data_preparation` reports gaps | Agent degrades gracefully: notes missing signals, proceeds with available data |

---

## E. Technical Architecture

### E.1 Deployment Model

```sql
-- SINGLE AGENT DEPLOYMENT (DDL representation)

CREATE OR REPLACE CORTEX AGENT INTERACTIVE_DEMANDSENSING_AGENT
  IN DATABASE DEMANDSENSING_AI
  SCHEMA DEMANDSENSING_SCHEMA
  COMMENT = 'Unified demand sensing orchestration agent with 6 skills'
  MODEL = 'claude-3.5-sonnet'  -- or configured LLM
  TOOLS = (
    'DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.CORTEX_ANALYST_TOOL',
    'DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.CORTEX_SEARCH_TOOL',
    'code_execution',
    'data_to_chart',
    'web_search'
  )
  SKILLS = (
    '@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/persona_context_scope/SKILL.md',
    '@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/data_preparation/SKILL.md',
    '@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/descriptive_demand_analysis/SKILL.md',
    '@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/predictive_prescriptive/SKILL.md',
    '@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/demand_validation/SKILL.md',
    '@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/insight_communication/SKILL.md'
  )
  INSTRUCTIONS = '... [system prompt with routing logic, guardrails, aggregation rules] ...';
```

**Stage Structure (all skills stored under single agent's skill path):**

```
@DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMANDSENSING_STAGE/skills/
│
├── persona_context_scope/
│   └── SKILL.md                          ← Persona detection + scope configuration
│
├── data_preparation/
│   ├── SKILL.md                          ← Data gathering + feature derivation workflow
│   └── signal_profiler.py                ← Supporting script for freshness checks
│
├── descriptive_demand_analysis/
│   ├── SKILL.md                          ← Full diagnostic workflow (4 logical roles merged)
│   ├── driver_decomposition.py           ← Attribution math (from Root Cause Agent logic)
│   ├── collinearity_check.py             ← Multi-collinearity detection
│   ├── seasonality_detector.py           ← Pattern detection (from Trend Discovery Agent logic)
│   └── dimension_splitter.py             ← Drill-down logic (from Dimension Analysis Agent logic)
│
├── predictive_prescriptive/
│   ├── SKILL.md                          ← Forecast + recommendation workflow (3 logical roles merged)
│   ├── scenario_projector.py             ← Scenario overlay simulations
│   └── guardrail_checker.py              ← DIM_GUARDRAILS compliance validation
│
├── demand_validation/
│   ├── SKILL.md                          ← Cross-cutting validation rules
│   └── validation_rules.py              ← Identity checks, domain rule enforcement
│
└── insight_communication/
    ├── SKILL.md                          ← Persona-tailored narration + visualization
    └── persona_templates.py             ← 5 persona communication templates
```

### E.2 Routing Logic (Embedded in Agent's System Prompt)

The INTERACTIVE_DEMANDSENSING_AGENT's system prompt contains the routing decision tree. This is NOT a separate component — it's part of the agent's instructions:

```markdown
## Routing Instructions (in INTERACTIVE_DEMANDSENSING_AGENT system prompt)

When you receive a user query, select the appropriate skill(s) based on these rules:

### Single-Skill Invocations:
- Persona/scope changes → `persona_context_scope`
- Data status questions → `data_preparation`
- Diagnostic questions (why, root cause, drivers) → `descriptive_demand_analysis`
- Forward-looking questions (forecast, project, what-if) → `predictive_prescriptive`
- Verification requests → `demand_validation`
- Formatting/visualization requests → `insight_communication`

### Multi-Skill Chains (invoke in order):
- Any diagnostic query:
  `descriptive_demand_analysis` → `demand_validation` → `insight_communication`
  
- Any predictive query:
  `predictive_prescriptive` → `demand_validation` → `insight_communication`

- Morning update / "what changed?":
  `data_preparation` → `descriptive_demand_analysis` → `insight_communication`

- "Diagnose AND project":
  `descriptive_demand_analysis` → `predictive_prescriptive` → `demand_validation` → `insight_communication`

### Rules:
- ALWAYS invoke `demand_validation` before `insight_communication` for analytical outputs
- ALWAYS check if persona is loaded; if not, invoke `persona_context_scope` first
- NEVER invoke `insight_communication` without validated analytical output
- If uncertain about intent, default to `descriptive_demand_analysis`
```

### E.3 Memory and Session Handling

| Memory Type | Scope | Implementation | Purpose |
|------------|-------|----------------|---------|
| Agent Session | Login → logout | Native Cortex Agent session state | Persona, conversation history, prior analyses |
| Skill Context | Within skill execution | Skill instructions + tool outputs | Step-by-step workflow state within a skill |
| Cross-Turn Context | Across conversation turns | Agent conversation history | Follow-up queries reference prior skill outputs |

**All memory is managed by the single INTERACTIVE_DEMANDSENSING_AGENT.** Skills don't maintain independent memory — they produce outputs that the agent retains in its conversation context.

### E.4 Response Aggregation Framework

**The agent's system prompt specifies how to aggregate multi-skill outputs:**

```markdown
## Response Aggregation Rules (in agent system prompt)

When multiple skills produce output in a single turn, aggregate as follows:

### Standard Diagnostic Response:
1. Executive Summary (1-2 sentences from insight_communication)
2. Key Findings (from descriptive_demand_analysis)
   - Driver Attribution Table
   - Pattern Insights
   - Concentration Analysis
3. Visualizations (from insight_communication)
4. Confidence & Validation Status (from demand_validation)
5. Suggested Next Steps

### Standard Predictive Response:
1. Executive Summary
2. Forecast Results (from predictive_prescriptive)
   - Point estimates with P10/P90 bands
   - Scenario comparison (if applicable)
3. Recommended Actions (from predictive_prescriptive)
   - Guardrail compliance status
   - Urgency classification
4. Visualizations
5. Confidence & Validation Status

### Follow-Up Response:
- Reference prior turn's analysis (from agent memory)
- Provide incremental detail without repeating prior findings
- Bridge to next logical analysis step
```

---

## F. Governance and Maintainability

### F.1 Skill Ownership Model

| Skill | Owner | What to Update | Review Gate |
|-------|-------|---------------|-------------|
| `persona_context_scope` | Product Lead | Persona definitions, scope rules | Business stakeholder review |
| `data_preparation` | Data Engineering | Signal definitions, freshness thresholds | Data contract validation |
| `descriptive_demand_analysis` | Analytics Lead | Attribution rules, pattern detection logic | Category Manager review |
| `predictive_prescriptive` | ML Engineering | Model selection, scenario definitions, guardrail rules | Model performance review |
| `demand_validation` | QA/Governance | Validation rules, guardrail thresholds | Cross-functional audit |
| `insight_communication` | Product Lead | Persona templates, visualization specs | Persona owner review |
| Agent System Prompt | Solution Architect | Routing logic, aggregation rules, orchestration | Architecture review |

**Important: The agent system prompt (routing/orchestration logic) has a SEPARATE owner from the skills (domain logic). This separation ensures routing changes don't break domain logic and vice versa.**

### F.2 Versioning Strategy

```
@DEMANDSENSING_STAGE/skills/
├── descriptive_demand_analysis/
│   ├── SKILL.md                  ← version: 2.1.0 (in header)
│   ├── CHANGELOG.md              ← Breaking changes, new capabilities
│   ├── driver_decomposition.py
│   └── ...
```

- **MAJOR**: Breaking change to skill output structure (requires agent system prompt update)
- **MINOR**: New workflow step added, backward compatible
- **PATCH**: Bug fix in rules or scripts

**Deployment process:**
1. Update SKILL.md + scripts on stage
2. Agent automatically picks up new version (references path, not version)
3. If MAJOR change: also update agent system prompt to handle new output format

### F.3 Monitoring Approach

| Metric | What It Measures | Alert If |
|--------|-----------------|----------|
| Skill invocation count | Which skills are used most | Any skill at 0 invocations/week |
| Skill latency | Time per skill execution | > 15s for any skill |
| Validation pass rate | Quality of upstream skills | < 90% |
| Multi-skill chain length | Complexity of requests | Avg > 4 skills/request (over-routing) |
| Routing fallback rate | Ambiguous intent classification | > 15% hitting default route |
| Guardrail breach rate | Recommendations blocked | > 20% |
| User follow-up rate | Response completeness | Very low = unclear responses |

### F.4 Performance Considerations

| Concern | Mitigation |
|---------|-----------|
| Multi-skill chain latency | Minimize chain length; skip optional skills; within-skill parallelism |
| Token budget per turn | Skills produce structured summaries, not raw data; agent system prompt limits response length |
| Skill selection confusion | 6 skills with clear, non-overlapping descriptions; default route for ambiguous cases |
| Adding skills later | Max ~10-12 skills before routing degrades; beyond that, consider skill groups or sub-agents |
| Cold start | `persona_context_scope` pre-invoked at session start; subsequent turns skip it |

---

## G. Recommended Final Skill Map

### G.1 Complete Architecture (Single Agent, 6 Skills, 14 Logical Roles Absorbed)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│              INTERACTIVE_DEMANDSENSING_AGENT                             │
│              (THE ONLY DEPLOYED CORTEX AGENT)                            │
│                                                                         │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │ Agent System Prompt (Orchestration Layer)                      │    │
│   │ • Intent classification rules                                  │    │
│   │ • Skill routing decision tree                                  │    │
│   │ • Multi-skill sequencing logic                                 │    │
│   │ • Response aggregation framework                               │    │
│   │ • Guardrail post-conditions (GR-008 confidence floor)          │    │
│   │ • Absorbs: Master Agent role from Process View                 │    │
│   └───────────────────────────────────────────────────────────────┘    │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                        6 SKILLS                                  │  │
│   │                                                                  │  │
│   │  ┌─────────────────────────────────────────────────────────┐    │  │
│   │  │ 1. persona_context_scope                  [STANDALONE]   │    │  │
│   │  │                                                          │    │  │
│   │  │    Absorbs: Persona Context Agent                        │    │  │
│   │  │                                                          │    │  │
│   │  │    WHY STANDALONE:                                       │    │  │
│   │  │    • Different lifecycle (login-triggered, not query)     │    │  │
│   │  │    • Output consumed by ALL other skills                 │    │  │
│   │  │    • Never co-executes with analytical skills            │    │  │
│   │  │    • Would cause unnecessary invocations if grouped      │    │  │
│   │  └─────────────────────────────────────────────────────────┘    │  │
│   │                                                                  │  │
│   │  ┌─────────────────────────────────────────────────────────┐    │  │
│   │  │ 2. data_preparation                       [GROUPED]      │    │  │
│   │  │                                                          │    │  │
│   │  │    Absorbs: Data Gathering Agent (Step 1: Gather)        │    │  │
│   │  │             Feature Enhancement Agent (Step 2: Derive)   │    │  │
│   │  │                                                          │    │  │
│   │  │    WHY GROUPED:                                          │    │  │
│   │  │    • Strict sequential dependency (gather → derive)      │    │  │
│   │  │    • Feature Enhancement NEVER runs without Data         │    │  │
│   │  │      Gathering output                                    │    │  │
│   │  │    • Same input (scope), single combined output          │    │  │
│   │  │    • Separating adds routing overhead with zero value    │    │  │
│   │  └─────────────────────────────────────────────────────────┘    │  │
│   │                                                                  │  │
│   │  ┌─────────────────────────────────────────────────────────┐    │  │
│   │  │ 3. descriptive_demand_analysis            [GROUPED]      │    │  │
│   │  │                                                          │    │  │
│   │  │    Absorbs: Business Analyst Agent (orchestration logic) │    │  │
│   │  │             Root Cause Analysis Agent (attribution)       │    │  │
│   │  │             Trend Discovery Agent (pattern detection)    │    │  │
│   │  │             Dimension Analysis Agent (drill-downs)       │    │  │
│   │  │                                                          │    │  │
│   │  │    WHY GROUPED:                                          │    │  │
│   │  │    • All 4 answer the SAME business question: "what      │    │  │
│   │  │      happened and why?"                                  │    │  │
│   │  │    • Operate on identical input data                     │    │  │
│   │  │    • Execute in parallel within the skill                │    │  │
│   │  │    • Outputs always consolidated before presentation     │    │  │
│   │  │    • BA Agent was just a sequencer — absorbed as         │    │  │
│   │  │      the skill's step ordering                           │    │  │
│   │  │    • 4 separate skills would force 4 routing decisions   │    │  │
│   │  │      for every diagnostic query                          │    │  │
│   │  └─────────────────────────────────────────────────────────┘    │  │
│   │                                                                  │  │
│   │  ┌─────────────────────────────────────────────────────────┐    │  │
│   │  │ 4. predictive_prescriptive                [GROUPED]      │    │  │
│   │  │                                                          │    │  │
│   │  │    Absorbs: Data Scientist Agent (model selection)       │    │  │
│   │  │             Predictive Agent (inference execution)       │    │  │
│   │  │             Prescriptive Agent (recommendations)         │    │  │
│   │  │                                                          │    │  │
│   │  │    WHY GROUPED:                                          │    │  │
│   │  │    • Strict sequential pipeline:                         │    │  │
│   │  │      select model → run inference → generate actions     │    │  │
│   │  │    • Each step REQUIRES prior step's output              │    │  │
│   │  │    • Single business capability: "project & recommend"   │    │  │
│   │  │    • Users never want predictions WITHOUT actions        │    │  │
│   │  │    • Users never want actions WITHOUT forecast basis     │    │  │
│   │  │    • 3 separate skills = 3 sequential invocations with   │    │  │
│   │  │      manual hand-off logic in system prompt              │    │  │
│   │  └─────────────────────────────────────────────────────────┘    │  │
│   │                                                                  │  │
│   │  ┌─────────────────────────────────────────────────────────┐    │  │
│   │  │ 5. demand_validation                      [STANDALONE]   │    │  │
│   │  │                                                          │    │  │
│   │  │    Absorbs: Validation Agent                             │    │  │
│   │  │                                                          │    │  │
│   │  │    WHY STANDALONE:                                       │    │  │
│   │  │    • Cross-cutting quality gate for ALL other skills     │    │  │
│   │  │    • Must validate output from any upstream skill        │    │  │
│   │  │    • If grouped with a skill, it would self-certify      │    │  │
│   │  │      (anti-pattern)                                      │    │  │
│   │  │    • Independent invocation: agent calls it as           │    │  │
│   │  │      post-condition after any analytical skill           │    │  │
│   │  └─────────────────────────────────────────────────────────┘    │  │
│   │                                                                  │  │
│   │  ┌─────────────────────────────────────────────────────────┐    │  │
│   │  │ 6. insight_communication                  [GROUPED]      │    │  │
│   │  │                                                          │    │  │
│   │  │    Absorbs: Insight Narration Agent (narrative)          │    │  │
│   │  │             Visualization Agent (charts)                 │    │  │
│   │  │                                                          │    │  │
│   │  │    WHY GROUPED:                                          │    │  │
│   │  │    • Visualization NEVER generated without narrative     │    │  │
│   │  │    • Narration ALWAYS references visuals                 │    │  │
│   │  │    • Same input (validated analysis + persona profile)   │    │  │
│   │  │    • Produce single combined deliverable                 │    │  │
│   │  │    • Neither has independent use case in isolation       │    │  │
│   │  └─────────────────────────────────────────────────────────┘    │  │
│   │                                                                  │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │ Shared Tools (available to all skills)                         │    │
│   │ • Cortex Analyst (semantic model queries against 10 tables)    │    │
│   │ • Cortex Search (RAG — 30 docs: contracts, policies, SOPs)    │    │
│   │ • Code Execution (Python sandbox — driver math, statistics)   │    │
│   │ • Data to Chart (built-in visualization)                      │    │
│   │ • Web Search (external context enrichment)                    │    │
│   └───────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### G.2 Consolidation Decisions Summary

| Decision | What Happened | Rationale |
|----------|--------------|-----------|
| 14 logical roles → 6 skills | Roles with tight coupling merged into single skills | Reduces routing complexity; matches business capability boundaries |
| Master Agent → Agent system prompt | Not a skill; its logic IS the agent's orchestration | You don't skill-ify the orchestrator — it IS the orchestrator |
| BA Agent → Absorbed into descriptive skill | Was only a sequencer for 3 analytical roles | Its logic becomes the skill's step ordering instructions |
| Data Scientist Agent → Absorbed into predictive skill | Was only a model selector for 2 execution roles | Its logic becomes Step 1 of the predictive skill |
| 2 standalone skills kept separate | Unique lifecycle (persona) + cross-cutting concern (validation) | Cannot be grouped without creating anti-patterns |
| 4 grouped skills | Tight sequential/parallel dependencies within each group | Always execute together; separating adds overhead without value |

### G.3 Scalability Path

**Adding capabilities to INTERACTIVE_DEMANDSENSING_AGENT:**

| Scenario | Action | Impact on Existing Skills |
|----------|--------|--------------------------|
| New analytical method (e.g., competitor intelligence) | Add workflow step to `descriptive_demand_analysis` SKILL.md | None on other skills |
| New prediction model | Add model option to `predictive_prescriptive` SKILL.md | None on other skills |
| New visualization type | Add chart spec to `insight_communication` SKILL.md | None on other skills |
| New data source | Add gathering step to `data_preparation` SKILL.md | None on other skills |
| New validation rule | Add rule to `demand_validation` SKILL.md | None on other skills |
| Entirely new business capability (e.g., supplier negotiation) | Create 7th skill, add to agent DDL, update routing in system prompt | Minimal: only system prompt routing table changes |

**Upper bound: ~10-12 skills** before the agent's LLM starts struggling with routing accuracy. Beyond that, consider a multi-agent architecture (but that's a different design pattern).

---

## H. Implementation Priority

| Phase | What to Build | Deliverable |
|-------|--------------|-------------|
| 1 | Agent DDL + System Prompt | `CREATE CORTEX AGENT` with routing logic, guardrails, aggregation rules |
| 1 | `persona_context_scope` skill | SKILL.md with 5 persona definitions and scope configuration |
| 1 | `descriptive_demand_analysis` skill | SKILL.md with full diagnostic workflow + supporting Python scripts |
| 1 | `demand_validation` skill | SKILL.md with identity checks + guardrail rules |
| 2 | `insight_communication` skill | SKILL.md with persona templates + visualization specs |
| 2 | `predictive_prescriptive` skill | SKILL.md with scenario projection + recommendation workflow |
| 3 | `data_preparation` skill | SKILL.md with signal profiling + feature derivation |

---

*End of Architecture Document*
