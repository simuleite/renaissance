import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function build() {
  try {
    // 确保输出目录存在
    mkdirSync('./dist', { recursive: true });
    mkdirSync('./dist/cli', { recursive: true });

    // 构建 CLI 主程序
    await esbuild.build({
      entryPoints: ['./src/cli/main.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outfile: './dist/cli/main.js',
      format: 'esm',
      packages: 'external',
      external: ['tree-sitter-go', 'tree-sitter-typescript', 'tree-sitter-python', 'tree-sitter-java', 'tree-sitter', 'node:*'],
      banner: {
        js: '// @ts-check',
      },
      logLevel: 'info',
    });

    // Add shebang to the output file (only if not already present)
    const fs = await import('fs');
    let content = fs.readFileSync('./dist/cli/main.js', 'utf8');
    if (!content.startsWith('#!/usr/bin/env node')) {
      content = '#!/usr/bin/env node\n' + content;
      fs.writeFileSync('./dist/cli/main.js', content);
    }

    // 复制 package.json 到 dist
    copyFileSync('./package.json', './dist/package.json');

    console.log('✅ Build completed successfully!');
    console.log('📦 Output: ./dist/cli/main.js');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
