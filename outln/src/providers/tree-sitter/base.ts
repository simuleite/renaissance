/**
 * Tree-sitter base provider
 * Abstract base class for language-specific providers
 */

// Note: In tree-sitter v0.21.0, `require('tree-sitter')` returns the Parser constructor directly
// @ts-ignore
import Parser from 'tree-sitter';
import { SymbolProvider, DocumentSymbol, SymbolKind, Range } from '../../core/types.js';

/**
 * Abstract base class for tree-sitter-based symbol providers
 */
export abstract class TreeSitterProvider implements SymbolProvider {
  protected parser: any;
  protected language: any;

  constructor() {
    // Parser IS the default export in tree-sitter v0.21.0
    this.parser = new Parser();
    // Subclass must set this.language in their constructor
  }

  /**
   * Map tree-sitter node type to SymbolKind
   */
  abstract getSymbolKind(nodeType: string): SymbolKind;

  /**
   * Determine if a node should be included in the symbol list
   */
  abstract shouldInclude(node: treeSitter.SyntaxNode): boolean;

  /**
   * Extract symbol name from node
   */
  abstract getNodeName(node: treeSitter.SyntaxNode, source: string): string;

  /**
   * Extract symbols from source code
   */
  async getSymbols(filePath: string, source: string): Promise<DocumentSymbol[]> {
    // Set language if not already set
    if (this.language && !this.parser.getLanguage()) {
      this.parser.setLanguage(this.language);
    }

    const tree = this.parser.parse(source);
    return this.convertNode(tree.rootNode, source);
  }

  /**
   * Convert tree-sitter node to DocumentSymbol[]
   */
  protected convertNode(node: treeSitter.SyntaxNode, source: string): DocumentSymbol[] {
    const symbols: DocumentSymbol[] = [];

    for (const child of node.children) {
      if (!this.shouldInclude(child)) {
        // Recursively process children that are not included themselves
        const childSymbols = this.convertNode(child, source);
        symbols.push(...childSymbols);
        continue;
      }

      const symbol = this.createSymbol(child, source);
      const children = this.convertNode(child, source);

      if (children.length > 0) {
        symbol.children = children;
      }

      symbols.push(symbol);
    }

    return symbols;
  }

  /**
   * Create a DocumentSymbol from a tree-sitter node
   */
  protected createSymbol(node: treeSitter.SyntaxNode, source: string): DocumentSymbol {
    const name = this.getNodeName(node, source);
    const kind = this.getSymbolKind(node.type);
    const range = this.getRange(node);
    const selectionRange = this.getSelectionRange(node, source);

    return {
      name,
      detail: this.getDetail(node, source),
      kind,
      range,
      selectionRange,
      children: []
    };
  }

  /**
   * Get range from node
   */
  protected getRange(node: treeSitter.SyntaxNode): Range {
    return {
      start: { line: node.startPosition.row, character: node.startPosition.column },
      end: { line: node.endPosition.row, character: node.endPosition.column }
    };
  }

  /**
   * Get selection range (highlight range)
   * Default implementation uses name node if available
   */
  protected getSelectionRange(node: treeSitter.SyntaxNode, source: string): Range {
    // Try to find a name field
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      return {
        start: { line: nameNode.startPosition.row, character: nameNode.startPosition.column },
        end: { line: nameNode.endPosition.row, character: nameNode.endPosition.column }
      };
    }

    return this.getRange(node);
  }

  /**
   * Get detail information (e.g., signature)
   * Default implementation returns empty string
   */
  protected getDetail(node: treeSitter.SyntaxNode, source: string): string {
    return '';
  }
}
