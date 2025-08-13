---
title: API Reference
description: Complete API reference for ComputeSDK
sidebar:
    order: 1
---

Complete reference documentation for ComputeSDK's APIs and interfaces.

## Overview

ComputeSDK provides a unified abstraction layer for executing code in secure, isolated sandboxed environments across multiple cloud providers. The API is designed to be consistent across all providers while allowing for provider-specific features.

## Basic Usage Pattern

```typescript
import { compute } from 'computesdk';
import { e2b } from '@computesdk/e2b';

// 1. Configure provider
compute.setConfig({ 
  provider: e2b({ apiKey: process.env.E2B_API_KEY }) 
});

// 2. Create sandbox
const sandbox = await compute.sandbox.create({});

// 3. Execute operations
const result = await sandbox.runCode('print("Hello World!")');
console.log(result.stdout);

// 4. Clean up
await compute.sandbox.destroy(sandbox.sandboxId);
```

## Available Methods

### Configuration
- `compute.setConfig(config)` - Set global configuration
- `compute.getConfig()` - Get current configuration  
- `compute.clearConfig()` - Clear configuration

### Sandbox Management
- `compute.sandbox.create(options)` - Create new sandbox
- `compute.sandbox.getById(id)` - Get existing sandbox
- `compute.sandbox.list()` - List all sandboxes
- `compute.sandbox.destroy(id)` - Destroy sandbox

### Code Execution
- `sandbox.runCode(code, runtime?)` - Execute code
- `sandbox.runCommand(command, args?)` - Run shell command

### Filesystem Operations
- `sandbox.filesystem.writeFile(path, content)` - Write file
- `sandbox.filesystem.readFile(path)` - Read file
- `sandbox.filesystem.mkdir(path)` - Create directory
- `sandbox.filesystem.readdir(path)` - List directory
- `sandbox.filesystem.exists(path)` - Check if exists
- `sandbox.filesystem.remove(path)` - Remove file/directory

### Terminal Operations (E2B only)
- `sandbox.terminal.create(options)` - Create terminal
- `sandbox.terminal.list()` - List terminals
- `sandbox.terminal.getById(id)` - Get terminal by ID
- `terminal.write(data)` - Write to terminal
- `terminal.resize(cols, rows)` - Resize terminal
- `terminal.kill()` - Kill terminal

### API Integration
- `handleComputeRequest(options)` - Process web requests

## Supported Runtimes

- **Python** - Python 3.x with data science libraries
- **Node.js** - Node.js runtime with npm packages

## Error Handling

All methods can throw errors. Always wrap calls in try-catch blocks:

```typescript
try {
  const result = await sandbox.runCode('invalid code');
} catch (error) {
  console.error('Execution failed:', error.message);
}
```

## TypeScript Support

ComputeSDK is fully typed. Import types as needed:

```typescript
import type { 
  Sandbox, 
  Provider, 
  ExecutionResult,
  ComputeConfig,
  Runtime 
} from 'computesdk';
```
