/**
 * Go language provider
 * Extracts symbols from Go source code
 */

import { TreeSitterProvider } from './base.js';
import { SymbolKind } from '../../core/types.js';

// Lazy import for tree-sitter-go
async function loadGoLanguage() {
  try {
    const module = await import('tree-sitter-go');
    return module.default || module;
  } catch (e) {
    throw new Error('tree-sitter-go is required. Install it with: npm install tree-sitter-go');
  }
}

export class GoProvider extends TreeSitterProvider {
  constructor() {
    super();
    this.language = null;
  }

  private async initLanguage() {
    if (!this.language) {
      this.language = await loadGoLanguage();
      this.parser.setLanguage(this.language);
    }
  }

  async getSymbols(filePath: string, source: string) {
    await this.initLanguage();
    return super.getSymbols(filePath, source);
  }

  getSymbolKind(nodeType: string): SymbolKind {
    const kindMap: Record<string, SymbolKind> = {
      'source_file': SymbolKind.File,
      'package_clause': SymbolKind.Package,
      'type_declaration': SymbolKind.Class,
      'type_spec': SymbolKind.Class,
      'function_declaration': SymbolKind.Function,
      'method_declaration': SymbolKind.Method,
      'interface_type': SymbolKind.Interface,
      'struct_type': SymbolKind.Struct,
      'field_declaration': SymbolKind.Field,
      'var_declaration': SymbolKind.Variable,
      'const_declaration': SymbolKind.Constant,
    };
    return kindMap[nodeType] || SymbolKind.Variable;
  }

  shouldInclude(node: treeSitter.SyntaxNode): boolean {
    const includeTypes = [
      'package_clause',
      'type_declaration',
      'function_declaration',
      'method_declaration',
    ];
    return includeTypes.includes(node.type);
  }

  getNodeName(node: treeSitter.SyntaxNode, source: string): string {
    if (node.type === 'package_clause') {
      // package_clause 的子节点是: [package, package_identifier]
      // 包名是第二个子节点 (package_identifier)
      for (const child of node.children) {
        if (child.type === 'package_identifier') {
          return child.text;
        }
      }
      return '<anonymous>';
    }

    if (node.type === 'type_declaration') {
      const typeSpec = node.childForFieldName('name');
      return typeSpec ? typeSpec.text : '<anonymous>';
    }

    if (node.type === 'function_declaration' || node.type === 'method_declaration') {
      const nameNode = node.childForFieldName('name');
      return nameNode ? nameNode.text : '<anonymous>';
    }

    return node.text;
  }

  protected getDetail(node: treeSitter.SyntaxNode, source: string): string {
    // For functions, try to extract signature
    if (node.type === 'function_declaration' || node.type === 'method_declaration') {
      const paramsNode = node.childForFieldName('parameters');
      if (paramsNode) {
        return paramsNode.text;
      }
    }
    return '';
  }

  protected convertNode(node: treeSitter.SyntaxNode, source: string): any[] {
    const symbols: any[] = [];

    for (const child of node.children) {
      // Special handling for type_declaration to extract type_spec
      if (child.type === 'type_declaration') {
        const typeSpec = child.childForFieldName('name');
        if (typeSpec) {
          const symbol = this.createSymbol(child, source);
          const structType = child.childForFieldName('type');
          const children: any[] = [];

          // Extract struct fields
          if (structType && structType.type === 'struct_type') {
            for (const field of structType.children) {
              if (field.type === 'field_declaration') {
                const fieldName = field.childForFieldName('name');
                if (fieldName) {
                  children.push({
                    name: fieldName.text,
                    detail: '',
                    kind: SymbolKind.Field,
                    range: this.getRange(field),
                    selectionRange: this.getSelectionRange(field, source),
                  });
                }
              }
            }
          }

          if (children.length > 0) {
            symbol.children = children;
          }

          symbols.push(symbol);
        }
        continue;
      }

      if (!this.shouldInclude(child)) {
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
}
