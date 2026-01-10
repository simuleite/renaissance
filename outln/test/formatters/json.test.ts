/**
 * Tests for JSON formatter
 */

import { describe, it, expect } from 'vitest';
import { formatJson } from '../../src/formatters/json.js';
import { DocumentSymbol, SymbolKind } from '../../src/core/types.js';

describe('JSON Formatter', () => {
  it('should format empty array', () => {
    const symbols: DocumentSymbol[] = [];
    const output = formatJson(symbols);
    expect(output).toBe('[]');
  });

  it('should format simple symbol', () => {
    const symbols: DocumentSymbol[] = [
      {
        name: 'hello',
        detail: 'func',
        kind: SymbolKind.Function,
        range: { start: { line: 0, character: 0 }, end: { line: 5, character: 1 } },
        selectionRange: { start: { line: 0, character: 5 }, end: { line: 0, character: 10 } },
      }
    ];

    const output = formatJson(symbols);
    const parsed = JSON.parse(output);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('hello');
    expect(parsed[0].kind).toBe(SymbolKind.Function);
    expect(parsed[0].detail).toBe('func');
  });

  it('should format nested symbols', () => {
    const symbols: DocumentSymbol[] = [
      {
        name: 'User',
        detail: '',
        kind: SymbolKind.Class,
        range: { start: { line: 0, character: 0 }, end: { line: 10, character: 1 } },
        selectionRange: { start: { line: 0, character: 5 }, end: { line: 0, character: 9 } },
        children: [
          {
            name: 'Name',
            detail: '',
            kind: SymbolKind.Field,
            range: { start: { line: 1, character: 2 }, end: { line: 1, character: 10 } },
            selectionRange: { start: { line: 1, character: 2 }, end: { line: 1, character: 6 } },
          }
        ]
      }
    ];

    const output = formatJson(symbols);
    const parsed = JSON.parse(output);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('User');
    expect(parsed[0].children).toBeDefined();
    expect(parsed[0].children).toHaveLength(1);
    expect(parsed[0].children[0].name).toBe('Name');
  });
});
