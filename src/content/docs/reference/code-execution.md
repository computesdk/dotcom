---
title: Code Execution
description: Execute code and shell commands in sandboxes
sidebar:
    order: 3
---

Execute code and shell commands within sandboxes.

## Methods

### `sandbox.runCode(code, runtime?)`

Execute code in the specified runtime.

```typescript
// Execute Python code
const result = await sandbox.runCode('print("Hello World!")', 'python');

// Execute Node.js code
const result = await sandbox.runCode('console.log("Hello World!")', 'node');

// Auto-detect runtime (based on code patterns)
const result = await sandbox.runCode('print("Auto-detected as Python")');
```

**Parameters:**
- `code` - Code string to execute
- `runtime?` - Runtime environment ('python' | 'node'), auto-detected if not specified

**Returns:** `ExecutionResult`

### `sandbox.runCommand(command, args?)`

Execute a shell command.

```typescript
// List files
const result = await sandbox.runCommand('ls', ['-la']);

// Install Python package
const result = await sandbox.runCommand('pip', ['install', 'requests']);

// Run script
const result = await sandbox.runCommand('python', ['script.py']);
```

**Parameters:**
- `command` - Command to execute
- `args?` - Array of command arguments

**Returns:** `ExecutionResult`

## ExecutionResult

All execution methods return a standardized result object.

```typescript
interface ExecutionResult {
  stdout: string;         // Standard output
  stderr: string;         // Standard error
  exitCode: number;       // Exit code (0 = success)
  executionTime: number;  // Execution time in milliseconds
  sandboxId: string;      // Sandbox ID
  provider: string;       // Provider name
}
```

## Examples

### Python Data Processing

```typescript
const result = await sandbox.runCode(`
import json
import pandas as pd

# Create sample data
data = {'A': [1, 2, 3], 'B': [4, 5, 6]}
df = pd.DataFrame(data)

# Process and output
result = {
    'shape': df.shape,
    'sum': df.sum().to_dict()
}

print(json.dumps(result))
`, 'python');

const output = JSON.parse(result.stdout);
console.log(output); // { shape: [3, 2], sum: { A: 6, B: 15 } }
```

### Node.js API Simulation

```typescript
const result = await sandbox.runCode(`
const data = {
    users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
    ]
};

console.log(JSON.stringify(data, null, 2));
`, 'node');

console.log(result.stdout); // Formatted JSON output
```

### Shell Commands

```typescript
// Create directory and files
await sandbox.runCommand('mkdir', ['-p', '/workspace/data']);
await sandbox.runCommand('touch', ['/workspace/data/file1.txt', '/workspace/data/file2.txt']);

// List contents
const result = await sandbox.runCommand('ls', ['-la', '/workspace/data']);
console.log(result.stdout);
```