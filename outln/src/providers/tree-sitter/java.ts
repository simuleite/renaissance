/**
 * Java language provider
 * Extracts symbols from Java source code
 */

import { TreeSitterProvider } from './base.js';
import { SymbolKind, Range } from '../../core/types.js';

// Lazy import for tree-sitter-java
async function loadJavaLanguage() {
  try {
    const module = await import('tree-sitter-java');
    return module.default || module;
  } catch (e) {
    throw new Error('tree-sitter-java is required. Install it with: npm install tree-sitter-java');
  }
}

export class JavaProvider extends TreeSitterProvider {
  constructor() {
    super();
    // Initialize synchronously, will be set when needed
    this.language = null;
  }

  private async initLanguage() {
    if (!this.language) {
      this.language = await loadJavaLanguage();
      this.parser.setLanguage(this.language);
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
      'interface_declaration': SymbolKind.Interface,
      'enum_declaration': SymbolKind.Enum,
      'method_declaration': SymbolKind.Method,
      'field_declaration': SymbolKind.Field,
      'constructor_declaration': SymbolKind.Constructor,
      'annotation_type_definition': SymbolKind.Annotation,
      'package_declaration': SymbolKind.Package,
      'import_declaration': SymbolKind.Module,
    };
    return kindMap[nodeType] || SymbolKind.Variable;
  }

  shouldInclude(node: treeSitter.SyntaxNode): boolean {
    const includeTypes = [
      'class_declaration',
      'interface_declaration',
      'enum_declaration',
      'method_declaration',
      'field_declaration',
      'constructor_declaration',
      'annotation_type_definition',
      'package_declaration',
    ];
    return includeTypes.includes(node.type);
  }

  getNodeName(node: treeSitter.SyntaxNode, source: string): string {
    if (node.type === 'class_declaration' ||
        node.type === 'interface_declaration' ||
        node.type === 'enum_declaration' ||
        node.type === 'method_declaration' ||
        node.type === 'constructor_declaration') {
      const nameNode = node.childForFieldName('name');
      return nameNode ? nameNode.text : '<anonymous>';
    }

    if (node.type === 'annotation_type_definition') {
      const nameNode = node.childForFieldName('name');
      return '@' + (nameNode ? nameNode.text : '<anonymous>');
    }

    if (node.type === 'package_declaration') {
      const nameNode = node.childForFieldName('name');
      return nameNode ? nameNode.text : '<default>';
    }

    if (node.type === 'field_declaration') {
      // Get declarator name
      const declarator = node.children.find(c => c.type === 'variable_declarator');
      if (declarator) {
        const nameNode = declarator.childForFieldName('name');
        return nameNode ? nameNode.text : '<anonymous>';
      }
    }

    return node.text;
  }

  protected getSelectionRange(node: treeSitter.SyntaxNode, source: string): Range {
    // For class/method/enum/interface, select name range only
    if (['class_declaration', 'method_declaration',
         'interface_declaration', 'enum_declaration',
         'annotation_type_definition'].includes(node.type)) {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        return {
          start: { line: nameNode.startPosition.row, character: nameNode.startPosition.column },
          end: { line: nameNode.endPosition.row, character: nameNode.endPosition.column }
        };
      }
    }

    return this.getRange(node);
  }

  protected getDetail(node: treeSitter.SyntaxNode, source: string): string {
    // Extract annotations
    const modifiers = node.childForFieldName('modifiers');
    if (modifiers) {
      const annotations = modifiers.children.filter(c => c.type === 'annotation');
      if (annotations.length > 0) {
        return annotations.map(a => '@' + a.text).join(' ');
      }
    }

    // For methods, extract return type and parameters
    if (node.type === 'method_declaration' || node.type === 'constructor_declaration') {
      const paramsNode = node.childForFieldName('parameters');
      const typeNode = node.childForFieldName('type');

      let detail = '';
      if (typeNode && node.type === 'method_declaration') {
        detail = typeNode.text;
      }
      if (paramsNode) {
        detail += (detail ? ' ' : '') + paramsNode.text;
      }
      return detail;
    }

    // For fields, extract type
    if (node.type === 'field_declaration') {
      const typeNode = node.childForFieldName('type');
      return typeNode ? typeNode.text : '';
    }

    return '';
  }

  protected convertNode(node: treeSitter.SyntaxNode, source: string): any[] {
    const symbols: any[] = [];

    for (const child of node.children) {
      // Special handling for field_declaration to extract individual fields
      if (child.type === 'field_declaration') {
        const typeNode = child.childForFieldName('type');
        const declarators = child.children.filter(c => c.type === 'variable_declarator');

        for (const declarator of declarators) {
          const nameNode = declarator.childForFieldName('name');
          if (nameNode) {
            symbols.push({
              name: nameNode.text,
              detail: typeNode ? typeNode.text : '',
              kind: SymbolKind.Field,
              range: this.getRange(declarator),
              selectionRange: this.getSelectionRange(declarator, source),
            });
          }
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
