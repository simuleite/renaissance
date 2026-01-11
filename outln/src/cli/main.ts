#!/usr/bin/env node
/**
 * outln CLI
 * Extract code outline (symbols) from source files
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { ProviderRegistry } from '../providers/registry.js';
import { formatJson } from '../formatters/json.js';
import { formatTree } from '../formatters/tree.js';
import { findSymbolByName, extractCodeByRange } from '../core/utils.js';
import { formatReadDetail, formatReadJSON, formatReadCompact } from '../formatters/read.js';

const program = new Command();

program
  .name('outln')
  .description('Extract code outline (symbols) from source files using tree-sitter')
  .version('0.1.0');

// Main command: list all symbols
program
  .argument('<file>', 'source file path')
  .option('-f, --format <type>', 'output format (json|tree)', 'tree')
  .option('-l, --lang <language>', 'force language provider')
  .option('-o, --output <file>', 'output to file instead of stdout')
  .action(async (file, options) => {
    try {
      // Check if file exists
      if (!existsSync(file)) {
        console.error(`Error: File not found: ${file}`);
        process.exit(1);
      }

      // Read file content
      let source: string;
      try {
        source = readFileSync(file, 'utf8');
      } catch (error) {
        console.error(`Error: Failed to read file: ${error}`);
        process.exit(1);
      }

      // Get provider
      const provider = ProviderRegistry.getProvider(file);
      if (!provider) {
        console.error(`Error: Unsupported file type: ${file}`);
        console.error(`Supported extensions: ${ProviderRegistry.getSupportedExtensions().join(', ')}`);
        process.exit(1);
      }

      // Extract symbols
      const symbols = await provider.getSymbols(file, source);

      // Format output
      const formatter = options.format === 'json' ? formatJson : formatTree;
      const output = formatter(symbols);

      // Write output
      if (options.output) {
        const { writeFileSync } = await import('fs');
        writeFileSync(options.output, output);
        console.error(`✅ Output written to: ${options.output}`);
      } else {
        console.log(output);
      }

    } catch (error: any) {
      console.error('Error:', error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Read command: read specific symbol or list all symbols
program
  .command('read <file> [symbol]')
  .description('Read a specific symbol and extract its code')
  .option('--output-format <type>', 'output format (compact|rich|json)', 'compact')
  .option('-o, --output <file>', 'output to file instead of stdout')
  .action(async (file, symbolName, options, command) => {
    try {
      if (process.env.DEBUG) {
        console.error(`DEBUG: options =`, JSON.stringify(options));
        console.error(`DEBUG: file =`, file);
        console.error(`DEBUG: symbolName =`, symbolName);
      }
      // Check if file exists
      if (!existsSync(file)) {
        console.error(`Error: File not found: ${file}`);
        process.exit(1);
      }

      // Read file content
      let source: string;
      try {
        source = readFileSync(file, 'utf8');
      } catch (error: any) {
        console.error(`Error: Failed to read file: ${error}`);
        process.exit(1);
      }

      // Get provider
      const provider = ProviderRegistry.getProvider(file);
      if (!provider) {
        console.error(`Error: Unsupported file type: ${file}`);
        console.error(`Supported extensions: ${ProviderRegistry.getSupportedExtensions().join(', ')}`);
        process.exit(1);
      }

      // Extract symbols
      const symbols = await provider.getSymbols(file, source);

      // If no symbol provided, list all available symbols
      if (!symbolName) {
        console.error(`Available symbols in ${file}:`);
        listAvailableSymbols(symbols, '');
        process.exit(0);
      }

      // Find the target symbol
      const targetSymbol = findSymbolByName(symbols, symbolName);
      if (!targetSymbol) {
        console.error(`Error: Symbol '${symbolName}' not found in file`);
        console.error(`\nAvailable symbols:`);
        listAvailableSymbols(symbols, '');
        process.exit(1);
      }

      // Extract code for the symbol
      const code = extractCodeByRange(source, targetSymbol.range);

      // Format output
      const format = options.outputFormat || 'compact';
      if (process.env.DEBUG) {
        console.error(`DEBUG: format option = "${format}"`);
      }
      let output: string;
      switch (format) {
        case 'json':
          output = formatReadJSON({ symbol: targetSymbol, code, filePath: file });
          break;
        case 'rich':
          output = formatReadDetail({ symbol: targetSymbol, code, filePath: file });
          break;
        case 'compact':
        default:
          output = formatReadCompact({ symbol: targetSymbol, code, filePath: file });
          break;
      }

      // Write output
      if (options.output) {
        const { writeFileSync } = await import('fs');
        writeFileSync(options.output, output);
        console.error(`✅ Output written to: ${options.output}`);
      } else {
        console.log(output);
      }

    } catch (error: any) {
      console.error('Error:', error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

/**
 * Helper function to list available symbols
 */
function listAvailableSymbols(symbols: any[], indent: string): void {
  for (const symbol of symbols) {
    const kind = symbol.kind === 11 ? 'fn' : symbol.kind === 4 ? 'type' : symbol.kind === 5 ? 'method' : 'symbol';
    console.error(`${indent}- ${kind} ${symbol.name}`);

    if (symbol.children && symbol.children.length > 0) {
      listAvailableSymbols(symbol.children, indent + '  ');
    }
  }
}

program.parse();
