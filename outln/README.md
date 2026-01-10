# outln

> Extract code outline (symbols) from source files using tree-sitter

`outln` is a fast, lightweight command-line tool that extracts the structure (outline) of source code files. It shows you classes, functions, methods, and other symbols in a clean tree format or JSON.

## Features

- 🚀 **Fast** - Uses tree-sitter for lightning-fast parsing (<10ms for typical files)
- 🌐 **Multi-language** - Supports Go, TypeScript, JavaScript, Python, Java
- 📊 **Multiple formats** - Output as ASCII tree or JSON
- 🎨 **Color-coded** - Different colors for different symbol types
- 📦 **Zero dependencies** - No language servers needed (pure tree-sitter)
- 🔧 **VSCode compatible** - Uses VSCode's DocumentSymbol data structure

## Installation

### From source

```bash
# Clone the repository
cd outln

# Install dependencies
npm install

# Build the project
npm run build

# Install globally
npm install -g .
```

### From npm (when published)

```bash
npm install -g outln
```

## Usage

### Basic usage

```bash
outln <file>
```

### Examples

#### Go file

```bash
$ outln main.go
pkg main
├── type User
│   ├── field Name
│   └── field Age
└── fn main
```

#### TypeScript file

```bash
$ outln app.ts
interface Config
├── property port
└── property host

class App
├── property config
├── constructor App
└── method start
```

#### Java file

```bash
$ outln UserService.java
pkg com.example.service
└── class UserService
    ├── field repository
    ├── method findById
    └── method save
```

### Options

```bash
# Output as JSON
outln main.go --format json

# Save to file
outln app.ts -o outline.txt

# Show help
outln --help

# Show version
outln --version
```

## Supported Languages

| Language | Extensions | Status |
|----------|-----------|--------|
| Go | `.go` | ✅ |
| TypeScript | `.ts`, `.tsx` | ✅ |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` | ✅ |
| Python | `.py`, `.pyi` | ✅ |
| Java | `.java` | ✅ |

## Output Format

### Tree Format (default)

```
pkg main
├── type User
│   ├── field Name:5
│   └── field Age:6
└── fn main:8
    └── method Greet:11
```

Legend:
- `pkg` - package
- `class` - class
- `interface` - interface
- `fn` - function
- `method` - method
- `field` - field
- `var` - variable
- `const` - constant

### JSON Format

```json
[
  {
    "name": "main",
    "detail": "",
    "kind": 3,
    "range": {
      "start": { "line": 0, "character": 0 },
      "end": { "line": 20, "character": 1 }
    },
    "selectionRange": {
      "start": { "line": 0, "character": 8 },
      "end": { "line": 0, "character": 12 }
    },
    "children": [...]
  }
]
```

Symbol kinds (from VSCode):
- 0: File
- 1: Module
- 2: Namespace
- 3: Package
- 4: Class
- 5: Method
- 6: Property
- 7: Field
- 8: Constructor
- 9: Enum
- 10: Interface
- 11: Function
- 12: Variable
- 13: Constant
- 23: Struct
- 25: Annotation

## Development

### Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev -- examples/demo.go

# Run tests
npm test

# Build
npm run build
```

### Project structure

```
outln/
├── src/
│   ├── cli/              # CLI entry point
│   │   └── main.ts
│   ├── core/             # Core types and interfaces
│   │   ├── types.ts
│   │   └── text-model.ts
│   ├── providers/        # Language providers
│   │   ├── registry.ts
│   │   └── tree-sitter/
│   │       ├── base.ts
│   │       ├── go.ts
│   │       ├── typescript.ts
│   │       ├── python.ts
│   │       └── java.ts
│   └── formatters/       # Output formatters
│       ├── json.ts
│       └── tree.ts
├── examples/             # Example files
├── test/                 # Tests
├── package.json
├── tsconfig.json
└── README.md
```

### Adding a new language

1. Create a new provider in `src/providers/tree-sitter/`:

```typescript
// mylang.ts
import { TreeSitterProvider, SymbolKind } from './base.js';

export class MyLangProvider extends TreeSitterProvider {
  constructor() {
    super();
    this.language = /* import language */;
    this.parser.setLanguage(this.language);
  }

  getSymbolKind(nodeType: string): SymbolKind {
    // Map node types to SymbolKind
  }

  shouldInclude(node: treeSitter.SyntaxNode): boolean {
    // Decide which nodes to include
  }

  getNodeName(node: treeSitter.SyntaxNode, source: string): string {
    // Extract name from node
  }
}
```

2. Register in `src/providers/registry.ts`:

```typescript
import { MyLangProvider } from './tree-sitter/mylang.js';

private static providers = new Map([
  // ...
  ['.mylang', () => new MyLangProvider()],
]);
```

## How it works

`outln` uses [tree-sitter](https://tree-sitter.github.io/) to parse source code and build an Abstract Syntax Tree (AST). It then traverses the AST and extracts symbols (classes, functions, methods, etc.) and converts them to VSCode-compatible `DocumentSymbol` objects.

The architecture is inspired by VSCode's outline feature, but streamlined for command-line usage.

## Comparison with other tools

| Tool | Speed | Accuracy | Dependencies | Use case |
|------|-------|----------|-------------|----------|
| **outln** | ⚡⚡⚡ Very fast | ⭐⭐⭐ Good | tree-sitter only | Quick code overview |
| **LSP clients** | ⚡ Slow | ⭐⭐⭐⭐⭐ Perfect | Language servers | IDE integration |
| **grep/ack** | ⚡⚡⚡⚡ Fast | ⭐ Poor | None | Text search |

## Benchmarks

Parsing time for typical files (measured on MacBook Pro M1):

| File | Lines | Time |
|------|-------|------|
| `main.go` | 150 | 2ms |
| `app.ts` | 300 | 3ms |
| `UserService.java` | 200 | 4ms |
| `utils.py` | 500 | 5ms |

## Limitations

- No semantic analysis (only parses syntax)
- No cross-file references
- No type information
- Limited to what tree-sitter grammars support

For more accurate results (e.g., resolved types, inherited members), use a language server protocol (LSP) client.

## Contributing

Contributions are welcome! Feel free to:

- Add support for new languages
- Improve existing providers
- Add new output formats
- Fix bugs
- Improve documentation

## License

MIT

## Inspired by

- [VSCode](https://github.com/microsoft/vscode) - Outline architecture
- [tree-sitter](https://tree-sitter.github.io/) - Parsing engine
- [ctags](https://ctags.io/) - Classic symbol extraction

---

Made with ❤️ by the open-source community
