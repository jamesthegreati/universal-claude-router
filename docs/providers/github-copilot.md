# GitHub Copilot Provider

GitHub Copilot can be used as an LLM provider through UCR using OAuth authentication.

## Features

- **OAuth Device Flow**: Secure authentication via GitHub
- **GPT-4 Access**: Access to GPT-4 through Copilot subscription
- **Streaming**: Full SSE streaming support
- **Token Management**: Automatic token refresh

## Authentication

GitHub Copilot uses OAuth 2.0 device code flow for authentication.

### Using CLI

```bash
ucr auth login github-copilot
```

This will:

1. Start the device code flow
2. Display a verification URL and code
3. Open your browser (optional)
4. Wait for you to complete authentication
5. Save credentials securely

### Manual Authentication

```javascript
import { GitHubCopilotAuth, TokenStore } from '@ucr/core';

const tokenStore = new TokenStore();
await tokenStore.init();

const auth = new GitHubCopilotAuth(tokenStore);

// Start auth flow
const deviceCode = await auth.startAuth();
console.log(`Visit: ${deviceCode.verification_uri}`);
console.log(`Code: ${deviceCode.user_code}`);

// Complete auth (polls until user authenticates)
await auth.completeAuth(deviceCode);

// Get access token
const token = await auth.getAccessToken();
```

## Configuration

Add to your `ucr.config.json`:

```json
{
  "providers": [
    {
      "id": "github-copilot",
      "name": "GitHub Copilot",
      "baseUrl": "https://api.githubcopilot.com",
      "apiKey": "${GITHUB_COPILOT_TOKEN}",
      "authType": "oauth",
      "defaultModel": "gpt-4",
      "enabled": true,
      "priority": 8
    }
  ]
}
```

Or use the template:

```bash
cp config/providers/github-copilot.json ucr.config.json
```

## Environment Variables

After authentication via CLI, the token is stored in `~/.ucr/credentials.json` and doesn't need
environment variables.

For manual configuration, you can set:

```bash
export GITHUB_COPILOT_TOKEN="ghu_xxxx"
```

## Available Models

- `gpt-4`: GPT-4 model
- `gpt-3.5-turbo`: GPT-3.5 Turbo

## Usage Example

```javascript
import { UniversalClaudeRouter } from '@ucr/core';

const router = new UniversalClaudeRouter({
  providers: [
    {
      id: 'github-copilot',
      baseUrl: 'https://api.githubcopilot.com',
      apiKey: 'ghu_xxxx',
      authType: 'oauth',
      defaultModel: 'gpt-4',
    },
  ],
});

const response = await router.request({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
  max_tokens: 1024,
});
```

## Features & Limitations

### Supported Features

- ✅ Text generation
- ✅ Streaming
- ✅ System messages
- ✅ Temperature/top_p control
- ✅ Max tokens limit
- ✅ Token usage tracking

### Limitations

- ❌ Vision/image inputs (use OpenAI directly)
- ❌ Function calling (use OpenAI directly)
- ⚠️ Requires active GitHub Copilot subscription
- ⚠️ Rate limits apply based on subscription tier

## Subscription Requirements

GitHub Copilot requires one of:

- GitHub Copilot Individual subscription ($10/month)
- GitHub Copilot Business subscription (via organization)
- GitHub Copilot Enterprise subscription (via organization)

## Rate Limits

Rate limits depend on your subscription:

- **Individual**: ~150 requests/day
- **Business**: Higher limits
- **Enterprise**: Highest limits

UCR automatically handles rate limit errors and can fail over to other providers.

## Authentication Flow Details

The OAuth device code flow works as follows:

1. **Request Device Code**

   ```
   POST https://github.com/login/device/code
   client_id=Iv1.b507a08c87ecfe98
   ```

2. **User Authorization**
   - User visits `https://github.com/login/device`
   - Enters the device code
   - Authorizes the application

3. **Token Polling**

   ```
   POST https://github.com/login/oauth/access_token
   client_id=Iv1.b507a08c87ecfe98
   device_code=xxxx
   grant_type=urn:ietf:params:oauth:grant-type:device_code
   ```

4. **Token Storage**
   - Access token and refresh token saved to `~/.ucr/credentials.json`
   - Tokens automatically refreshed when needed

## Troubleshooting

### Authentication Failed

```bash
# Clear credentials and try again
ucr auth logout github-copilot
ucr auth login github-copilot
```

### Token Expired

Tokens are automatically refreshed. If refresh fails:

```bash
ucr auth refresh github-copilot
```

### Rate Limit Exceeded

```json
{
  "router": {
    "default": "github-copilot"
  },
  "providers": [
    { "id": "github-copilot", "priority": 10 },
    { "id": "anthropic", "priority": 9 }
  ]
}
```

UCR will automatically fail over to the next priority provider.

## API Differences

GitHub Copilot uses an OpenAI-compatible API with minor differences:

| Feature        | OpenAI API        | GitHub Copilot        |
| -------------- | ----------------- | --------------------- |
| Authentication | API Key           | OAuth Token           |
| Base URL       | api.openai.com    | api.githubcopilot.com |
| Models         | All OpenAI models | GPT-4, GPT-3.5        |
| Rate Limits    | Per API key       | Per GitHub account    |

## Cost Tracking

GitHub Copilot is included in your subscription, so costs are:

- Individual: $10/month (unlimited\* requests)
- Business: $19/user/month
- Enterprise: Custom pricing

\*Subject to rate limits

## Best Practices

1. **Use for development**: Ideal for coding assistance
2. **Set priorities**: Configure fallback providers
3. **Monitor limits**: Track daily usage
4. **Refresh tokens**: Let UCR handle token refresh automatically

## Security

- ✅ Tokens stored in user home directory (`~/.ucr/`)
- ✅ File permissions: 0600 (user-only)
- ✅ Automatic token refresh
- ✅ No tokens in config files

## Additional Resources

- [GitHub Copilot Documentation](https://docs.github.com/copilot)
- [OAuth Device Flow](https://docs.github.com/developers/apps/authorizing-oauth-apps#device-flow)
- [API Reference](https://github.com/features/copilot)
