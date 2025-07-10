# Running TDD Refinement Agent Evaluations

## Overview

The TDD Refinement Agent includes LLM-based quality evaluations that measure how well the agent coaches developers on TDD principles. These evaluations are **manual-only** to control costs and timing.

## When to Run Evaluations

- Before major releases
- After significant prompt/behavior changes
- Monthly quality checks
- When debugging agent responses

## How to Run

### Local Development

```bash
# Quick evaluation (integration tests only)
npm run test:integration

# Full evaluation suite (slower, ~5-10 min)
npm run eval:real

# View historical results
npm run eval:history
```

### GitHub Actions (Manual)

1. Go to Actions → "TDD Refinement Agent Evaluations"
2. Click "Run workflow"
3. Choose options:
   - **Model**: Which Claude model to evaluate with
   - **Suite**: Quick (faster) or Full (comprehensive)
4. Click "Run workflow"

Results are stored as artifacts and in `evals/history/`.

## What Gets Evaluated

### Quick Suite
- Basic TDD coaching effectiveness
- Response quality to vague requirements
- Recognition of well-defined features
- Code quality violation detection

### Full Suite
All of the above plus:
- Kent Beck TDD principles application
- Sandi Metz rules enforcement  
- Conversation flow management
- PRD refinement quality
- Persona consistency
- Design pattern recognition
- Pragmatic constraint handling

## Understanding Results

Scores are 0-100:
- **90+**: Excellent - Agent provides exceptional TDD guidance
- **80-89**: Good - Solid TDD coaching with minor gaps
- **70-79**: Acceptable - Basic TDD guidance present
- **<70**: Needs improvement - Missing key TDD principles

## Cost Considerations

Each full evaluation run:
- Makes ~30+ LLM API calls
- Costs approximately $0.50-$2.00 depending on model
- Takes 5-10 minutes to complete

Use the "quick" option for rapid feedback during development.