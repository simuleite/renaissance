/**
 * TypeScript/JavaScript language provider
 * Extracts symbols from TypeScript/JavaScript source code
 */

import { TreeSitterProvider } from './base.js';
import { SymbolKind } from '../../core/types.js';

// Lazy import for tree-sitter-typescript
async function loadTsLanguage() {
  try {
    const module = await import('tree-sitter-typescript');
    return module;
  } catch (e) {
    throw new Error('tree-sitter-typescript is required. Install it with: npm install tree-sitter-typescript');
  }
}

export class TypeScriptProvider extends TreeSitterProvider {
  private isTSX: boolean = false;
  private filePath: string = '';

  constructor(filePath: string = '') {
    super();
    this.filePath = filePath;
    this.isTSX = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
    this.language = null;
  }

  private async initLanguage() {
    if (!this.language) {
      const TsLanguage = await loadTsLanguage();

      // TypeScript has two languages: typescript and tsx
      if (this.isTSX) {
        this.language = TsLanguage.tsx || TsLanguage.default?.tsx;
      } else {
        this.language = TsLanguage.typescript || TsLanguage.default?.typescript;
      }

      if (this.language) {
        this.parser.setLanguage(this.language);
      }
    }
  }

  async getSymbols(filePath: string, source: string) {
    await this.initLanguage();
    return super.getSymbols(filePath, source);
  }

  getSymbolKind(nodeType: string): SymbolKind {
    const kindMap: Record<string, SymbolKind> = {
      'program': SymbolKind.File,
      'class_declaration': SymbolKind.Class,
      'class': SymbolKind.Class,
      'interface_declaration': SymbolKind.Interface,
      'type_alias_declaration': SymbolKind.Class,
      'function_declaration': SymbolKind.Function,
      'function': SymbolKind.Function,
      'method_definition': SymbolKind.Method,
      'arrow_function': SymbolKind.Function,
      'variable_declaration': SymbolKind.Variable,
      'lexical_declaration': SymbolKind.Variable,
      'export_statement': SymbolKind.Module,
      'import_statement': SymbolKind.Module,
      'decorator': SymbolKind.Annotation,
      'property_declaration': SymbolKind.Property,
      'public_field_definition': SymbolKind.Property,
      'enum_declaration': SymbolKind.Enum,
    };
    return kindMap[nodeType] || SymbolKind.Variable;
  }

  shouldInclude(node: treeSitter.SyntaxNode): boolean {
    const includeTypes = [
      'class_declaration',
      'interface_declaration',
      'type_alias_declaration',
      'function_declaration',
      'method_definition',
      'variable_declaration',
      'lexical_declaration',
      'enum_declaration',
    ];
    return includeTypes.includes(node.type);
  }

  getNodeName(node: treeSitter.SyntaxNode, source: string): string {
    if (node.type === 'class_declaration' ||
        node.type === 'interface_declaration' ||
        node.type === 'type_alias_declaration' ||
        node.type === 'function_declaration' ||
        node.type === 'enum_declaration') {
      const nameNode = node.childForFieldName('name');
      return nameNode ? nameNode.text : '<anonymous>';
    }

    if (node.type === 'method_definition') {
      const nameNode = node.childForFieldName('name');
      return nameNode ? nameNode.text : '<anonymous>';
    }

    if (node.type === 'variable_declaration' || node.type === 'lexical_declaration') {
      // Get the variable name from declarator
      const declarator = node.children.find(c => c.type === 'variable_declarator');
      if (declarator) {
        const nameNode = declarator.childForFieldName('name');
        return nameNode ? nameNode.text : '<anonymous>';
      }
    }

    return node.text;
  }

  protected getDetail(node: treeSitter.SyntaxNode, source: string): string {
    // Extract decorators
    const decorators = node.children.filter(c => c.type === 'decorator');
    if (decorators.length > 0) {
      return decorators.map(d => '@' + d.text).join(' ');
    }

    // For functions, extract signature
    if (node.type === 'function_declaration' || node.type === 'method_definition') {
      const paramsNode = node.childForFieldName('parameters');
      if (paramsNode) {
        return paramsNode.text;
      }
    }

    return '';
  }
}
