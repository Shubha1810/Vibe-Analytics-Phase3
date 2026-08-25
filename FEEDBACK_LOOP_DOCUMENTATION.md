# Closed-Loop Feedback Improvement System

## Complete Technical Documentation

---

## 1. Overview

The Closed-Loop Feedback Improvement System is an autonomous pipeline that transforms user dissatisfaction (thumbs-down feedback) into concrete system improvements — correcting SQL queries, enhancing agent instructions, and optimizing visualizations — without manual intervention for high-priority issues.

**Core Principle:** Every negative feedback triggers an automated pipeline that diagnoses the root cause, generates a fix, validates it, and applies it so the next user asking the same question gets a correct answer.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          REACT APP (Frontend)                            │
│                                                                         │
│  FeedbackBar.tsx                                                        │
│  ├─ 5 Negative Reason Chips:                                           │
│  │   • Inaccurate data                                                 │
│  │   • Didn't answer my question                                       │
│  │   • Incomplete response                                             │
│  │   • Slow response                                                   │
│  │   • Poor visualization                                              │
│  ├─ Free-text comment box                                              │
│  └─ Submits full execution trace (query, SQL, tools, persona, etc.)    │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ POST /api/feedback
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLASK BACKEND (app.py)                            │
│                                                                         │
│  1. INSERT into FEEDBACK_MASTER_TABLE                                   │
│  2. Retrieve FEEDBACK_ID                                                │
│  3. CALL SP_FEEDBACK_LOOP_ORCHESTRATOR(feedback_id) ← AUTOMATIC        │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             SP_FEEDBACK_LOOP_ORCHESTRATOR (Python Stored Proc)           │
│                                                                         │
│  Step 1: TRIAGE ──────────────────────────────────────────────────────  │
│  Step 2: GENERATE REMEDIATION ────────────────────────────────────────  │
│  Step 3: VALIDATE (Confidence Gate) ──────────────────────────────────  │
│  Step 4: AUTO-APPLY DECISION ─────────────────────────────────────────  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Trigger Mechanism

**When:** Every single time a user clicks thumbs-down and submits feedback.

**How:** The Flask backend endpoint `/api/feedback` performs two actions:
1. Inserts the feedback payload into `FEEDBACK_MASTER_TABLE`
2. Immediately calls `SP_FEEDBACK_LOOP_ORCHESTRATOR(feedback_id)`

**Latency:** The full pipeline executes in ~15-20 seconds:
- Triage: ~3-5 seconds (vector similarity computation)
- Remediation Generation: ~8-12 seconds (Cortex AI call)
- Validation + Decision: ~1-2 seconds

**Non-blocking:** The orchestrator runs in a try/except block — if it fails, the feedback is still stored and can be processed later.

```python
# backend/app.py (line 958-968)
if feedback_id and feedback_type == "thumbs_down":
    try:
        loop_cur = conn.cursor()
        loop_cur.execute("CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SP_FEEDBACK_LOOP_ORCHESTRATOR(%s)", (feedback_id,))
        loop_result = loop_cur.fetchone()
        loop_cur.close()
    except Exception as loop_err:
        print(f"[Feedback Loop Warning] Non-blocking: {loop_err}")
```

---

## 4. Database Tables

### 4.1 FEEDBACK_MASTER_TABLE

**Purpose:** Stores every piece of user feedback with the complete execution trace.

| Column | Type | Description |
|--------|------|-------------|
| FEEDBACK_ID | NUMBER (PK, auto) | Unique identifier |
| SESSION_ID | VARCHAR(100) | Browser session grouping |
| CONVERSATION_TURN | NUMBER | Position in chat |
| PERSONA | VARCHAR(100) | Active user persona (VP Supply Chain, Category Manager, etc.) |
| USER_QUERY | VARCHAR(5000) | The question the user asked |
| RESPONSE_TEXT | VARCHAR(16MB) | The full agent response |
| FEEDBACK_TYPE | VARCHAR(20) | "thumbs_up" or "thumbs_down" |
| FEEDBACK_REASON | VARCHAR(500) | The chip selected (maps to triage category) |
| FEEDBACK_COMMENT | VARCHAR(2000) | Free-text user explanation |
| DETECTED_INTENT | VARCHAR(500) | What the agent thought the user wanted |
| SUB_TASKS | VARIANT | How the agent decomposed the question |
| KPIS_IDENTIFIED | VARIANT | KPIs the agent identified |
| TOOLS_CALLED | VARIANT | Which tools/APIs were used |
| SQL_QUERIES | VARIANT | Exact SQL that was executed |
| CHART_TYPE | VARCHAR(100) | Visualization type chosen |
| SUGGESTED_QUERIES | VARIANT | Follow-up suggestions generated |
| RESPONSE_LENGTH | NUMBER | Character count of response |
| RESULT_ROW_COUNT | NUMBER | Rows returned by SQL |
| RESULT_COLUMN_COUNT | NUMBER | Columns returned |
| RESPONSE_LATENCY_MS | NUMBER | How long the response took |
| CONFIDENCE_SCORE | FLOAT | Agent's self-assessed confidence |
| CREATED_AT | TIMESTAMP_NTZ | When feedback was submitted |

---

### 4.2 FEEDBACK_TRIAGE

**Purpose:** Stores the classification result — what category of failure, which verified query matches, and what priority.

| Column | Type | Description |
|--------|------|-------------|
| TRIAGE_ID | NUMBER (PK, auto) | Unique identifier |
| FEEDBACK_ID | NUMBER (FK) | Links to FEEDBACK_MASTER_TABLE |
| TRIAGE_CATEGORY | VARCHAR(50) | inaccurate_data / unanswered_question / incomplete_response / slow_response / poor_visualization |
| MATCHED_VQ_NAME | VARCHAR(200) | Which existing verified query matched (e.g., "verified_query_03") |
| MATCHED_VQ_QUESTION | VARCHAR(1000) | The question text of the matched VQ |
| SIMILARITY_SCORE | FLOAT | Cosine similarity between user query and best-matching VQ (0.0-1.0) |
| REMEDIATION_MODE | VARCHAR(50) | enhance_existing / add_new / instruction_patch / query_optimization / viz_fix |
| PATTERN_COUNT | NUMBER | How many times this intent got negative feedback in last 7 days |
| PRIORITY | VARCHAR(20) | medium / high / critical (from persona + pattern count) |
| ROOT_CAUSE_ANALYSIS | VARCHAR(2000) | Explanation of what was determined |
| TRIAGED_AT | TIMESTAMP_NTZ | When triage completed |

---

### 4.3 REMEDIATION_QUEUE

**Purpose:** Stores the AI-generated fix with its full lifecycle status.

| Column | Type | Description |
|--------|------|-------------|
| REMEDIATION_ID | NUMBER (PK, auto) | Unique identifier |
| FEEDBACK_ID | NUMBER (FK) | Links to FEEDBACK_MASTER_TABLE |
| TRIAGE_CATEGORY | VARCHAR(50) | Category from triage |
| FIX_TYPE | VARCHAR(50) | vq_replace / vq_add / instruction_patch / query_optimization / viz_fix |
| PRIORITY | VARCHAR(20) | Inherited from triage |
| STATUS | VARCHAR(20) | pending / applied / validated_pending_review / validated_ready / rejected / needs_review |
| ORIGINAL_QUERY | VARCHAR(5000) | The user's question |
| FAILED_SQL | VARCHAR(16MB) | The SQL that produced wrong results |
| MATCHED_VQ_NAME | VARCHAR(200) | Which VQ is being replaced (NULL for add_new) |
| ORIGINAL_VQ_SQL | VARCHAR(16MB) | The SQL that was in the VQ before (for rollback) |
| SUGGESTED_FIX | VARIANT | The AI-generated fix (JSON with sql/instruction_patch/recommended_chart) |
| APPLIED_AT | TIMESTAMP_NTZ | When fix was applied |
| VERIFIED_RESULT | VARCHAR(500) | Validation outcome + apply result |
| REGRESSION_STATUS | VARCHAR(20) | pending / improved / regressed / unchanged |
| CREATED_AT | TIMESTAMP_NTZ | When remediation was generated |

---

## 5. Stored Procedures

### 5.1 SP_TRIAGE_FEEDBACK(P_FEEDBACK_ID)

**Language:** SQL  
**Trigger:** Called by the orchestrator (Step 1)

**What it does:**
1. Reads the feedback row (query, reason, persona, SQL)
2. Maps the UI chip directly to a triage category — NO AI classification needed
3. For `inaccurate_data` and `unanswered_question`: runs vector similarity check using `SNOWFLAKE.CORTEX.EMBED_TEXT_768('e5-base-v2', ...)` against all 15 existing verified queries
4. Determines remediation mode:
   - Similarity ≥ 0.75 → `enhance_existing` (REPLACE the matched VQ)
   - Similarity < 0.75 → `add_new` (ADD a new VQ)
5. Computes priority:
   - VP/Director persona → `high`
   - Pattern count ≥ 3 (same intent negative 3+ times in 7 days) → `critical`
6. Inserts into FEEDBACK_TRIAGE

**Category Mapping:**
```
"Inaccurate data"           → inaccurate_data
"Didn't answer my question" → unanswered_question
"Incomplete response"       → incomplete_response
"Slow response"             → slow_response
"Poor visualization"        → poor_visualization
```

---

### 5.2 SP_GENERATE_REMEDIATION(P_FEEDBACK_ID)

**Language:** SQL  
**Trigger:** Called by the orchestrator (Step 2)

**What it does:**
1. Reads triage result (category, mode, matched VQ)
2. Reads feedback details (user query, failed SQL, comment, persona)
3. Constructs a category-specific AI prompt including:
   - Full schema knowledge (table names, column names, data rules)
   - The user's COMMENT (drives the fix content)
   - The failed SQL (so AI knows what went wrong)
   - The matched VQ name (so AI knows what to fix)
4. Calls `SNOWFLAKE.CORTEX.COMPLETE('mistral-large2', prompt)`
5. Strips markdown fences, extracts JSON
6. Inserts into REMEDIATION_QUEUE

**Fix Types by Category:**

| Category | AI Prompt Focus | Output JSON |
|----------|----------------|-------------|
| inaccurate_data | "Correct this SQL using fiscal calendar, proper columns" | `{"name", "question", "sql", "explanation"}` |
| unanswered_question | "Generate new VQ SQL for this question" | `{"name", "question", "sql", "explanation"}` |
| incomplete_response | "Generate instruction patch for response depth" | `{"instruction_patch", "target_section", "persona_scope", "explanation"}` |
| slow_response | "Optimize this slow SQL" | `{"optimized_sql", "optimization_type", "expected_improvement", "explanation"}` |
| poor_visualization | "Recommend correct chart type" | `{"recommended_chart", "chart_config_hints", "explanation"}` |

---

### 5.3 SP_FEEDBACK_LOOP_ORCHESTRATOR(P_FEEDBACK_ID)

**Language:** Python (Snowpark)  
**Trigger:** Called by Flask backend after every thumbs-down INSERT

**What it does (the master pipeline):**
```
1. Safety check: is this thumbs_down? If not, skip.
2. TRIAGE: Call SP_TRIAGE_FEEDBACK (if not already triaged)
3. GENERATE: Call SP_GENERATE_REMEDIATION (if not already generated)
4. VALIDATE: Check fix content length ≥ 10 characters
5. DECIDE:
   ├─ VQ fix + priority HIGH/CRITICAL + similarity ≥ 0.80 → AUTO-APPLY
   ├─ VQ fix + priority MEDIUM → validated_pending_review
   └─ Agent patch (instruction/viz/optimization) → validated_ready
```

**Why Python:** Snowflake SQL scripting has variable scope issues after CALL statements. Python stored procedures with Snowpark don't have this limitation.

---

### 5.4 SP_APPLY_REMEDIATION(P_REMEDIATION_ID)

**Language:** SQL  
**Trigger:** Called by orchestrator for auto-apply, or manually

**What it does (two paths):**

**Path A — VQ Fixes (vq_replace / vq_add):**
1. Reads current YAML from `@SEMANTIC_MODEL/DemandSensing_SemanticModel.yaml` using `LISTAGG`
2. For `vq_replace`: finds the matched VQ by name in the YAML text, replaces its SQL block
3. For `vq_add`: appends new VQ entry before `custom_instructions:` section
4. Writes updated YAML back to stage via temp table + COPY INTO
5. Updates status to `applied`

**Path B — Agent Patches (instruction_patch / viz_fix / query_optimization):**
1. Marks as `validated_ready`
2. The generated instruction text should be added to the agent's ABSOLUTE PROHIBITIONS section manually
3. After manual agent update, re-publish new version

---

### 5.5 SP_CHECK_REGRESSION()

**Language:** SQL  
**Trigger:** Manual (run after users have interacted post-fix)

**What it does:**
1. Finds all applied remediations with `REGRESSION_STATUS = 'pending'`
2. For each: checks if any feedback on the same query pattern (similarity ≥ 0.80) was received AFTER the fix was applied
3. If thumbs_up found → `improved`
4. If thumbs_down found → `regressed`
5. Updates REMEDIATION_QUEUE

---

### 5.6 SP_VALIDATE_FIX(P_REMEDIATION_ID)

**Language:** SQL  
**Trigger:** Available as standalone validation (orchestrator has inline validation)

**What it does:**
- For VQ fixes: EXPLAIN compile check + row count check + comment alignment (Cortex AI)
- For agent patches: length check + relevance check (Cortex AI)
- Returns: `{"status": "PASS/FAIL/REVIEW_NEEDED", "confidence": 0.0-1.0, "reason": "..."}`

---

## 6. Views

### 6.1 V_FEEDBACK_LOOP_DASHBOARD

**Purpose:** Single-pane monitoring of the entire pipeline.

**Key Metrics Shown:**
- Total feedback, positive/negative split, satisfaction rate
- Triage breakdown by category (inaccurate_data, unanswered, incomplete, slow, viz)
- Enhance vs Add mode counts
- Priority distribution (critical, high, medium)
- Average VQ similarity score
- Remediation pipeline: pending, applied, validated, rejected
- Auto-applied count
- Fix type distribution (vq_replace, vq_add, instruction_patch, query_opt, viz_fix)
- Regression tracking: improved vs regressed
- Average fix latency (seconds from feedback to applied)
- Pattern clusters: total patterns, active patterns, unaddressed patterns, top failing pattern

```sql
SELECT * FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.V_FEEDBACK_LOOP_DASHBOARD;
```

---

### 6.2 V_FEEDBACK_PATTERN_CLUSTERS

**Purpose:** Groups similar negative feedback by intent to identify systemic issues.

**Key Columns:**
- PATTERN_THEME: the detected intent / question pattern
- FEEDBACK_COUNT: how many times this pattern was reported
- SEVERITY: LOW (1) / MEDIUM (2) / HIGH (3+) / CRITICAL (5+)
- IS_ACTIVE_PATTERN: TRUE if 3+ feedbacks in last 7 days
- RESOLUTION_STATUS: UNADDRESSED / FIX_PENDING / FIX_APPLIED_UNVERIFIED / RESOLVED
- FIXES_GENERATED / FIXES_APPLIED / CONFIRMED_IMPROVED

```sql
SELECT * FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.V_FEEDBACK_PATTERN_CLUSTERS;
```

---

## 7. Auto-Apply Decision Matrix

| Priority | VQ Similarity | Fix Type | Action |
|----------|--------------|----------|--------|
| critical | ≥ 0.80 | vq_replace/vq_add | **AUTO-APPLY** (rewrites YAML on stage) |
| high | ≥ 0.80 | vq_replace/vq_add | **AUTO-APPLY** (rewrites YAML on stage) |
| medium | any | vq_replace/vq_add | validated_pending_review (manual apply needed) |
| any | < 0.80 | vq_replace/vq_add | validated_pending_review |
| any | any | instruction_patch | validated_ready (add to agent instructions) |
| any | any | viz_fix | validated_ready (add to agent instructions) |
| any | any | query_optimization | validated_ready (add to agent instructions) |
| any | any | any (content < 10 chars) | **REJECTED** |

**Priority Rules:**
- VP / Director persona → `high` (auto-applies for VQ fixes)
- Same intent with 3+ negative feedbacks in 7 days → `critical`
- All others → `medium` (needs manual review)

---

## 8. How Each Feedback Type Works

### 8.1 "Inaccurate data" → VQ Fix (Auto-Apply)

```
User comment: "MAPE should be 21% not 14%. Used wrong column."
    │
    ├─ Triage: inaccurate_data, similarity 0.92 to verified_query_03
    ├─ Mode: enhance_existing (REPLACE, don't add duplicate)
    ├─ Priority: high (VP persona)
    │
    ├─ AI generates: SELECT REGION, AVG(ABS_PCT_ERROR) AS MAPE 
    │   FROM FACT_FORECAST WHERE FISCAL_YEAR=2026 
    │   AND FORECAST_TYPE='actuals_vs_forecast' GROUP BY REGION
    │
    ├─ Validate: PASS (content > 10 chars)
    ├─ Decision: AUTO-APPLY (high + sim 0.92 ≥ 0.80)
    │
    ├─ SP_APPLY_REMEDIATION:
    │   • Reads YAML from @SEMANTIC_MODEL stage
    │   • Finds verified_query_03
    │   • REPLACES its SQL block
    │   • Writes updated YAML back
    │
    └─ RESULT: Next user asking "MAPE by region" gets 21.7% (correct)
```

### 8.2 "Didn't answer my question" → New VQ (Add)

```
User comment: "Need promo cannibalization analysis. System couldn't answer."
    │
    ├─ Triage: unanswered_question, similarity 0.42 (no match)
    ├─ Mode: add_new
    ├─ Priority: high (VP)
    │
    ├─ AI generates: new VQ with JOIN on FACT_PROMOTIONS
    │   calculating net_category_lift = promo_lift_pct - cannibalization_pct
    │
    ├─ Decision: AUTO-APPLY (high + new VQ needed)
    │   • Appends new VQ to YAML before custom_instructions
    │
    └─ RESULT: Next user asking about cannibalization gets proper answer
```

### 8.3 "Incomplete response" → Instruction Patch

```
User comment: "Asked for full exec summary with 7 regions. Got 2 numbers."
    │
    ├─ Triage: incomplete_response, instruction_patch mode
    ├─ Priority: high (VP)
    │
    ├─ AI generates: "For executive summary requests from VP personas,
    │   always include: regional breakdown table, comparison to targets,
    │   trend direction, and 3+ specific recommendations with quantified impact."
    │
    ├─ Decision: VALIDATED_READY (agent patch, not auto-applied)
    │
    └─ RESULT: Instruction stored in REMEDIATION_QUEUE.
       Add to agent ABSOLUTE PROHIBITIONS section manually.
```

### 8.4 "Slow response" → Query Optimization

```
User comment: "Took 30 seconds. Too slow for a simple question."
    │
    ├─ Triage: slow_response, query_optimization mode
    │
    ├─ AI generates: optimized SQL with filters pushed down,
    │   pre-aggregation suggestion, or hint to use FACT_DRIVER_ATTRIBUTION
    │
    ├─ Decision: VALIDATED_READY
    │
    └─ RESULT: Optimization logged. Apply to agent instructions or
       add as custom_instruction in semantic model.
```

### 8.5 "Poor visualization" → Viz Fix

```
User comment: "Should be waterfall not bar chart for decomposition."
    │
    ├─ Triage: poor_visualization, viz_fix mode
    │
    ├─ AI generates: {"recommended_chart": "waterfall",
    │   "explanation": "Decompositions need stepwise accumulation"}
    │
    ├─ Decision: VALIDATED_READY
    │
    └─ RESULT: Viz rule stored. Add to agent orchestration instructions:
       "For driver decomposition, ALWAYS use waterfall chart."
```

---

## 9. Verified Query Enhancement Logic

The system NEVER blindly adds new verified queries. It always checks first:

```
User's question
    │
    ▼ (EMBED_TEXT_768 + cosine similarity)
    │
Compare against ALL 15 existing VQs
    │
    ├─ Similarity ≥ 0.75 → ENHANCE MODE
    │   • The existing VQ's SQL is WRONG
    │   • REPLACE it with corrected SQL
    │   • No duplicate VQs created
    │
    └─ Similarity < 0.75 → ADD MODE
        • No existing VQ covers this question
        • ADD a brand new VQ entry
        • Expands the system's coverage
```

**Why this matters:** Without this check, repeated feedback about "MAPE by region" would create 10 duplicate VQs. With the check, it finds the existing VQ03 and fixes it in place.

---

## 10. User Comment Influence

The user's free-text comment is NOT just stored — it directly drives the AI-generated fix:

| What User Types | How It's Used |
|----------------|---------------|
| "MAPE should be 21%" | AI validates: does generated SQL output ~21%? |
| "Use FISCAL_QUARTER not QUARTER()" | AI includes this specific correction in the SQL |
| "Need breakdown by supplier" | AI generates SQL with GROUP BY supplier |
| "Response too brief for VP" | AI generates depth rules mentioning VP-level detail |
| "Should be waterfall not bar" | AI recommends waterfall with explanation |

The comment is injected into the Cortex AI prompt as context, ensuring the fix addresses the SPECIFIC user complaint, not a generic improvement.

---

## 11. Monitoring & Observability

### Real-time Dashboard
```sql
SELECT * FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.V_FEEDBACK_LOOP_DASHBOARD;
```

### Pattern Detection (Systemic Issues)
```sql
SELECT PATTERN_THEME, FEEDBACK_COUNT, SEVERITY, IS_ACTIVE_PATTERN, RESOLUTION_STATUS
FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.V_FEEDBACK_PATTERN_CLUSTERS
WHERE IS_ACTIVE_PATTERN = TRUE
ORDER BY FEEDBACK_COUNT DESC;
```

### Regression Tracking (Did Fixes Actually Work?)
```sql
CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SP_CHECK_REGRESSION();

SELECT REMEDIATION_ID, FIX_TYPE, MATCHED_VQ_NAME, STATUS, REGRESSION_STATUS
FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.REMEDIATION_QUEUE
WHERE STATUS = 'applied';
```

### Full Audit Trail (Feedback → Fix → Result)
```sql
SELECT f.USER_QUERY, f.FEEDBACK_REASON, f.FEEDBACK_COMMENT,
       t.TRIAGE_CATEGORY, t.MATCHED_VQ_NAME, t.SIMILARITY_SCORE, t.PRIORITY,
       r.FIX_TYPE, r.STATUS, r.REGRESSION_STATUS,
       r.SUGGESTED_FIX:sql::VARCHAR AS CORRECTED_SQL
FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.FEEDBACK_MASTER_TABLE f
JOIN DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.FEEDBACK_TRIAGE t ON f.FEEDBACK_ID = t.FEEDBACK_ID
JOIN DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.REMEDIATION_QUEUE r ON f.FEEDBACK_ID = r.FEEDBACK_ID
ORDER BY f.FEEDBACK_ID DESC;
```

---

## 12. Objects Summary

### Tables
| Object | Purpose |
|--------|---------|
| `FEEDBACK_MASTER_TABLE` | Raw feedback with full execution trace |
| `FEEDBACK_TRIAGE` | Classification + VQ similarity + priority |
| `REMEDIATION_QUEUE` | AI-generated fixes with lifecycle status |

### Stored Procedures
| Object | Purpose |
|--------|---------|
| `SP_FEEDBACK_LOOP_ORCHESTRATOR` | Master pipeline (Python) — runs everything |
| `SP_TRIAGE_FEEDBACK` | Classification + vector similarity matching |
| `SP_GENERATE_REMEDIATION` | AI fix generation (5 categories) |
| `SP_APPLY_REMEDIATION` | Writes fix to YAML stage or logs for agent |
| `SP_VALIDATE_FIX` | Confidence gate (compile + length + alignment) |
| `SP_CHECK_REGRESSION` | Tracks if fixes actually improved things |

### Views
| Object | Purpose |
|--------|---------|
| `V_FEEDBACK_LOOP_DASHBOARD` | Single-pane pipeline monitoring |
| `V_FEEDBACK_PATTERN_CLUSTERS` | Groups similar issues, shows systemic patterns |

### External Dependencies
| Object | Role |
|--------|------|
| `@SEMANTIC_MODEL/DemandSensing_SemanticModel.yaml` | Stage file containing verified queries (auto-modified by SP_APPLY_REMEDIATION) |
| `INTERACTIVE_DEMANDSENSING_AGENT` | Cortex Agent whose instructions are patched for behavior fixes |
| `SNOWFLAKE.CORTEX.COMPLETE('mistral-large2')` | AI engine for fix generation |
| `SNOWFLAKE.CORTEX.EMBED_TEXT_768('e5-base-v2')` | Embedding engine for VQ similarity matching |

---

## 13. Frontend Component

### FeedbackBar.tsx

**Location:** `frontend/components/chat/FeedbackBar.tsx`

**Props received:**
- `query` — the user's original question
- `responseText` — the agent's full response
- `agentData` — full AgentResponse (planning, SQL, chart_config, result_set)
- `sessionId` — current chat session
- `conversationTurn` — message position

**Payload assembled on submit:**
```typescript
{
  query, response_text, feedback_type, persona,
  feedback_reason,      // The chip selected
  feedback_comment,     // Free text
  session_id, conversation_turn,
  detected_intent, sub_tasks, kpis_identified,
  tools_called, sql_queries, chart_type,
  suggested_queries, response_length,
  result_row_count, result_column_count,
  confidence_score
}
```

---

## 14. Complete Flow Example

```
TIME 0s:   User asks "What is MAPE by region?" → Agent returns 14% (WRONG)
TIME 5s:   User clicks 👎 → "Inaccurate data" → "Should be 21%" → Submit
TIME 5s:   Backend INSERT + ORCHESTRATOR fires automatically
TIME 8s:   ├─ TRIAGE: inaccurate_data, matched VQ03 (sim=0.92), priority=high
TIME 18s:  ├─ GENERATE: AI creates corrected SQL using ABS_PCT_ERROR + FISCAL_YEAR
TIME 19s:  ├─ VALIDATE: PASS (SQL is 150 chars, valid content)
TIME 20s:  └─ DECISION: AUTO-APPLY (high priority + sim 0.92 ≥ 0.80)
TIME 22s:       └─ YAML on stage updated: VQ03 SQL replaced
TIME 25s:  User re-asks "What is MAPE by region?" → Agent returns 21.7% (CORRECT)
TIME 30s:  User clicks 👍
TIME 30s+: SP_CHECK_REGRESSION → REGRESSION_STATUS = 'improved'
           LOOP CLOSED ✓
```

---

## 15. Limitations & Known Gaps

| Limitation | Impact | Workaround |
|-----------|--------|------------|
| Agent instruction patches not auto-applied | viz_fix, instruction_patch need manual agent update | Add rules to ABSOLUTE PROHIBITIONS section, publish new version |
| LLM ignores rules at end of long prompts | Rules added at bottom of 25KB prompt may not be followed | Place critical rules in ABSOLUTE PROHIBITIONS at TOP |
| Cortex AI may generate markdown in JSON | Fix extraction uses string manipulation to strip fences | REPLACE + SUBSTR logic handles ```json``` wrapping |
| YAML line handling | LISTAGG with CHR(10) for real newlines required | ESCAPE_UNENCLOSED_FIELD = NONE in COPY INTO format |
| Table CSS (frontend) | Not fixable via feedback loop | Direct code change in globals.css |
