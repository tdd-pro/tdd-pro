import { Metric, MetricResult } from "@mastra/core";

// Feature Scope Appropriateness Metric - evaluates if a feature should be broken into multiple features
export class FeatureScopeAppropriateness extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    let score = 0;
    const info: Record<string, any> = {
      scopeAssessment: 'unknown',
      featureComplexity: 'medium',
      humanReviewRecommended: false,
      recommendations: [],
      breakdownSuggestion: 'none'
    };

    // Analyze if feature is appropriately scoped
    const scopeAnalysis = this.analyzeFeatureScope(input);
    const agentRecommendation = this.analyzeAgentRecommendation(output);
    
    // Score the appropriateness of agent's scope guidance
    score = this.scoreAppropriateness(scopeAnalysis, agentRecommendation, info);

    score = Math.min(score, 100);
    return { score, info };
  }

  private analyzeFeatureScope(input: string): {
    shouldBreakDown: boolean;
    isTooSmall: boolean;
    complexitySignals: string[];
    estimatedFeatureCount: number;
  } {
    const complexitySignals: string[] = [];
    let complexityPoints = 0;

    // Signals that feature is TOO BIG and should be broken down
    const overScopePatterns = [
      { pattern: /complete.*system|entire.*application|full.*platform/i, points: 5, signal: 'complete-system' },
      { pattern: /e-commerce.*with.*payment.*and.*inventory/i, points: 4, signal: 'multi-domain' },
      { pattern: /authentication.*and.*authorization.*and.*admin/i, points: 3, signal: 'multiple-concerns' },
      { pattern: /real-time.*chat.*with.*file.*sharing.*and.*notifications/i, points: 4, signal: 'feature-kitchen-sink' },
      { pattern: /dashboard.*with.*reporting.*and.*analytics.*and.*management/i, points: 3, signal: 'admin-everything' },
      { pattern: /\band\b.*\band\b.*\band\b/i, points: 2, signal: 'multiple-ands' }, // lots of "and"s
    ];

    // Signals that feature is TOO SMALL (over-broken-down)
    const underScopePatterns = [
      { pattern: /add.*button|change.*color|update.*text/i, points: -2, signal: 'ui-tweak' },
      { pattern: /fix.*typo|update.*label|change.*placeholder/i, points: -3, signal: 'minor-change' },
      { pattern: /add.*single.*field|remove.*one.*element/i, points: -2, signal: 'trivial-modification' }
    ];

    [...overScopePatterns, ...underScopePatterns].forEach(({ pattern, points, signal }) => {
      if (pattern.test(input)) {
        complexityPoints += points;
        complexitySignals.push(signal);
      }
    });

    const shouldBreakDown = complexityPoints >= 3;
    const isTooSmall = complexityPoints <= -2;
    const estimatedFeatureCount = Math.max(1, Math.ceil(complexityPoints / 2));

    return { shouldBreakDown, isTooSmall, complexitySignals, estimatedFeatureCount };
  }

  private analyzeAgentRecommendation(output: string): {
    recommendsBreakdown: boolean;
    recommendsConsolidation: boolean;
    recommendsHumanReview: boolean;
    providesReasoningn: boolean;
    suggestsSpecificFeatures: boolean;
  } {
    return {
      recommendsBreakdown: /break.*down|split.*into|separate.*features|too.*large|multiple.*features/i.test(output),
      recommendsConsolidation: /combine|consolidate|too.*small|merge.*with|part.*of.*larger/i.test(output),
      recommendsHumanReview: /human.*review|product.*owner|stakeholder.*input|business.*decision|discuss.*with.*team/i.test(output),
      providesReasoningn: /because|reason|since|due.*to|this.*would|rationale/i.test(output),
      suggestsSpecificFeatures: /feature.*1|feature.*2|first.*feature|second.*feature|phase.*1|iteration.*1/i.test(output)
    };
  }

  private scoreAppropriateness(
    scope: ReturnType<FeatureScopeAppropriateness['analyzeFeatureScope']>,
    recommendation: ReturnType<FeatureScopeAppropriateness['analyzeAgentRecommendation']>,
    info: Record<string, any>
  ): number {
    let score = 0;

    // Set context
    info.complexitySignals = scope.complexitySignals;
    info.estimatedFeatureCount = scope.estimatedFeatureCount;

    if (scope.shouldBreakDown) {
      // Feature IS too big - agent should recommend breakdown
      info.scopeAssessment = 'too-large';
      
      if (recommendation.recommendsBreakdown) {
        score += 40; // Correct assessment
        info.recommendations.push('✅ Correctly identified oversized feature');
        
        if (recommendation.suggestsSpecificFeatures) {
          score += 20; // Provides specific breakdown
          info.breakdownSuggestion = 'specific';
        }
        
        if (recommendation.providesReasoningn) {
          score += 15; // Explains reasoning
        }
      } else {
        score += 10; // Missed the need for breakdown
        info.recommendations.push('❌ Should recommend breaking down this large feature');
      }

    } else if (scope.isTooSmall) {
      // Feature IS too small - agent should recommend consolidation
      info.scopeAssessment = 'too-small';
      
      if (recommendation.recommendsConsolidation) {
        score += 35; // Correct assessment
        info.recommendations.push('✅ Correctly identified under-scoped feature');
      } else {
        score += 15; // Missed over-granularity
        info.recommendations.push('❌ Should suggest consolidating with related features');
      }

    } else {
      // Feature is appropriately sized
      info.scopeAssessment = 'appropriate';
      
      if (!recommendation.recommendsBreakdown && !recommendation.recommendsConsolidation) {
        score += 50; // Correctly assessed as appropriately sized
        info.recommendations.push('✅ Correctly identified appropriate feature scope');
      } else {
        score += 25; // Unnecessary recommendation
        info.recommendations.push('⚠️ Feature scope is appropriate - no changes needed');
      }
    }

    // Bonus for human review recommendation when appropriate
    if (scope.complexitySignals.includes('multi-domain') || scope.complexitySignals.includes('complete-system')) {
      if (recommendation.recommendsHumanReview) {
        score += 15;
        info.humanReviewRecommended = true;
        info.recommendations.push('🤝 Good call recommending human/stakeholder input');
      } else {
        info.recommendations.push('💭 Consider recommending stakeholder review for complex scope decisions');
      }
    }

    return score;
  }
}