#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

// Just run one simple scenario to see if the basic evaluation works
async function quickEval() {
  console.log('🏃‍♂️ Quick Evaluation Test...');
  
  const { RefinementAgent } = await import('./src/mastra/agents/refinement-agent.js');
  
  const agent = new RefinementAgent({
    storageUrl: ':memory:',
    cwd: process.cwd()
  });

  try {
    const input = "I want to implement user authentication";
    console.log(`📤 Input: ${input}`);
    
    const response = await agent.generate(input, {
      threadId: 'quick-test',
      resourceId: 'user123'
    });
    
    console.log(`📥 Response: ${response.text}`);
    
    // Simple scoring - just check if key TDD concepts are mentioned
    let score = 0;
    const text = response.text.toLowerCase();
    
    if (text.includes('test') || text.includes('tdd')) score += 20;
    if (text.includes('specific') || text.includes('behavior')) score += 20; 
    if (text.includes('failing')) score += 20;
    if (text.includes('constraint') || text.includes('external')) score += 20;
    if (text.includes('inject') || text.includes('depend')) score += 20;
    
    console.log(`📊 Quick Score: ${score}/100`);
    
    if (score >= 70) {
      console.log('✅ WOULD PASS pipeline threshold (≥70)');
      process.exit(0);
    } else {
      console.log('❌ WOULD FAIL pipeline threshold (<70)');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

quickEval();