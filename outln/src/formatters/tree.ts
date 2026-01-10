/**
 * Tree formatter
 * Outputs symbols as ASCII tree with colors
 */

import chalk from 'chalk';
import { DocumentSymbol, SymbolKind } from '../core/types.js';

/**
 * Format symbols as ASCII tree
 * @param symbols - Array of document symbols
 * @param indent - Current indentation level
 * @returns Formatted tree string
 */
export function formatTree(symbols: DocumentSymbol[], indent = 0): string {
  let result = '';
  const isLast = (index: number) => index === symbols.length - 1;

  symbols.forEach((symbol, index) => {
    const prefix = indent === 0 ? '' : (isLast(index) ? '└── ' : '├── ');
    const kindLabel = getKindLabel(symbol.kind);
    const coloredName = colorByKind(symbol.name, symbol.kind);
    const location = `:${symbol.range.start.line + 1}`;

    result += '  '.repeat(indent) + prefix + `${kindLabel} ${coloredName}${location}`;

    if (symbol.detail) {
      result += chalk.gray(` \u001b[3m${symbol.detail}\u001b[0m`);
    }

    result += '\n';

    if (symbol.children && symbol.children.length > 0) {
      result += formatTree(symbol.children, indent + 1);
    }
  });

  return result;
}

/**
 * Get short label for symbol kind
 */
function getKindLabel(kind: SymbolKind): string {
  const labels: Record<SymbolKind, string> = {
    [SymbolKind.File]: 'file',
    [SymbolKind.Module]: 'mod',
    [SymbolKind.Namespace]: 'ns',
    [SymbolKind.Package]: 'pkg',
    [SymbolKind.Class]: 'class',
    [SymbolKind.Method]: 'method',
    [SymbolKind.Property]: 'prop',
    [SymbolKind.Field]: 'field',
    [SymbolKind.Constructor]: 'ctor',
    [SymbolKind.Enum]: 'enum',
    [SymbolKind.Interface]: 'interface',
    [SymbolKind.Function]: 'fn',
    [SymbolKind.Variable]: 'var',
    [SymbolKind.Constant]: 'const',
    [SymbolKind.String]: 'str',
    [SymbolKind.Number]: 'num',
    [SymbolKind.Boolean]: 'bool',
    [SymbolKind.Array]: 'array',
    [SymbolKind.Object]: 'object',
    [SymbolKind.Key]: 'key',
    [SymbolKind.Null]: 'null',
    [SymbolKind.EnumMember]: 'enum_member',
    [SymbolKind.Struct]: 'struct',
    [SymbolKind.Event]: 'event',
    [SymbolKind.Annotation]: '@',
  };
  return labels[kind] || 'sym';
}

/**
 * Apply color to symbol name based on kind
 */
function colorByKind(text: string, kind: SymbolKind): string {
  const colors: Record<SymbolKind, (s: string) => string> = {
    [SymbolKind.Package]: chalk.bold.yellow,
    [SymbolKind.Class]: chalk.yellow,
    [SymbolKind.Interface]: chalk.yellow,
    [SymbolKind.Struct]: chalk.yellow,
    [SymbolKind.Enum]: chalk.magenta,
    [SymbolKind.Function]: chalk.blue,
    [SymbolKind.Method]: chalk.cyan,
    [SymbolKind.Constructor]: chalk.cyan,
    [SymbolKind.Variable]: chalk.white,
    [SymbolKind.Constant]: chalk.green,
    [SymbolKind.Property]: chalk.green,
    [SymbolKind.Field]: chalk.green,
    [SymbolKind.Annotation]: chalk.magenta,
  };

  const colorFn = colors[kind] || chalk.white;
  return colorFn(text);
}
