/**
 * Python language provider
 * Extracts symbols from Python source code
 */

import { TreeSitterProvider } from './base.js';
import { SymbolKind } from '../../core/types.js';

// Lazy import for tree-sitter-python
async function loadPythonLanguage() {
  try {
    const module = await import('tree-sitter-python');
    return module.default || module;
  } catch (e) {
    throw new Error('tree-sitter-python is required. Install it with: npm install tree-sitter-python');
  }
}

export class PythonProvider extends TreeSitterProvider {
  constructor() {
    super();
    this.language = null;
  }

  private async initLanguage() {
    if (!this.language) {
      this.language = await loadPythonLanguage();
      this.parser.setLanguage(this.language);
    }
  }

  async getSymbols(filePath: string, source: string) {
    await this.initLanguage();
    return super.getSymbols(filePath, source);
  }

  getSymbolKind(nodeType: string): SymbolKind {
    const kindMap: Record<string, SymbolKind> = {
      'module': SymbolKind.File,
      'class_definition': SymbolKind.Class,
      'function_definition': SymbolKind.Function,
      'decorated_definition': SymbolKind.Function,
      'import_statement': SymbolKind.Module,
      'import_from_statement': SymbolKind.Module,
      'assignment': SymbolKind.Variable,
    };
    return kindMap[nodeType] || SymbolKind.Variable;
  }

  shouldInclude(node: treeSitter.SyntaxNode): boolean {
    const includeTypes = [
      'class_definition',
      'function_definition',
      'decorated_definition',
    ];
    return includeTypes.includes(node.type);
  }

  getNodeName(node: treeSitter.SyntaxNode, source: string): string {
    if (node.type === 'decorated_definition') {
      // Get the actual definition (class or function)
      const def = node.children.find(c =>
        c.type === 'class_definition' || c.type === 'function_definition'
      );
      if (def) {
        const nameNode = def.childForFieldName('name');
        return nameNode ? nameNode.text : '<anonymous>';
      }
    }

    if (node.type === 'class_definition' || node.type === 'function_definition') {
      const nameNode = node.childForFieldName('name');
      return nameNode ? nameNode.text : '<anonymous>';
    }

    return node.text;
  }

  protected getDetail(node: treeSitter.SyntaxNode, source: string): string {
    // Extract decorators
    const decorators = node.children.filter(c => c.type === 'decorator');
    if (decorators.length > 0) {
      return decorators.map(d => '@' + d.text).join(' ');
    }

    // For functions, extract parameters
    if (node.type === 'function_definition') {
      const paramsNode = node.childForFieldName('parameters');
      if (paramsNode) {
        return paramsNode.text;
      }
    }

    // For decorated_definition, recurse to get actual definition
    if (node.type === 'decorated_definition') {
      const def = node.children.find(c =>
        c.type === 'class_definition' || c.type === 'function_definition'
      );
      if (def) {
        return this.getDetail(def, source);
      }
    }

    return '';
  }
}
