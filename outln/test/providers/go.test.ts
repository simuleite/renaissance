/**
 * Tests for Go provider
 */

import { describe, it, expect } from 'vitest';
import { GoProvider } from '../../src/providers/tree-sitter/go.js';
import { SymbolKind } from '../../src/core/types.js';

describe('GoProvider', () => {
  it('should extract package declaration', async () => {
    const source = `
      package main

      func hello() {
        fmt.Println("Hello")
      }
    `;

    const provider = new GoProvider();
    const symbols = await provider.getSymbols('test.go', source);

    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols[0].kind).toBe(SymbolKind.Package);
    expect(symbols[0].name).toBe('main');
  });

  it('should extract function declarations', async () => {
    const source = `
      package main

      func hello() {
        fmt.Println("Hello")
      }
    `;

    const provider = new GoProvider();
    const symbols = await provider.getSymbols('test.go', source);

    const funcSymbols = symbols.flatMap(s =>
      s.children ? s.children.filter(c => c.kind === SymbolKind.Function) : []
    );

    expect(funcSymbols.length).toBeGreaterThan(0);
    expect(funcSymbols[0].name).toBe('hello');
  });

  it('should extract struct declarations with fields', async () => {
    const source = `
      package main

      type User struct {
        Name string
        Age  int
      }
    `;

    const provider = new GoProvider();
    const symbols = await provider.getSymbols('test.go', source);

    const typeSymbols = symbols.flatMap(s =>
      s.children ? s.children.filter(c => c.kind === SymbolKind.Class) : []
    );

    expect(typeSymbols.length).toBeGreaterThan(0);
    expect(typeSymbols[0].name).toBe('User');
    expect(typeSymbols[0].children).toBeDefined();
    expect(typeSymbols[0].children!.length).toBe(2);
    expect(typeSymbols[0].children![0].name).toBe('Name');
    expect(typeSymbols[0].children![1].name).toBe('Age');
  });
});
