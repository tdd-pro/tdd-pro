#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

async function viewEvaluationHistory() {
  const historyDir = '../../evals/history';
  
  try {
    const files = await fs.readdir(historyDir);
    const runFiles = files.filter(f => f.startsWith('run-') && f.endsWith('.md'));
    
    if (runFiles.length === 0) {
      console.log('📊 No evaluation history found yet.');
      console.log('Run `npm run eval:real` to generate your first evaluation.');
      return;
    }

    console.log(`📈 TDD Agent Evaluation History (${runFiles.length} runs)\n`);

    // Sort by timestamp
    runFiles.sort().reverse();

    const recentRuns = runFiles.slice(0, 10); // Show last 10 runs
    
    for (const filename of recentRuns) {
      const filePath = path.join(historyDir, filename);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Extract key info
      const timestampMatch = filename.match(/run-(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/);
      const commitMatch = content.match(/\*\*Commit:\*\* ([a-f0-9]+)/);
      const scoreMatch = content.match(/Average Score:\*\* (\d+)\/100/);
      const passRateMatch = content.match(/Pass Rate:\*\* (\d+)%/);
      
      const timestamp = timestampMatch ? timestampMatch[1].replace('_', ' ') : 'Unknown';
      const commit = commitMatch ? commitMatch[1].substring(0, 7) : 'Unknown';
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
      const passRate = passRateMatch ? parseInt(passRateMatch[1]) : 0;
      
      // Color coding
      const scoreColor = score >= 80 ? '🟢' : score >= 70 ? '🟡' : '🔴';
      const passColor = passRate >= 90 ? '🟢' : passRate >= 80 ? '🟡' : '🔴';
      
      console.log(`${scoreColor} ${timestamp} | ${commit} | Score: ${score}/100 | Pass: ${passRate}% ${passColor}`);
    }

    // Calculate trend
    if (recentRuns.length >= 2) {
      const latest = await fs.readFile(path.join(historyDir, recentRuns[0]), 'utf8');
      const previous = await fs.readFile(path.join(historyDir, recentRuns[1]), 'utf8');
      
      const latestScore = latest.match(/Average Score:\*\* (\d+)\/100/);
      const previousScore = previous.match(/Average Score:\*\* (\d+)\/100/);
      
      if (latestScore && previousScore) {
        const trend = parseInt(latestScore[1]) - parseInt(previousScore[1]);
        const trendIcon = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
        console.log(`\n${trendIcon} Trend: ${trend > 0 ? '+' : ''}${trend} points from previous run`);
      }
    }

    console.log(`\n💡 View full history in: ${historyDir}/`);
    console.log('🔄 Run `npm run eval:real` for a new evaluation');

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📊 No evaluation history found yet.');
      console.log('Run `npm run eval:real` to generate your first evaluation.');
    } else {
      console.error('Error reading evaluation history:', error);
    }
  }
}

viewEvaluationHistory();