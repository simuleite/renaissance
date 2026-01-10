/**
 * Formatter for 'read' command output
 */

import { DocumentSymbol } from '../core/types.js';
import { extractCodeByRange, formatLocation, formatSymbolType } from '../core/utils.js';

export interface ReadResult {
  symbol: DocumentSymbol;
  code: string;
  filePath: string;
}

/**
 * Format read result as detailed view
 */
export function formatReadDetail(result: ReadResult): string {
  const { symbol, code, filePath } = result;
  const output: string[] = [];

  // Header
  output.push('━'.repeat(80));
  output.push(`Symbol: ${symbol.name}`);
  output.push(`Type: ${formatSymbolType(symbol.kind)}`);
  output.push(`Location: ${formatLocation(filePath, symbol.range)}`);

  if (symbol.detail) {
    output.push(`Signature: ${symbol.detail}`);
  }

  output.push('━'.repeat(80));
  output.push('');
  output.push('Code:');
  output.push('━'.repeat(80));
  output.push(code);
  output.push('━'.repeat(80));

  // Children info
  if (symbol.children && symbol.children.length > 0) {
    output.push('');
    output.push(`Children (${symbol.children.length}):`);
    output.push('━'.repeat(80));
    for (const child of symbol.children) {
      const childType = formatSymbolType(child.kind);
      output.push(`  ${childType}: ${child.name} (line ${child.range.start.line + 1})`);
    }
    output.push('━'.repeat(80));
  }

  return output.join('\n');
}

/**
 * Format read result as JSON
 */
export function formatReadJSON(result: ReadResult): string {
  return JSON.stringify(
    {
      name: result.symbol.name,
      kind: result.symbol.kind,
      kindName: formatSymbolType(result.symbol.kind),
      detail: result.symbol.detail,
      location: {
        file: result.filePath,
        start: {
          line: result.symbol.range.start.line + 1,
          character: result.symbol.range.start.character,
        },
        end: {
          line: result.symbol.range.end.line + 1,
          character: result.symbol.range.end.character,
        },
      },
      code: result.code,
      children: result.symbol.children?.map((child) => ({
        name: child.name,
        kind: child.kind,
        kindName: formatSymbolType(child.kind),
        line: child.range.start.line + 1,
      })),
    },
    null,
    2
  );
}

/**
 * Format read result as compact view
 */
export function formatReadCompact(result: ReadResult): string {
  const { symbol, code, filePath } = result;
  const lines = code.split('\n');

  // Show first few lines if code is too long
  const maxLines = 20;
  let displayCode = code;
  if (lines.length > maxLines) {
    displayCode = lines.slice(0, maxLines).join('\n') + `\n... (${lines.length - maxLines} more lines)`;
  }

  return `${formatSymbolType(symbol.kind)} ${symbol.name} (${formatLocation(filePath, symbol.range)})\n${displayCode}`;
}
