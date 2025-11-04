import type { UsageRecord, ModelMetadata } from '../types';

/**
 * Calculate cost for a usage record
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: ModelMetadata,
): {
  inputCost: number;
  outputCost: number;
  totalCost: number;
} {
  const inputCost = (inputTokens / 1000) * model.inputCostPer1k;
  const outputCost = (outputTokens / 1000) * model.outputCostPer1k;
  const totalCost = inputCost + outputCost;

  return {
    inputCost: Number(inputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    totalCost: Number(totalCost.toFixed(6)),
  };
}

/**
 * Aggregate usage records
 */
export function aggregateUsage(records: UsageRecord[]): {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  averageLatency: number;
  byProvider: Record<
    string,
    {
      requests: number;
      tokens: number;
      cost: number;
    }
  >;
  byModel: Record<
    string,
    {
      requests: number;
      tokens: number;
      cost: number;
    }
  >;
  byTaskType: Record<
    string,
    {
      requests: number;
      tokens: number;
      cost: number;
    }
  >;
} {
  const result = {
    totalRequests: records.length,
    successfulRequests: 0,
    failedRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    averageLatency: 0,
    byProvider: {} as Record<string, { requests: number; tokens: number; cost: number }>,
    byModel: {} as Record<string, { requests: number; tokens: number; cost: number }>,
    byTaskType: {} as Record<string, { requests: number; tokens: number; cost: number }>,
  };

  let totalLatency = 0;

  for (const record of records) {
    // Overall stats
    if (record.success) {
      result.successfulRequests++;
    } else {
      result.failedRequests++;
    }

    result.totalInputTokens += record.inputTokens;
    result.totalOutputTokens += record.outputTokens;
    result.totalCost += record.totalCost;
    totalLatency += record.latencyMs;

    // By provider
    if (!result.byProvider[record.provider]) {
      result.byProvider[record.provider] = { requests: 0, tokens: 0, cost: 0 };
    }
    result.byProvider[record.provider].requests++;
    result.byProvider[record.provider].tokens += record.inputTokens + record.outputTokens;
    result.byProvider[record.provider].cost += record.totalCost;

    // By model
    if (!result.byModel[record.model]) {
      result.byModel[record.model] = { requests: 0, tokens: 0, cost: 0 };
    }
    result.byModel[record.model].requests++;
    result.byModel[record.model].tokens += record.inputTokens + record.outputTokens;
    result.byModel[record.model].cost += record.totalCost;

    // By task type
    if (!result.byTaskType[record.taskType]) {
      result.byTaskType[record.taskType] = { requests: 0, tokens: 0, cost: 0 };
    }
    result.byTaskType[record.taskType].requests++;
    result.byTaskType[record.taskType].tokens += record.inputTokens + record.outputTokens;
    result.byTaskType[record.taskType].cost += record.totalCost;
  }

  result.averageLatency = records.length > 0 ? totalLatency / records.length : 0;

  return result;
}

/**
 * Format cost as currency string
 */
export function formatCost(cost: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  }).format(cost);
}

/**
 * Format usage record as CSV row
 */
export function formatUsageRecordAsCSV(record: UsageRecord): string {
  const timestamp = new Date(record.timestamp).toISOString();
  return [
    record.id,
    timestamp,
    record.provider,
    record.model,
    record.taskType,
    record.inputTokens,
    record.outputTokens,
    record.inputCost.toFixed(6),
    record.outputCost.toFixed(6),
    record.totalCost.toFixed(6),
    record.latencyMs,
    record.success ? 'true' : 'false',
    record.error || '',
  ].join(',');
}

/**
 * Generate CSV header for usage records
 */
export function getUsageCSVHeader(): string {
  return [
    'id',
    'timestamp',
    'provider',
    'model',
    'taskType',
    'inputTokens',
    'outputTokens',
    'inputCost',
    'outputCost',
    'totalCost',
    'latencyMs',
    'success',
    'error',
  ].join(',');
}

/**
 * Export usage records to CSV string
 */
export function exportUsageToCSV(records: UsageRecord[]): string {
  const lines = [getUsageCSVHeader()];
  for (const record of records) {
    lines.push(formatUsageRecordAsCSV(record));
  }
  return lines.join('\n');
}
