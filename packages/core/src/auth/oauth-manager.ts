import { AuthType, type AuthCredential } from '@ucr/shared';
import { TokenStore } from './token-store.js';

export interface OAuthDeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  scope?: string;
  expires_in?: number;
  refresh_token?: string;
}

/**
 * OAuth manager for handling OAuth flows
 */
export class OAuthManager {
  private tokenStore: TokenStore;

  constructor(tokenStore: TokenStore) {
    this.tokenStore = tokenStore;
  }

  /**
   * Start OAuth device code flow
   */
  async startDeviceFlow(
    provider: string,
    clientId: string,
    deviceCodeUrl: string,
    scope?: string,
  ): Promise<OAuthDeviceCodeResponse> {
    const body = new URLSearchParams({
      client_id: clientId,
      scope: scope || '',
    });

    const response = await fetch(deviceCodeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to start device flow: ${response.statusText}`);
    }

    return (await response.json()) as OAuthDeviceCodeResponse;
  }

  /**
   * Poll for OAuth token
   */
  async pollForToken(
    provider: string,
    deviceCode: string,
    clientId: string,
    tokenUrl: string,
    interval: number = 5,
    expiresIn: number = 900,
  ): Promise<OAuthTokenResponse> {
    const startTime = Date.now();
    const maxTime = expiresIn * 1000;

    while (Date.now() - startTime < maxTime) {
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));

      const body = new URLSearchParams({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      const data = (await response.json()) as any;

      if (response.ok && data.access_token) {
        return data as OAuthTokenResponse;
      }

      // Check for errors
      if (data.error) {
        if (data.error === 'authorization_pending' || data.error === 'slow_down') {
          // Continue polling
          if (data.error === 'slow_down') {
            interval += 5; // Increase interval
          }
          continue;
        }

        throw new Error(`OAuth error: ${data.error_description || data.error}`);
      }
    }

    throw new Error('Device code expired');
  }

  /**
   * Save OAuth credentials
   */
  async saveCredentials(provider: string, tokenResponse: OAuthTokenResponse): Promise<void> {
    const credential: AuthCredential = {
      provider,
      type: AuthType.OAUTH,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_in
        ? Date.now() + tokenResponse.expires_in * 1000
        : undefined,
      metadata: {
        tokenType: tokenResponse.token_type,
        scope: tokenResponse.scope,
      },
    };

    await this.tokenStore.set(provider, credential);
  }

  /**
   * Get credentials for a provider
   */
  async getCredentials(provider: string): Promise<AuthCredential | undefined> {
    return this.tokenStore.get(provider);
  }

  /**
   * Check if token needs refresh
   */
  needsRefresh(credential: AuthCredential): boolean {
    if (!credential.expiresAt) {
      return false;
    }

    // Refresh if expires in less than 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() + fiveMinutes >= credential.expiresAt;
  }

  /**
   * Refresh OAuth token
   */
  async refreshToken(
    provider: string,
    refreshToken: string,
    clientId: string,
    tokenUrl: string,
  ): Promise<OAuthTokenResponse> {
    const body = new URLSearchParams({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const data = (await response.json()) as OAuthTokenResponse;
    await this.saveCredentials(provider, data);
    return data;
  }

  /**
   * Delete credentials for a provider
   */
  async deleteCredentials(provider: string): Promise<void> {
    await this.tokenStore.delete(provider);
  }
}
