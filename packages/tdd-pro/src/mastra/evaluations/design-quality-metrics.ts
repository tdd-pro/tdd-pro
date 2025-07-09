import { Metric, MetricResult } from "@mastra/core";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

// Design Quality Evaluation Metric
export class DesignQualityMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    const evaluationPrompt = `
You are evaluating a TDD Refinement Agent's ability to identify and address design quality issues.

CONTEXT:
- The agent should identify design anti-patterns and smells
- The agent should suggest better architectural alternatives
- The agent should explain why designs are problematic
- The agent should maintain TDD focus while evaluating design quality

INPUT (Developer's request): "${input}"
OUTPUT (Agent's response): "${output}"

DESIGN QUALITY EVALUATION CRITERIA:
1. Does the agent identify specific design anti-patterns (God Class, Tight Coupling, Primitive Obsession, etc.)?
2. Does the agent suggest concrete alternative designs or refactoring approaches?
3. Does the agent explain why the current design is problematic for testing and maintenance?
4. Does the agent reference established design principles (SOLID, DRY, etc.)?
5. Does the agent provide actionable guidance for improvement?
6. Does the agent balance design quality with TDD principles?

COMMON DESIGN ISSUES TO LOOK FOR:
- God Classes (too many responsibilities)
- Tight Coupling (direct instantiation, hard dependencies)
- Primitive Obsession (over-reliance on basic types)
- Anemic Domain Models (data without behavior)
- Mixed Abstraction Levels (high and low level operations together)
- Feature Envy (class overly interested in other classes)
- Poor Separation of Concerns

Rate the response 0-100 based on design quality evaluation effectiveness.

Response format:
SCORE: [0-100]
DESIGN_ISSUES_IDENTIFIED: [List issues the agent correctly identified]
ARCHITECTURAL_SUGGESTIONS: [Quality of alternative designs suggested]
REASONING: [Detailed explanation with specific examples]
STRENGTHS: [What the agent did well]
IMPROVEMENTS: [What could be better]
`;

    try {
      const model = anthropic(process.env.EVAL_MODEL || "claude-3-5-sonnet-20241022");
      const result = await generateText({
        model,
        prompt: evaluationPrompt,
        temperature: 0.1,
      });

      const response = result.text;
      const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

      const issuesMatch = response.match(/DESIGN_ISSUES_IDENTIFIED:\s*([^]+?)(?=\n\s*(?:ARCHITECTURAL_SUGGESTIONS|REASONING|STRENGTHS|IMPROVEMENTS|$))/i);
      const suggestionsMatch = response.match(/ARCHITECTURAL_SUGGESTIONS:\s*([^]+?)(?=\n\s*(?:REASONING|STRENGTHS|IMPROVEMENTS|$))/i);
      const reasoningMatch = response.match(/REASONING:\s*([^]+?)(?=\n\s*(?:STRENGTHS|IMPROVEMENTS|$))/i);
      const strengthsMatch = response.match(/STRENGTHS:\s*([^]+?)(?=\n\s*(?:IMPROVEMENTS|$))/i);
      const improvementsMatch = response.match(/IMPROVEMENTS:\s*([^]+?)(?=\n\s*$)/i);

      return {
        score,
        info: {
          designIssuesIdentified: issuesMatch ? issuesMatch[1].trim() : "",
          architecturalSuggestions: suggestionsMatch ? suggestionsMatch[1].trim() : "",
          reasoning: reasoningMatch ? reasoningMatch[1].trim() : "",
          strengths: strengthsMatch ? strengthsMatch[1].trim() : "",
          improvements: improvementsMatch ? improvementsMatch[1].trim() : "",
          evaluationType: "Design Quality Assessment"
        }
      };
    } catch (error) {
      return {
        score: 0,
        info: {
          error: `Design evaluation failed: ${error.message}`,
          evaluationType: "Design Quality Assessment"
        }
      };
    }
  }
}

// Architectural Pattern Recognition Metric
export class ArchitecturalPatternMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    const evaluationPrompt = `
You are evaluating a TDD Refinement Agent's ability to recognize and suggest appropriate architectural patterns.

CONTEXT:
- The agent should identify when specific design patterns would be beneficial
- The agent should suggest patterns that improve testability and maintainability
- The agent should explain pattern benefits in context of TDD

INPUT (Developer's request): "${input}"
OUTPUT (Agent's response): "${output}"

ARCHITECTURAL PATTERN EVALUATION:
1. Does the agent recognize opportunities for beneficial patterns (Strategy, Factory, Observer, etc.)?
2. Does the agent suggest patterns that improve testability?
3. Does the agent explain how patterns address specific design problems?
4. Does the agent avoid over-engineering with unnecessary patterns?
5. Does the agent connect pattern usage to TDD benefits?

COMMON BENEFICIAL PATTERNS FOR TDD:
- Dependency Injection (for testability)
- Strategy Pattern (for behavior variation)
- Factory Pattern (for object creation)
- Observer Pattern (for decoupling)
- Command Pattern (for operation encapsulation)
- Repository Pattern (for data access abstraction)

Rate the response 0-100 based on architectural pattern guidance quality.

Response format:
SCORE: [0-100]
PATTERNS_SUGGESTED: [List of patterns the agent suggested]
PATTERN_JUSTIFICATION: [How well the agent explained pattern benefits]
REASONING: [Detailed explanation]
STRENGTHS: [What the agent did well]
IMPROVEMENTS: [What could be better]
`;

    try {
      const model = anthropic(process.env.EVAL_MODEL || "claude-3-5-sonnet-20241022");
      const result = await generateText({
        model,
        prompt: evaluationPrompt,
        temperature: 0.1,
      });

      const response = result.text;
      const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

      const patternsMatch = response.match(/PATTERNS_SUGGESTED:\s*([^]+?)(?=\n\s*(?:PATTERN_JUSTIFICATION|REASONING|STRENGTHS|IMPROVEMENTS|$))/i);
      const justificationMatch = response.match(/PATTERN_JUSTIFICATION:\s*([^]+?)(?=\n\s*(?:REASONING|STRENGTHS|IMPROVEMENTS|$))/i);
      const reasoningMatch = response.match(/REASONING:\s*([^]+?)(?=\n\s*(?:STRENGTHS|IMPROVEMENTS|$))/i);
      const strengthsMatch = response.match(/STRENGTHS:\s*([^]+?)(?=\n\s*(?:IMPROVEMENTS|$))/i);
      const improvementsMatch = response.match(/IMPROVEMENTS:\s*([^]+?)(?=\n\s*$)/i);

      return {
        score,
        info: {
          patternsSuggested: patternsMatch ? patternsMatch[1].trim() : "",
          patternJustification: justificationMatch ? justificationMatch[1].trim() : "",
          reasoning: reasoningMatch ? reasoningMatch[1].trim() : "",
          strengths: strengthsMatch ? strengthsMatch[1].trim() : "",
          improvements: improvementsMatch ? improvementsMatch[1].trim() : "",
          evaluationType: "Architectural Pattern Recognition"
        }
      };
    } catch (error) {
      return {
        score: 0,
        info: {
          error: `Pattern evaluation failed: ${error.message}`,
          evaluationType: "Architectural Pattern Recognition"
        }
      };
    }
  }
}

// Design Alternative Suggestion Metric
export class DesignAlternativeMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    const evaluationPrompt = `
You are evaluating a TDD Refinement Agent's ability to suggest alternative designs and refactoring approaches.

CONTEXT:
- The agent should propose concrete alternative designs
- The agent should explain trade-offs between different approaches
- The agent should provide step-by-step refactoring guidance
- The agent should consider testability in design alternatives

INPUT (Developer's request): "${input}"
OUTPUT (Agent's response): "${output}"

DESIGN ALTERNATIVE EVALUATION:
1. Does the agent propose specific, concrete alternative designs?
2. Does the agent explain the benefits of suggested alternatives?
3. Does the agent provide clear refactoring steps?
4. Does the agent consider multiple viable approaches?
5. Does the agent explain trade-offs between alternatives?
6. Does the agent emphasize testability in design alternatives?

QUALITY INDICATORS:
- Concrete code examples or pseudocode
- Step-by-step refactoring guidance
- Explanation of benefits and trade-offs
- Consideration of testing implications
- Multiple viable alternatives presented
- Clear reasoning for recommendations

Rate the response 0-100 based on design alternative suggestion quality.

Response format:
SCORE: [0-100]
ALTERNATIVES_PROVIDED: [List of alternative designs suggested]
REFACTORING_GUIDANCE: [Quality of step-by-step guidance]
TRADEOFF_ANALYSIS: [How well trade-offs were explained]
REASONING: [Detailed explanation]
STRENGTHS: [What the agent did well]
IMPROVEMENTS: [What could be better]
`;

    try {
      const model = anthropic(process.env.EVAL_MODEL || "claude-3-5-sonnet-20241022");
      const result = await generateText({
        model,
        prompt: evaluationPrompt,
        temperature: 0.1,
      });

      const response = result.text;
      const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

      const alternativesMatch = response.match(/ALTERNATIVES_PROVIDED:\s*([^]+?)(?=\n\s*(?:REFACTORING_GUIDANCE|TRADEOFF_ANALYSIS|REASONING|STRENGTHS|IMPROVEMENTS|$))/i);
      const guidanceMatch = response.match(/REFACTORING_GUIDANCE:\s*([^]+?)(?=\n\s*(?:TRADEOFF_ANALYSIS|REASONING|STRENGTHS|IMPROVEMENTS|$))/i);
      const tradeoffMatch = response.match(/TRADEOFF_ANALYSIS:\s*([^]+?)(?=\n\s*(?:REASONING|STRENGTHS|IMPROVEMENTS|$))/i);
      const reasoningMatch = response.match(/REASONING:\s*([^]+?)(?=\n\s*(?:STRENGTHS|IMPROVEMENTS|$))/i);
      const strengthsMatch = response.match(/STRENGTHS:\s*([^]+?)(?=\n\s*(?:IMPROVEMENTS|$))/i);
      const improvementsMatch = response.match(/IMPROVEMENTS:\s*([^]+?)(?=\n\s*$)/i);

      return {
        score,
        info: {
          alternativesProvided: alternativesMatch ? alternativesMatch[1].trim() : "",
          refactoringGuidance: guidanceMatch ? guidanceMatch[1].trim() : "",
          tradeoffAnalysis: tradeoffMatch ? tradeoffMatch[1].trim() : "",
          reasoning: reasoningMatch ? reasoningMatch[1].trim() : "",
          strengths: strengthsMatch ? strengthsMatch[1].trim() : "",
          improvements: improvementsMatch ? improvementsMatch[1].trim() : "",
          evaluationType: "Design Alternative Suggestions"
        }
      };
    } catch (error) {
      return {
        score: 0,
        info: {
          error: `Alternative evaluation failed: ${error.message}`,
          evaluationType: "Design Alternative Suggestions"
        }
      };
    }
  }
}