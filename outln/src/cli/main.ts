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

const program = new Command();

program
  .name('outln')
  .description('Extract code outline (symbols) from source files using tree-sitter')
  .version('0.1.0')
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

    } catch (error) {
      console.error('Error:', error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();
