---
title: Sandbox Management
description: Create, manage, and destroy sandboxes
sidebar:
    order: 2
---

Create, retrieve, list, and destroy sandboxes.

## Methods

### `compute.sandbox.create(options)`

Create a new sandbox instance.

```typescript
// With explicit provider
const sandbox = await compute.sandbox.create({
  provider: e2b({ apiKey: 'your-key' }),
  options: { runtime: 'python', timeout: 300000 }
});

// With default provider
const sandbox = await compute.sandbox.create({
  options: { runtime: 'python' }
});
```

**Parameters:**
- `options` - Creation options
  - `provider?` - Specific provider to use (overrides global config)
  - `options?` - Provider-specific options
    - `runtime?` - Runtime environment ('python' | 'node')
    - `timeout?` - Execution timeout in milliseconds

**Returns:** Sandbox instance with unique `sandboxId`

### `compute.sandbox.getById(id)`

Retrieve an existing sandbox by ID.

```typescript
const sandbox = await compute.sandbox.getById('sandbox-id');
```

**Parameters:**
- `id` - Sandbox ID string

**Returns:** Sandbox instance

### `compute.sandbox.list()`

List all active sandboxes.

```typescript
const sandboxes = await compute.sandbox.list();
console.log(sandboxes.length); // Number of active sandboxes
```

**Returns:** Array of sandbox instances

### `compute.sandbox.destroy(id)`

Destroy a sandbox and clean up resources.

```typescript
await compute.sandbox.destroy('sandbox-id');

// Or using sandbox instance
await compute.sandbox.destroy(sandbox.sandboxId);
```

**Parameters:**
- `id` - Sandbox ID string

**Returns:** Promise that resolves when sandbox is destroyed

## Sandbox Instance

Once created, a sandbox instance provides methods for code execution, filesystem operations, and terminal management.

```typescript
interface Sandbox {
  sandboxId: string;
  provider: string;
  
  runCode(code: string, runtime?: Runtime): Promise<ExecutionResult>;
  runCommand(command: string, args?: string[]): Promise<ExecutionResult>;
  
  filesystem: FilesystemAPI;
  terminal: TerminalAPI;
  
  getInfo(): Promise<SandboxInfo>;
}
```