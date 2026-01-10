/**
 * JSON formatter
 * Outputs symbols as JSON
 */

import { DocumentSymbol } from '../core/types.js';

/**
 * Format symbols as JSON
 * @param symbols - Array of document symbols
 * @returns JSON string
 */
export function formatJson(symbols: DocumentSymbol[]): string {
  return JSON.stringify(symbols, null, 2);
}
