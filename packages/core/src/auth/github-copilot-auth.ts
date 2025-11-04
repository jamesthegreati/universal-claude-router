import { OAuthManager, type OAuthDeviceCodeResponse } from './oauth-manager.js';
import { TokenStore } from './token-store.js';

export interface GitHubCopilotAuthConfig {
  clientId?: string;
  deviceCodeUrl?: string;
  tokenUrl?: string;
  scope?: string;
}

/**
 * GitHub Copilot authentication using device code flow
 */
export class GitHubCopilotAuth {
  private oauthManager: OAuthManager;
  private config: Required<GitHubCopilotAuthConfig>;

  constructor(
    tokenStore: TokenStore,
    config: GitHubCopilotAuthConfig = {}
  ) {
    this.oauthManager = new OAuthManager(tokenStore);
    this.config = {
      clientId: config.clientId || 'Iv1.b507a08c87ecfe98',
      deviceCodeUrl:
        config.deviceCodeUrl || 'https://github.com/login/device/code',
      tokenUrl:
        config.tokenUrl ||
        'https://github.com/login/oauth/access_token',
      scope: config.scope || 'read:user',
    };
  }

  /**
   * Start authentication flow
   */
  async startAuth(): Promise<OAuthDeviceCodeResponse> {
    return this.oauthManager.startDeviceFlow(
      'github-copilot',
      this.config.clientId,
      this.config.deviceCodeUrl,
      this.config.scope
    );
  }

  /**
   * Complete authentication by polling for token
   */
  async completeAuth(deviceCodeResponse: OAuthDeviceCodeResponse): Promise<void> {
    const tokenResponse = await this.oauthManager.pollForToken(
      'github-copilot',
      deviceCodeResponse.device_code,
      this.config.clientId,
      this.config.tokenUrl,
      deviceCodeResponse.interval,
      deviceCodeResponse.expires_in
    );

    await this.oauthManager.saveCredentials('github-copilot', tokenResponse);
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | undefined> {
    const credential = await this.oauthManager.getCredentials('github-copilot');
    
    if (!credential) {
      return undefined;
    }

    // Check if token needs refresh
    if (this.oauthManager.needsRefresh(credential) && credential.refreshToken) {
      const tokenResponse = await this.oauthManager.refreshToken(
        'github-copilot',
        credential.refreshToken,
        this.config.clientId,
        this.config.tokenUrl
      );
      return tokenResponse.access_token;
    }

    return credential.accessToken;
  }

  /**
   * Check if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.oauthManager.deleteCredentials('github-copilot');
  }
}
