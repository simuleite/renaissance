/**
 * Tests for tree formatter
 */

import { describe, it, expect } from 'vitest';
import { formatTree } from '../../src/formatters/tree.js';
import { DocumentSymbol, SymbolKind } from '../../src/core/types.js';

describe('Tree Formatter', () => {
  it('should format empty symbols', () => {
    const symbols: DocumentSymbol[] = [];
    const output = formatTree(symbols);
    expect(output).toBe('');
  });

  it('should format simple symbol tree', () => {
    const symbols: DocumentSymbol[] = [
      {
        name: 'main',
        detail: '',
        kind: SymbolKind.Package,
        range: { start: { line: 0, character: 0 }, end: { line: 10, character: 0 } },
        selectionRange: { start: { line: 0, character: 8 }, end: { line: 0, character: 12 } },
        children: [
          {
            name: 'hello',
            detail: '',
            kind: SymbolKind.Function,
            range: { start: { line: 2, character: 0 }, end: { line: 4, character: 1 } },
            selectionRange: { start: { line: 2, character: 5 }, end: { line: 2, character: 10 } },
          }
        ]
      }
    ];

    const output = formatTree(symbols);

    expect(output).toContain('pkg main');
    expect(output).toContain('fn hello');
    expect(output).toContain('└──');
  });

  it('should format nested symbols', () => {
    const symbols: DocumentSymbol[] = [
      {
        name: 'main',
        detail: '',
        kind: SymbolKind.Package,
        range: { start: { line: 0, character: 0 }, end: { line: 20, character: 0 } },
        selectionRange: { start: { line: 0, character: 8 }, end: { line: 0, character: 12 } },
        children: [
          {
            name: 'User',
            detail: '',
            kind: SymbolKind.Class,
            range: { start: { line: 2, character: 0 }, end: { line: 8, character: 1 } },
            selectionRange: { start: { line: 2, character: 5 }, end: { line: 2, character: 9 } },
            children: [
              {
                name: 'Name',
                detail: '',
                kind: SymbolKind.Field,
                range: { start: { line: 3, character: 2 }, end: { line: 3, character: 10 } },
                selectionRange: { start: { line: 3, character: 2 }, end: { line: 3, character: 6 } },
              },
              {
                name: 'Age',
                detail: '',
                kind: SymbolKind.Field,
                range: { start: { line: 4, character: 2 }, end: { line: 4, character: 8 } },
                selectionRange: { start: { line: 4, character: 2 }, end: { line: 4, character: 5 } },
              }
            ]
          }
        ]
      }
    ];

    const output = formatTree(symbols);

    expect(output).toContain('pkg main');
    expect(output).toContain('class User');
    expect(output).toContain('field Name');
    expect(output).toContain('field Age');
    expect(output).toContain('├──');
    expect(output).toContain('│');
  });
});
