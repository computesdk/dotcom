---
title: Terminal
description: Interactive terminal operations in sandboxes
sidebar:
    order: 5
---

Create and manage interactive terminal sessions within sandboxes.

> **Note:** Terminal operations are currently only supported by the E2B provider.

## Methods

### `sandbox.terminal.create(options)`

Create a new terminal session.

```typescript
const terminal = await sandbox.terminal.create({
  command: 'bash',
  cols: 80,
  rows: 24,
  onData: (data: Uint8Array) => {
    const output = new TextDecoder().decode(data);
    console.log('Terminal output:', output);
  }
});
```

**Parameters:**
- `options` - Terminal configuration
  - `command` - Shell command to run ('bash', 'sh', 'python3', etc.)
  - `cols` - Terminal width in columns
  - `rows` - Terminal height in rows  
  - `onData?` - Callback for terminal output

**Returns:** Terminal instance

### `sandbox.terminal.list()`

List all terminal sessions.

```typescript
const terminals = await sandbox.terminal.list();
console.log(`Active terminals: ${terminals.length}`);
```

**Returns:** Array of terminal instances

### `sandbox.terminal.getById(id)`

Get a terminal session by ID.

```typescript
const terminal = await sandbox.terminal.getById('terminal-id');
```

**Parameters:**
- `id` - Terminal ID string

**Returns:** Terminal instance

## Terminal Instance Methods

### `terminal.write(data)`

Write data to the terminal.

```typescript
// Send commands
await terminal.write('ls -la\n');
await terminal.write('cd /workspace\n');
await terminal.write('python3 script.py\n');

// Interactive input
await terminal.write('y\n'); // Respond to prompt
```

**Parameters:**
- `data` - Data string to write

### `terminal.resize(cols, rows)`

Resize the terminal.

```typescript
await terminal.resize(120, 30); // Larger terminal
```

**Parameters:**
- `cols` - New width in columns
- `rows` - New height in rows

### `terminal.kill()`

Terminate the terminal session.

```typescript
await terminal.kill();
```

### `terminal.destroy()`

Destroy the terminal (alias for kill).

```typescript
await terminal.destroy();
```

## Types

```typescript
interface Terminal {
  id: string;
  command: string;
  cols: number;
  rows: number;
  
  write(data: string): Promise<void>;
  resize(cols: number, rows: number): Promise<void>;
  kill(): Promise<void>;
  destroy(): Promise<void>;
}

interface TerminalOptions {
  command: string;
  cols: number;
  rows: number;
  onData?: (data: Uint8Array) => void;
}
```

## Examples

### Interactive Python Session

```typescript
const terminal = await sandbox.terminal.create({
  command: 'python3',
  cols: 80,
  rows: 24,
  onData: (data) => {
    const output = new TextDecoder().decode(data);
    process.stdout.write(output); // Forward to console
  }
});

// Send Python commands
await terminal.write('import numpy as np\n');
await terminal.write('import pandas as pd\n');
await terminal.write('print("Libraries loaded!")\n');

// Create data and analyze
await terminal.write('data = np.array([1, 2, 3, 4, 5])\n');
await terminal.write('print(f"Mean: {data.mean()}")\n');
await terminal.write('print(f"Sum: {data.sum()}")\n');

// Exit Python
await terminal.write('exit()\n');

// Clean up
await terminal.kill();
```

### Interactive Shell Session

```typescript
const terminal = await sandbox.terminal.create({
  command: 'bash',
  cols: 100,
  rows: 30,
  onData: (data) => {
    const output = new TextDecoder().decode(data);
    console.log('Shell:', output);
  }
});

// Set up environment
await terminal.write('cd /workspace\n');
await terminal.write('export PATH=$PATH:/usr/local/bin\n');

// Create and run script
await terminal.write('cat > hello.sh << EOF\n');
await terminal.write('#!/bin/bash\n');
await terminal.write('echo "Hello from terminal script!"\n');
await terminal.write('echo "Current directory: $(pwd)"\n');
await terminal.write('echo "Current user: $(whoami)"\n');
await terminal.write('EOF\n');

await terminal.write('chmod +x hello.sh\n');
await terminal.write('./hello.sh\n');

// List files
await terminal.write('ls -la\n');

// Clean up
await terminal.kill();
```

### Long-running Process Management

```typescript
const terminal = await sandbox.terminal.create({
  command: 'bash',
  cols: 80,
  rows: 24,
  onData: (data) => {
    const output = new TextDecoder().decode(data);
    
    // Handle different types of output
    if (output.includes('ERROR')) {
      console.error('Process error:', output);
    } else if (output.includes('COMPLETE')) {
      console.log('Process completed:', output);
    } else {
      console.log('Process output:', output);
    }
  }
});

// Start long-running process
await terminal.write('python3 -c "\n');
await terminal.write('import time\n');
await terminal.write('for i in range(10):\n');
await terminal.write('    print(f"Step {i+1}/10")\n');
await terminal.write('    time.sleep(1)\n');
await terminal.write('print("COMPLETE")\n');
await terminal.write('"\n');

// Wait for process to complete (in real app, use proper event handling)
await new Promise(resolve => setTimeout(resolve, 12000));

// Check if still active
const terminals = await sandbox.terminal.list();
const activeTerminal = terminals.find(t => t.id === terminal.id);

if (activeTerminal) {
  await terminal.kill();
}
```

### Multiple Terminal Sessions

```typescript
// Create multiple terminals for different tasks
const shellTerminal = await sandbox.terminal.create({
  command: 'bash',
  cols: 80,
  rows: 24
});

const pythonTerminal = await sandbox.terminal.create({
  command: 'python3',
  cols: 80,
  rows: 24
});

// Use shell terminal for setup
await shellTerminal.write('mkdir -p /workspace/data\n');
await shellTerminal.write('cd /workspace/data\n');
await shellTerminal.write('echo "sample data" > input.txt\n');

// Use Python terminal for processing
await pythonTerminal.write('import os\n');
await pythonTerminal.write('os.chdir("/workspace/data")\n');
await pythonTerminal.write('with open("input.txt", "r") as f:\n');
await pythonTerminal.write('    data = f.read().strip()\n');
await pythonTerminal.write('print(f"Data: {data}")\n');

// Clean up both terminals
await shellTerminal.kill();
await pythonTerminal.kill();
```