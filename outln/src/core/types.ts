/**
 * VSCode-compatible DocumentSymbol interface
 * Reference: src/vs/editor/common/languages.ts:1712-1721
 */

/**
 * Position in a text document
 */
export interface Position {
  /** Line number (0-based) */
  line: number;
  /** Character offset (0-based) */
  character: number;
}

/**
 * Range in a text document
 */
export interface Range {
  /** Start position */
  start: Position;
  /** End position */
  end: Position;
}

/**
 * Symbol kinds enumeration
 * Reference: src/vs/editor/common/languages.ts
 */
export enum SymbolKind {
  File = 0,
  Module = 1,
  Namespace = 2,
  Package = 3,
  Class = 4,
  Method = 5,
  Property = 6,
  Field = 7,
  Constructor = 8,
  Enum = 9,
  Interface = 10,
  Function = 11,
  Variable = 12,
  Constant = 13,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Annotation = 25,
}

/**
 * Document symbol interface
 * Represents a programming construct like a function, class, or variable
 * Reference: src/vs/editor/common/languages.ts:1712-1721
 */
export interface DocumentSymbol {
  /** The name of this symbol */
  name: string;

  /** More detail for this symbol (e.g., signature or type) */
  detail: string;

  /** The kind of this symbol */
  kind: SymbolKind;

  /** The range enclosing this symbol */
  range: Range;

  /** The range that should be highlighted */
  selectionRange: Range;

  /** Child symbols (e.g., methods in a class) */
  children?: DocumentSymbol[];
}

/**
 * Symbol provider interface
 * Extracts symbols from source code
 */
export interface SymbolProvider {
  /**
   * Extract symbols from source code
   * @param filePath - Path to the source file
   * @param source - Source code content
   * @returns Promise of document symbols array
   */
  getSymbols(filePath: string, source: string): Promise<DocumentSymbol[]>;
}
