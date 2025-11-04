import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import type { AuthCredential } from '@ucr/shared';

/**
 * Token store for managing authentication credentials
 */
export class TokenStore {
  private storePath: string;
  private credentials: Map<string, AuthCredential> = new Map();

  constructor(storePath?: string) {
    this.storePath = storePath || path.join(homedir(), '.ucr', 'credentials.json');
  }

  /**
   * Initialize the store
   */
  async init(): Promise<void> {
    try {
      await this.ensureStoreDirectory();
      await this.load();
    } catch (error) {
      // Store doesn't exist yet, that's fine
    }
  }

  /**
   * Load credentials from disk
   */
  private async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.storePath, 'utf-8');
      const parsed = JSON.parse(data);
      this.credentials = new Map(Object.entries(parsed));
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      this.credentials = new Map();
    }
  }

  /**
   * Save credentials to disk
   */
  private async save(): Promise<void> {
    await this.ensureStoreDirectory();
    const data = JSON.stringify(Object.fromEntries(this.credentials), null, 2);
    await fs.writeFile(this.storePath, data, 'utf-8');
  }

  /**
   * Ensure store directory exists
   */
  private async ensureStoreDirectory(): Promise<void> {
    const dir = path.dirname(this.storePath);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Get credential for a provider
   */
  async get(provider: string): Promise<AuthCredential | undefined> {
    return this.credentials.get(provider);
  }

  /**
   * Set credential for a provider
   */
  async set(provider: string, credential: AuthCredential): Promise<void> {
    this.credentials.set(provider, credential);
    await this.save();
  }

  /**
   * Delete credential for a provider
   */
  async delete(provider: string): Promise<void> {
    this.credentials.delete(provider);
    await this.save();
  }

  /**
   * List all providers with credentials
   */
  async list(): Promise<string[]> {
    return Array.from(this.credentials.keys());
  }

  /**
   * Check if credentials exist for a provider
   */
  async has(provider: string): Promise<boolean> {
    return this.credentials.has(provider);
  }

  /**
   * Clear all credentials
   */
  async clear(): Promise<void> {
    this.credentials.clear();
    await this.save();
  }
}
