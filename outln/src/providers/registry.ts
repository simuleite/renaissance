/**
 * Provider registry
 * Maps file extensions to symbol providers
 */

import path from 'path';
import { SymbolProvider } from '../core/types.js';
import { GoProvider } from './tree-sitter/go.js';
import { TypeScriptProvider } from './tree-sitter/typescript.js';
import { PythonProvider } from './tree-sitter/python.js';
import { JavaProvider } from './tree-sitter/java.js';

/**
 * Registry of symbol providers
 * Maps file extensions to provider classes
 */
export class ProviderRegistry {
  private static providers: Map<string, (file?: string) => SymbolProvider> = new Map([
    // Go
    ['.go', () => new GoProvider()],

    // TypeScript/JavaScript
    ['.ts', (file) => new TypeScriptProvider(file)],
    ['.tsx', (file) => new TypeScriptProvider(file)],
    ['.js', (file) => new TypeScriptProvider(file)],
    ['.jsx', (file) => new TypeScriptProvider(file)],
    ['.mjs', (file) => new TypeScriptProvider(file)],
    ['.cjs', (file) => new TypeScriptProvider(file)],

    // Python
    ['.py', () => new PythonProvider()],
    ['.pyi', () => new PythonProvider()],

    // Java
    ['.java', () => new JavaProvider()],
  ]);

  /**
   * Get provider for file path
   * @param filePath - Path to source file
   * @returns SymbolProvider instance or null if not supported
   */
  static getProvider(filePath: string): SymbolProvider | null {
    const ext = path.extname(filePath);
    const providerFactory = this.providers.get(ext);

    if (!providerFactory) {
      return null;
    }

    return providerFactory(filePath);
  }

  /**
   * Get list of supported file extensions
   * @returns Array of supported extensions (e.g., ['.go', '.ts', '.py'])
   */
  static getSupportedExtensions(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if file extension is supported
   * @param filePath - Path to check
   * @returns true if supported, false otherwise
   */
  static isSupported(filePath: string): boolean {
    const ext = path.extname(filePath);
    return this.providers.has(ext);
  }

  /**
   * Register a custom provider
   * @param extension - File extension (e.g., '.mylang')
   * @param providerFactory - Factory function that creates provider
   */
  static registerProvider(
    extension: string,
    providerFactory: (file?: string) => SymbolProvider
  ): void {
    this.providers.set(extension, providerFactory);
  }
}
