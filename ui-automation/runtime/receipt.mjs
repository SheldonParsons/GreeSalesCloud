/** 默认回执仅投影状态和布尔断言；详细数据不直接进入模型上下文。 */
export function summarizeReceipt(receipt) {
  let passed = 0, total = 0;
  const count = value => {
    if (typeof value === 'boolean') { total++; if (value) passed++; }
    else if (value && typeof value === 'object') for (const item of Object.values(value)) count(item);
  };
  count(receipt.result?.checks);
  return {
    runId: receipt.runId,
    capability: `${receipt.capability}@${receipt.version}`,
    environment: receipt.environment,
    target: receipt.target,
    status: receipt.status,
    checks: {passed, total},
    durationMs: receipt.durationMs,
    toolCalls: receipt.metrics.toolCalls,
    receipt: receipt.receiptPath,
    ...(receipt.status !== 'passed' ? {stage: receipt.stage, reason: String(receipt.reason || '未完成核验').split('\n')[0].slice(0, 240)} : {}),
  };
}

export function mcpText(result) {
  return (result.content || []).filter(item => item.type === 'text').map(item => item.text).join('\n');
}

export function mcpJson(result) {
  const text = mcpText(result);
  const match = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!match) throw new Error('MCP脚本未返回预期JSON');
  return JSON.parse(match[1]);
}

export function uniqueSnapshotUid(snapshot, pattern, label) {
  const matches = snapshot.split('\n').filter(line => {pattern.lastIndex = 0;return pattern.test(line);}).map(line => line.match(/uid=(\S+)/)?.[1]).filter(Boolean);
  if (matches.length !== 1) throw new Error(`${label}匹配${matches.length}个，停止操作`);
  return matches[0];
}
