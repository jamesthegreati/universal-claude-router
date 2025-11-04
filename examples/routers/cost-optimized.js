/**
 * Cost-Optimized Router
 * 
 * Routes requests to the cheapest available model based on estimated cost.
 * This router considers input/output token costs and selects the most 
 * cost-effective provider for each request.
 * 
 * Usage:
 * In your ucr.config.json:
 * {
 *   "router": {
 *     "customRouter": "./examples/routers/cost-optimized.js"
 *   }
 * }
 */

export default function(request, context) {
  const { providers, tokenCount } = context;
  
  // Estimate output tokens (usually 50-150% of input for conversational tasks)
  const estimatedOutputTokens = Math.ceil(tokenCount * 0.8);
  
  // Calculate cost for each provider
  const providerCosts = providers
    .filter(p => p.enabled !== false)
    .map(provider => {
      // Get model metadata if available
      const model = provider.metadata?.models?.find(
        m => m.id === (provider.defaultModel || request.model)
      );
      
      if (!model) {
        // No cost data available, skip this provider
        return null;
      }
      
      // Calculate total cost
      const inputCost = (tokenCount / 1000) * model.inputCostPer1k;
      const outputCost = (estimatedOutputTokens / 1000) * model.outputCostPer1k;
      const totalCost = inputCost + outputCost;
      
      return {
        providerId: provider.id,
        cost: totalCost,
        model: model.id,
      };
    })
    .filter(Boolean) // Remove nulls
    .sort((a, b) => a.cost - b.cost); // Sort by cost ascending
  
  // Return the cheapest provider
  if (providerCosts.length > 0) {
    console.log(`[Cost Router] Selected ${providerCosts[0].providerId} ($${providerCosts[0].cost.toFixed(6)})`);
    return providerCosts[0].providerId;
  }
  
  // Fallback to default if no cost data available
  return context.config.router?.default || providers[0].id;
}
