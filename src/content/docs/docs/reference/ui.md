---
title: UI Package
description: Frontend integration utilities for ComputeSDK - Types, hooks, and utilities for building compute interfaces across any framework
---

# @computesdk/ui

Framework-agnostic factory functions and types for ComputeSDK frontend integration.

## Installation

```bash
npm install @computesdk/ui
```

## What's Included

### Types
Complete TypeScript definitions for ComputeSDK API integration:

```typescript
import type { 
  ComputeRequest, 
  ComputeResponse, 
  Runtime,
  UIConsole,
  UISandbox,
  UIFilesystem
} from '@computesdk/ui'
```

### Factory Functions
Framework-agnostic functions for creating compute instances:

```typescript
import { createCompute, createSandboxConsole } from '@computesdk/ui'

// Main compute management
const compute = createCompute({
  apiEndpoint: '/api/compute',
  defaultRuntime: 'python'
})

// Create sandbox
const sandbox = await compute.sandbox.create()

// REPL-style console with history
const console = createSandboxConsole({
  sandboxId: sandbox.id,
  apiEndpoint: '/api/compute'
})

await console.runCode('x = 42')
await console.runCode('print(x)')  // Maintains context
console.history  // View execution history
```

### API Utilities
Helper functions for making requests to ComputeSDK APIs:

```typescript
import { executeComputeRequest, APIError } from '@computesdk/ui'

const response = await executeComputeRequest({
  action: 'compute.sandbox.runCode',
  code: 'print("Hello World!")',
  runtime: 'python'
}, '/api/compute')
```

### Validation Utilities
Input validation for compute operations:

```typescript
import { 
  validateCode,
  validateRuntime,
  validateComputeRequest 
} from '@computesdk/ui'

const codeValidation = validateCode('print("hello")')
if (!codeValidation.isValid) {
  console.error(codeValidation.errors)
}
```

## API Reference

### createCompute Factory

Factory function for creating compute instances. Returns a compute object with sandbox management capabilities.

```typescript
function createCompute(config?: CreateComputeConfig): ComputeInstance
```

**Configuration:**
```typescript
interface CreateComputeConfig {
  apiEndpoint?: string;        // Default: '/api/compute'
  defaultRuntime?: Runtime;    // Default: 'python'
  timeout?: number;            // Request timeout in ms
  retries?: number;            // Number of retry attempts
}
```

### createSandboxConsole Factory

Factory function for creating REPL-style consoles with execution history and context persistence.

```typescript
function createSandboxConsole(config: SandboxConsoleConfig): UIConsole
```

**Configuration:**
```typescript
interface SandboxConsoleConfig {
  sandboxId: string;
  apiEndpoint?: string;
  defaultRuntime?: Runtime;
}
```

**Returns:**
```typescript
interface UIConsole {
  runCode: (code: string, runtime?: Runtime) => Promise<ComputeResponse>;
  history: Array<{ code: string; result: ComputeResponse; timestamp: Date }>;
  clear: () => void;
  getContext: () => Record<string, any>;
}
```

### useCompute Hook

The main hook for compute operations. Returns a `ComputeHook` object with sandbox management capabilities.

```typescript
function useCompute(config?: UseComputeConfig): ComputeHook
```

**Configuration:**
```typescript
interface UseComputeConfig {
  apiEndpoint?: string;        // Default: '/api/compute'
  defaultRuntime?: Runtime;    // Default: 'python'
  timeout?: number;            // Request timeout in ms
  retries?: number;            // Number of retry attempts
}
```

**Returns:**
```typescript
interface ComputeHook {
  sandbox: {
    create: (options?: { runtime?: Runtime; timeout?: number }) => Promise<FrontendSandbox>;
    get: (sandboxId: string) => Promise<FrontendSandbox | null>;
    list: () => Promise<FrontendSandbox[]>;
    destroy: (sandboxId: string) => Promise<void>;
  };
}
```

### UISandbox

Enhanced sandbox interface with additional UI-specific methods:

```typescript
interface UISandbox extends FrontendSandbox {
  id: string;
  provider: string;
  
  // Enhanced code execution with UI features
  runCode: (code: string, runtime?: Runtime) => Promise<ComputeResponse>;
  runCommand: (command: string, args?: string[]) => Promise<ComputeResponse>;
  
  // UI-specific features
  getExecutionHistory: () => ExecutionHistoryEntry[];
  clearHistory: () => void;
  
  // Sandbox management
  getInfo: () => Promise<ComputeResponse>;
  destroy: () => Promise<ComputeResponse>;
  
  // Enhanced filesystem with UI helpers
  filesystem: UIFilesystem;
  
  // Terminal operations
  terminal: {
    create: (options?: TerminalOptions) => Promise<FrontendTerminal>;
    getById: (terminalId: string) => Promise<FrontendTerminal | null>;
    list: () => Promise<FrontendTerminal[]>;
    destroy: (terminalId: string) => Promise<void>;
  };
}
```

### UIFilesystem

Enhanced filesystem interface with UI-specific methods:

```typescript
interface UIFilesystem {
  readFile: (path: string) => Promise<ComputeResponse>;
  writeFile: (path: string, content: string) => Promise<ComputeResponse>;
  mkdir: (path: string) => Promise<ComputeResponse>;
  readdir: (path: string) => Promise<ComputeResponse>;
  exists: (path: string) => Promise<ComputeResponse>;
  remove: (path: string) => Promise<ComputeResponse>;
  
  // UI-specific helpers
  uploadFile: (path: string, file: File) => Promise<ComputeResponse>;
  downloadFile: (path: string) => Promise<Blob>;
  getFileTree: (rootPath?: string) => Promise<FileTreeNode[]>;
  watchFile: (path: string, callback: (content: string) => void) => () => void;
}
```

### FrontendSandbox

Mirrors the server-side sandbox API with all operations:

```typescript
interface FrontendSandbox {
  id: string;
  provider: string;
  
  // Code execution
  runCode: (code: string, runtime?: Runtime) => Promise<ComputeResponse>;
  runCommand: (command: string, args?: string[]) => Promise<ComputeResponse>;
  
  // Sandbox management
  getInfo: () => Promise<ComputeResponse>;
  destroy: () => Promise<ComputeResponse>;
  
  // Filesystem operations
  filesystem: {
    readFile: (path: string) => Promise<ComputeResponse>;
    writeFile: (path: string, content: string) => Promise<ComputeResponse>;
    mkdir: (path: string) => Promise<ComputeResponse>;
    readdir: (path: string) => Promise<ComputeResponse>;
    exists: (path: string) => Promise<ComputeResponse>;
    remove: (path: string) => Promise<ComputeResponse>;
  };
  
  // Terminal operations
  terminal: {
    create: (options?: TerminalOptions) => Promise<FrontendTerminal>;
    getById: (terminalId: string) => Promise<FrontendTerminal | null>;
    list: () => Promise<FrontendTerminal[]>;
    destroy: (terminalId: string) => Promise<void>;
  };
}
```

### FrontendTerminal

Interactive terminal with real-time I/O via Server-Sent Events:

```typescript
interface FrontendTerminal {
  pid: number;
  command: string;
  status: 'running' | 'exited';
  cols: number;
  rows: number;
  exitCode?: number;
  
  // Terminal operations
  write: (data: Uint8Array | string) => Promise<void>;
  resize: (cols: number, rows: number) => Promise<void>;
  kill: () => Promise<void>;
  
  // Event handlers
  onData?: (data: Uint8Array) => void;    // Auto-starts SSE streaming
  onExit?: (exitCode: number) => void;
}
```

### Core Types

#### ComputeRequest
Request structure for all compute operations:

```typescript
interface ComputeRequest {
  action: 'compute.sandbox.create' | 'compute.sandbox.runCode' | /* ... */;
  sandboxId?: string;
  code?: string;
  runtime?: Runtime;
  path?: string;
  content?: string;
  // ... more fields for specific operations
}
```

#### ComputeResponse
Response structure from compute operations:

```typescript
interface ComputeResponse {
  success: boolean;
  error?: string;
  sandboxId: string;
  provider: string;
  result?: ExecutionResult;
  fileContent?: string;
  files?: FileEntry[];
  // ... more fields for specific operations
}
```

### Utility Functions

#### executeComputeRequest
Generic function for any compute operation:

```typescript
async function executeComputeRequest(
  request: ComputeRequest,
  endpoint?: string
): Promise<ComputeResponse>
```

#### Validation Functions
Input validation utilities:

```typescript
function validateCode(code: string): ValidationResult
function validateRuntime(runtime: string): ValidationResult
function validateComputeRequest(request: ComputeRequest): ValidationResult
function validateComputeConfig(config: ComputeConfig): ValidationResult
```

#### Formatting Utilities
Display helpers:

```typescript
function formatExecutionTime(milliseconds: number): string
function formatOutput(output: string): string
function isComputeError(response: ComputeResponse): boolean
function getErrorMessage(response: ComputeResponse): string
```

## Framework Integration

This package is framework-agnostic. Use it with any frontend framework using factory functions or hooks:

### React Example

Using factory functions:

```typescript
import React, { useState } from 'react'
import { createCompute, type ComputeResponse } from '@computesdk/ui'

function CodeExecutor() {
  const [code, setCode] = useState('print("Hello World!")')
  const [result, setResult] = useState<ComputeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  
  const compute = createCompute({
    apiEndpoint: '/api/compute',
    defaultRuntime: 'python'
  })
  
  const executeCode = async () => {
    setLoading(true)
    try {
      const sandbox = await compute.sandbox.create()
      const response = await sandbox.runCode(code)
      setResult(response)
      await sandbox.destroy()
    } catch (error) {
      console.error('Execution failed:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div>
      <textarea 
        value={code} 
        onChange={(e) => setCode(e.target.value)}
        rows={10}
        cols={50}
      />
      <button onClick={executeCode} disabled={loading}>
        {loading ? 'Executing...' : 'Execute'}
      </button>
      {result && (
        <pre>
          {result.success ? result.result?.stdout : result.error}
        </pre>
      )}
    </div>
  )
}
```

Using hooks (React-specific):

```typescript
import React, { useState } from 'react'
import { useCompute, type ComputeResponse } from '@computesdk/ui'

function CodeExecutor() {
  const [code, setCode] = useState('print("Hello World!")')
  const [result, setResult] = useState<ComputeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  
  const compute = useCompute({
    apiEndpoint: '/api/compute',
    defaultRuntime: 'python'
  })
  
  const executeCode = async () => {
    setLoading(true)
    try {
      const sandbox = await compute.sandbox.create()
      const response = await sandbox.runCode(code)
      setResult(response)
      await sandbox.destroy()
    } catch (error) {
      console.error('Execution failed:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div>
      <textarea 
        value={code} 
        onChange={(e) => setCode(e.target.value)}
        rows={10}
        cols={50}
      />
      <button onClick={executeCode} disabled={loading}>
        {loading ? 'Executing...' : 'Execute'}
      </button>
      {result && (
        <pre>
          {result.success ? result.result?.stdout : result.error}
        </pre>
      )}
    </div>
  )
}
```

### Vue Example

```typescript
import { ref, computed } from 'vue'
import { createCompute, type ComputeResponse } from '@computesdk/ui'

export function useCodeExecution() {
  const code = ref('print("Hello World!")')
  const result = ref<ComputeResponse | null>(null)
  const loading = ref(false)
  
  const compute = createCompute({
    apiEndpoint: '/api/compute',
    defaultRuntime: 'python'
  })
  
  const output = computed(() => {
    if (!result.value) return ''
    return result.value.success 
      ? result.value.result?.stdout || ''
      : result.value.error || 'Unknown error'
  })
  
  const execute = async () => {
    loading.value = true
    try {
      const sandbox = await compute.sandbox.create()
      result.value = await sandbox.runCode(code.value)
      await sandbox.destroy()
    } catch (error) {
      console.error('Execution failed:', error)
    } finally {
      loading.value = false
    }
  }
  
  return { code, result, loading, output, execute }
}
```

### Svelte Example

```typescript
import { writable, get } from 'svelte/store'
import { createCompute, type ComputeResponse } from '@computesdk/ui'

export const code = writable('print("Hello World!")')
export const result = writable<ComputeResponse | null>(null)
export const loading = writable(false)

const compute = createCompute({
  apiEndpoint: '/api/compute',
  defaultRuntime: 'python'
})

export async function execute() {
  loading.set(true)
  try {
    const sandbox = await compute.sandbox.create()
    const response = await sandbox.runCode(get(code))
    result.set(response)
    await sandbox.destroy()
  } catch (error) {
    console.error('Execution failed:', error)
  } finally {
    loading.set(false)
  }
}
```

## REPL Console Integration

Create persistent REPL-style consoles with execution history:

```typescript
import { createCompute, createSandboxConsole } from '@computesdk/ui'

// Create compute instance
const compute = createCompute({
  apiEndpoint: '/api/compute',
  defaultRuntime: 'python'
})

// Create sandbox
const sandbox = await compute.sandbox.create()

// Create REPL console with context persistence
const console = createSandboxConsole({
  sandboxId: sandbox.id,
  apiEndpoint: '/api/compute'
})

// Execute code with persistent context
await console.runCode('x = 42')
await console.runCode('y = x * 2')
await console.runCode('print(f"x={x}, y={y}")') // Outputs: x=42, y=84

// Access execution history
console.history.forEach((entry, index) => {
  console.log(`[${index}] ${entry.code}`)
  if (entry.result.success) {
    console.log(`    → ${entry.result.result?.stdout}`)
  } else {
    console.log(`    ✗ ${entry.result.error}`)
  }
})

// Clear history while preserving context
console.clear()

// Get current variable context
const context = console.getContext()
console.log('Variables:', Object.keys(context)) // ['x', 'y']
```

### React REPL Component

```typescript
import React, { useState, useRef, useEffect } from 'react'
import { createCompute, createSandboxConsole, type UIConsole } from '@computesdk/ui'

function REPLConsole() {
  const [input, setInput] = useState('')
  const [console, setConsole] = useState<UIConsole | null>(null)
  const [loading, setLoading] = useState(false)
  const historyRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    async function initConsole() {
      const compute = createCompute({ apiEndpoint: '/api/compute' })
      const sandbox = await compute.sandbox.create()
      const replConsole = createSandboxConsole({
        sandboxId: sandbox.id,
        apiEndpoint: '/api/compute'
      })
      setConsole(replConsole)
    }
    initConsole()
  }, [])
  
  const executeCode = async () => {
    if (!console || !input.trim()) return
    
    setLoading(true)
    try {
      await console.runCode(input)
      setInput('')
      // Scroll to bottom
      setTimeout(() => {
        historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' })
      }, 100)
    } catch (error) {
      console.error('Execution failed:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      executeCode()
    }
  }
  
  return (
    <div className="repl-console">
      <div ref={historyRef} className="history">
        {console?.history.map((entry, index) => (
          <div key={index} className="history-entry">
            <div className="input-line">
              <span className="prompt">>>> </span>
              <code>{entry.code}</code>
            </div>
            {entry.result.success ? (
              entry.result.result?.stdout && (
                <div className="output">{entry.result.result.stdout}</div>
              )
            ) : (
              <div className="error">{entry.result.error}</div>
            )}
          </div>
        ))}
      </div>
      
      <div className="input-area">
        <span className="prompt">>>> </span>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter Python code..."
          disabled={loading || !console}
          rows={input.split('\n').length}
        />
        <button 
          onClick={executeCode} 
          disabled={loading || !console || !input.trim()}
        >
          {loading ? 'Executing...' : 'Run'}
        </button>
      </div>
      
      <div className="controls">
        <button onClick={() => console?.clear()}>Clear History</button>
        <span>Variables: {Object.keys(console?.getContext() || {}).join(', ')}</span>
      </div>
    </div>
  )
}
```

## Terminal Integration

Real-time terminal with Server-Sent Events:

```typescript
import { createCompute } from '@computesdk/ui'

const compute = createCompute()

// Create sandbox and terminal
const sandbox = await compute.sandbox.create()
const terminal = await sandbox.terminal.create({
  command: 'bash',
  cols: 80,
  rows: 24
})

// Set up real-time output handler
terminal.onData = (data: Uint8Array) => {
  const output = new TextDecoder().decode(data)
  console.log('Terminal output:', output)
  // Update your terminal UI here
}

// Send commands
await terminal.write('echo "Hello Terminal!"\n')
await terminal.write('ls -la\n')

// Handle terminal resize
await terminal.resize(120, 30)

// Clean up
await terminal.kill()
await sandbox.destroy()
```

## Filesystem Operations

```typescript
import { createCompute } from '@computesdk/ui'

const compute = createCompute()
const sandbox = await compute.sandbox.create()

// Create project structure
await sandbox.filesystem.mkdir('/project/data')
await sandbox.filesystem.mkdir('/project/output')

// Write files
await sandbox.filesystem.writeFile('/project/data/input.txt', 'Hello World!')
await sandbox.filesystem.writeFile('/project/script.py', `
with open('/project/data/input.txt', 'r') as f:
    content = f.read()
    
with open('/project/output/result.txt', 'w') as f:
    f.write(f"Processed: {content.upper()}")
    
print("Processing complete!")
`)

// Execute script
const result = await sandbox.runCode(`exec(open('/project/script.py').read())`)
console.log(result.result?.stdout)

// Read results
const output = await sandbox.filesystem.readFile('/project/output/result.txt')
console.log('Result:', output.fileContent)

// List files
const files = await sandbox.filesystem.readdir('/project')
console.log('Project files:', files.files)
```

## Error Handling

```typescript
import { createCompute, APIError, isComputeError, getErrorMessage } from '@computesdk/ui'

const compute = createCompute()

try {
  const sandbox = await compute.sandbox.create()
  const result = await sandbox.runCode('invalid python code')
  
  if (isComputeError(result)) {
    console.error('Compute error:', getErrorMessage(result))
  } else {
    console.log('Success:', result.result?.stdout)
  }
} catch (error) {
  if (error instanceof APIError) {
    console.error('API Error:', error.message, 'Status:', error.status)
  } else {
    console.error('Unexpected error:', error)
  }
}
```

## Server-Side Integration

Your server should implement the ComputeSDK request handler:

```typescript
// /api/compute endpoint
import { handleComputeRequest } from 'computesdk'
import { e2b } from '@computesdk/e2b'

export async function GET(request: Request) {
  return handleComputeRequest({
    request,
    provider: e2b({ apiKey: process.env.E2B_API_KEY })
  })
}

export async function POST(request: Request) {
  return handleComputeRequest({
    request,
    provider: e2b({ apiKey: process.env.E2B_API_KEY })
  })
}
```

## Examples

See the [ComputeSDK examples](https://github.com/computesdk/computesdk/tree/main/examples) for complete framework integrations:

- [Next.js](https://github.com/computesdk/computesdk/tree/main/examples/nextjs)
- [Nuxt](https://github.com/computesdk/computesdk/tree/main/examples/nuxt)  
- [SvelteKit](https://github.com/computesdk/computesdk/tree/main/examples/sveltekit)
- [Remix](https://github.com/computesdk/computesdk/tree/main/examples/remix)
- [Astro](https://github.com/computesdk/computesdk/tree/main/examples/astro)