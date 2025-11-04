/**
 * Latency-Optimized Router
 * 
 * Routes requests to the fastest responding provider based on historical
 * latency data. This router tracks average response times and selects
 * the provider with the lowest latency.
 * 
 * Usage:
 * In your ucr.config.json:
 * {
 *   "router": {
 *     "customRouter": "./examples/routers/latency-optimized.js"
 *   }
 * }
 */

// Track latency stats (in a production environment, this would be persisted)
const latencyStats = new Map();

export default async function(request, context) {
  const { providers } = context;
  
  // Get providers with latency data
  const enabledProviders = providers.filter(p => p.enabled !== false);
  
  // If we have latency stats, use them
  if (latencyStats.size > 0) {
    const sortedByLatency = enabledProviders
      .map(provider => ({
        providerId: provider.id,
        avgLatency: latencyStats.get(provider.id)?.avg || Infinity,
        requests: latencyStats.get(provider.id)?.count || 0,
      }))
      .filter(p => p.requests > 0) // Only consider providers with data
      .sort((a, b) => a.avgLatency - b.avgLatency);
    
    if (sortedByLatency.length > 0) {
      console.log(`[Latency Router] Selected ${sortedByLatency[0].providerId} (${sortedByLatency[0].avgLatency.toFixed(0)}ms avg)`);
      return sortedByLatency[0].providerId;
    }
  }
  
  // For providers without latency data, prioritize:
  // 1. Local providers (Ollama, LM Studio)
  // 2. Known fast providers (Groq)
  // 3. Others by priority
  
  const localProviders = enabledProviders.filter(
    p => p.baseUrl.includes('localhost') || p.baseUrl.includes('127.0.0.1')
  );
  
  if (localProviders.length > 0) {
    console.log(`[Latency Router] Selected local provider: ${localProviders[0].id}`);
    return localProviders[0].id;
  }
  
  const fastProviders = enabledProviders.filter(
    p => p.id === 'groq' || p.id === 'together'
  );
  
  if (fastProviders.length > 0) {
    console.log(`[Latency Router] Selected fast provider: ${fastProviders[0].id}`);
    return fastProviders[0].id;
  }
  
  // Fallback to highest priority provider
  const sorted = [...enabledProviders].sort((a, b) => 
    (b.priority || 0) - (a.priority || 0)
  );
  
  return sorted[0]?.id || context.config.router?.default;
}

/**
 * Update latency stats (call this after each request)
 * This would typically be called from middleware or analytics
 */
export function updateLatencyStats(providerId, latencyMs) {
  const stats = latencyStats.get(providerId) || { sum: 0, count: 0, avg: 0 };
  
  stats.sum += latencyMs;
  stats.count += 1;
  stats.avg = stats.sum / stats.count;
  
  latencyStats.set(providerId, stats);
}
