/**
 * Capability-Based Router
 * 
 * Routes requests based on required capabilities such as:
 * - Image/vision support
 * - Large context windows
 * - Web search
 * - Function calling
 * - Streaming
 * 
 * Usage:
 * In your ucr.config.json:
 * {
 *   "router": {
 *     "customRouter": "./examples/routers/capability-based.js"
 *   }
 * }
 */

export default function(request, context) {
  const { providers, tokenCount, taskType } = context;
  
  // Check if request has images (vision capability needed)
  const hasImages = request.messages.some(msg => 
    Array.isArray(msg.content) && 
    msg.content.some(part => part.type === 'image')
  );
  
  // Check for large context (>100k tokens)
  const needsLargeContext = tokenCount > 100000;
  
  // Check task type for specialized capabilities
  const needsWebSearch = taskType === 'webSearch';
  const needsReasoning = taskType === 'think';
  
  const enabledProviders = providers.filter(p => p.enabled !== false);
  
  // Route based on image support
  if (hasImages) {
    const visionProviders = enabledProviders.filter(p => {
      // Check if provider supports vision
      const supportsVision = 
        p.id === 'openai' || 
        p.id === 'anthropic' ||
        p.id === 'google' ||
        p.metadata?.models?.some(m => m.supportsVision);
      
      return supportsVision;
    });
    
    if (visionProviders.length > 0) {
      console.log(`[Capability Router] Selected ${visionProviders[0].id} for vision task`);
      return visionProviders[0].id;
    }
  }
  
  // Route based on context window
  if (needsLargeContext) {
    const largeContextProviders = enabledProviders.filter(p => {
      const hasLargeContext = 
        p.id === 'anthropic' || // Claude has 200k context
        p.id === 'google' ||    // Gemini has 1M context
        p.metadata?.models?.some(m => m.contextWindow >= 100000);
      
      return hasLargeContext;
    });
    
    if (largeContextProviders.length > 0) {
      console.log(`[Capability Router] Selected ${largeContextProviders[0].id} for large context (${tokenCount} tokens)`);
      return largeContextProviders[0].id;
    }
  }
  
  // Route based on web search capability
  if (needsWebSearch) {
    const searchProviders = enabledProviders.filter(p => 
      p.id === 'perplexity' || p.id === 'openrouter'
    );
    
    if (searchProviders.length > 0) {
      console.log(`[Capability Router] Selected ${searchProviders[0].id} for web search`);
      return searchProviders[0].id;
    }
  }
  
  // Route based on reasoning capability
  if (needsReasoning) {
    const reasoningProviders = enabledProviders.filter(p => 
      p.id === 'anthropic' ||  // Claude excels at reasoning
      p.id === 'deepseek' ||   // DeepSeek has reasoning models
      p.id === 'openai'        // GPT-4 is good at reasoning
    );
    
    if (reasoningProviders.length > 0) {
      console.log(`[Capability Router] Selected ${reasoningProviders[0].id} for reasoning task`);
      return reasoningProviders[0].id;
    }
  }
  
  // For standard requests, prefer local models if available
  const localProviders = enabledProviders.filter(p => 
    p.id === 'ollama' || 
    p.baseUrl.includes('localhost') ||
    p.baseUrl.includes('127.0.0.1')
  );
  
  if (localProviders.length > 0) {
    console.log(`[Capability Router] Selected local provider: ${localProviders[0].id}`);
    return localProviders[0].id;
  }
  
  // Fallback to default
  return context.config.router?.default || enabledProviders[0]?.id;
}
