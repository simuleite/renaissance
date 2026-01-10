/**
 * Code extraction utilities
 * Extract code snippets from source using DocumentSymbol ranges
 */

import { DocumentSymbol } from './types.js';

/**
 * Find symbol by name in a symbol tree (recursive)
 */
export function findSymbolByName(
  symbols: DocumentSymbol[],
  name: string
): DocumentSymbol | null {
  for (const symbol of symbols) {
    // Check current symbol
    if (symbol.name === name) {
      return symbol;
    }

    // Search in children
    if (symbol.children && symbol.children.length > 0) {
      const found = findSymbolByName(symbol.children, name);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Extract code snippet from source using range
 */
export function extractCodeByRange(
  source: string,
  range: { start: { line: number; character: number }; end: { line: number; character: number } }
): string {
  const lines = source.split('\n');

  // Validate range
  if (range.start.line >= lines.length || range.end.line >= lines.length) {
    return '';
  }

  // Extract lines
  const startLine = range.start.line;
  const endLine = range.end.line;

  if (startLine === endLine) {
    // Single line
    const line = lines[startLine];
    return line.substring(range.start.character, range.end.character);
  }

  // Multiple lines
  const result: string[] = [];

  // First line (from start.character to end)
  result.push(lines[startLine].substring(range.start.character));

  // Middle lines (full lines)
  for (let i = startLine + 1; i < endLine; i++) {
    result.push(lines[i]);
  }

  // Last line (from start to end.character)
  result.push(lines[endLine].substring(0, range.end.character));

  return result.join('\n');
}

/**
 * Format symbol type for display
 */
export function formatSymbolType(kind: number): string {
  const typeMap: Record<number, string> = {
    0: 'File',
    1: 'Module',
    2: 'Namespace',
    3: 'Package',
    4: 'Class',
    5: 'Method',
    6: 'Property',
    7: 'Field',
    8: 'Constructor',
    9: 'Enum',
    10: 'Interface',
    11: 'Function',
    12: 'Variable',
    13: 'Constant',
    23: 'Struct',
  };

  return typeMap[kind] || 'Unknown';
}

/**
 * Format location for display
 */
export function formatLocation(
  filePath: string,
  range: { start: { line: number; character: number } }
): string {
  return `${filePath}:${range.start.line + 1}`;
}
