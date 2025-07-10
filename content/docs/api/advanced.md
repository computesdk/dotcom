# Advanced API Reference

This document covers advanced features and APIs in ComputeSDK for complex use cases and optimizations.

## Batch Processing

Execute multiple computations in a single request for improved performance.

### `batch` Function

```typescript
function batch<T extends any[]>(
  computations: Array<{ code: string | Function; options?: ComputeOptions }>,
  batchOptions?: BatchOptions,
): Promise<{ results: T; errors: Error[] }>;

interface BatchOptions {
  // Maximum number of parallel executions (default: 5)
  concurrency?: number;

  // Continue processing other computations if one fails (default: false)
  continueOnError?: boolean;

  // Shared context for all computations in the batch
  sharedContext?: Record<string, any>;
}
```

#### Example: Parallel Processing

```javascript
import { batch } from "@computesdk/core";

const tasks = [
  { code: "return 1 + 1" },
  { code: 'return fetch("https://api.example.com/data").then(r => r.json())' },
  {
    code: "return processLargeDataset(data)",
    options: {
      context: { data: largeDataset },
      dependencies: { "data-processor": "^2.0.0" },
    },
  },
];

const { results, errors } = await batch(tasks, {
  concurrency: 3,
  continueOnError: true,
});
```

## Caching

Optimize performance by caching computation results.

### `withCache` Function

```typescript
function withCache<T>(
  key: string,
  computeFn: () => Promise<T>,
  options?: CacheOptions,
): Promise<T>;

interface CacheOptions {
  // Cache duration in milliseconds (default: 1 hour)
  ttl?: number;

  // Custom cache key generator
  keyGenerator?: (...args: any[]) => string;

  // Force refresh the cache (default: false)
  forceRefresh?: boolean;
}
```

#### Example: Caching Expensive Computations

```javascript
import { withCache } from "@computesdk/core";

async function getProcessedData(userId) {
  return withCache(
    `user-data-${userId}`,
    async () => {
      // Expensive computation or API call
      const data = await fetchUserData(userId);
      return processData(data);
    },
    { ttl: 3600000 }, // Cache for 1 hour
  );
}
```

## Streaming

Process large datasets using streams for better memory efficiency.

### `createStream` Function

```typescript
function createStream<T>(
  code: string | Function,
  options?: StreamOptions,
): AsyncIterable<T>;

interface StreamOptions extends ComputeOptions {
  // Size of each chunk (default: 1024)
  chunkSize?: number;

  // Maximum number of parallel chunks (default: 3)
  maxParallelChunks?: number;
}
```

#### Example: Processing Large Datasets

```javascript
import { createStream } from "@computesdk/core";

async function processLargeDataset() {
  const stream = createStream(
    `
    const dataset = generateLargeDataset(); // 1M+ records
    
    // Process in chunks
    for (const item of dataset) {
      yield processItem(item);
    }
  `,
    {
      chunkSize: 1000,
      maxParallelChunks: 5,
    },
  );

  for await (const result of stream) {
    // Process each result as it arrives
    await saveToDatabase(result);
  }
}
```

## WebAssembly (WASM) Support

Run WebAssembly modules in your computations.

### `runWasm` Function

```typescript
function runWasm<T = any>(
  wasmBuffer: ArrayBuffer | Uint8Array,
  options?: WasmOptions,
): Promise<T>;

interface WasmOptions {
  // Import object for the WebAssembly module
  imports?: Record<string, any>;

  // Memory allocation in pages (64KB each)
  initialMemory?: number;

  // Maximum memory in pages
  maximumMemory?: number;
}
```

#### Example: Running WebAssembly

```javascript
import { runWasm } from "@computesdk/core";

async function runImageProcessing() {
  // Load WASM module
  const response = await fetch("image-processor.wasm");
  const wasmBuffer = await response.arrayBuffer();

  // Run with custom imports
  const result = await runWasm(wasmBuffer, {
    imports: {
      env: {
        // Custom imports for the WASM module
        log: (msg) => console.log("WASM:", msg),
      },
    },
    initialMemory: 10, // 640KB initial memory
    maximumMemory: 100, // 6.4MB max memory
  });

  return result;
}
```

## Custom Runtimes

Extend ComputeSDK with custom runtime environments.

### `registerRuntime` Function

```typescript
function registerRuntime(name: string, runtime: RuntimeDefinition): void;

interface RuntimeDefinition {
  // Initialize the runtime
  initialize: (config: any) => Promise<void>;

  // Execute code in the runtime
  execute: (code: string, context: any) => Promise<any>;

  // Clean up resources
  destroy: () => Promise<void>;

  // Runtime capabilities
  capabilities: {
    // Whether the runtime supports streaming
    streaming: boolean;

    // Maximum execution time (0 for no limit)
    maxExecutionTime: number;

    // Supported file extensions
    fileExtensions: string[];
  };
}
```

#### Example: Custom Python Runtime

```javascript
import { registerRuntime } from "@computesdk/core";

registerRuntime("python", {
  async initialize(config) {
    // Initialize Python environment
    await startPythonRuntime(config);
  },

  async execute(code, context) {
    // Execute Python code with the given context
    return executePythonCode(code, context);
  },

  async destroy() {
    // Clean up Python resources
    await cleanupPythonRuntime();
  },

  capabilities: {
    streaming: true,
    maxExecutionTime: 300000, // 5 minutes
    fileExtensions: [".py"],
  },
});

// Use the custom runtime
const result = await compute('print("Hello from Python!")', {
  runtime: "python",
});
```

## Performance Monitoring

Monitor and optimize your computations.

### `startProfiling` and `stopProfiling` Functions

```typescript
interface ProfileResult {
  // CPU usage in milliseconds
  cpuTime: number;

  // Memory usage in bytes
  memoryUsed: number;

  // Detailed timing information
  timings: Array<{
    name: string;
    duration: number;
    timestamp: number;
  }>;
}

// Start profiling
function startProfiling(): void;

// Stop profiling and get results
function stopProfiling(): ProfileResult;
```

#### Example: Profiling a Computation

```javascript
import { startProfiling, stopProfiling } from "@computesdk/core";

async function optimizeComputation() {
  // Start profiling
  startProfiling();

  try {
    // Run computation
    await compute("/* expensive computation */");

    // Get profile results
    const profile = stopProfiling();

    console.log("Computation took", profile.cpuTime, "ms");
    console.log(
      "Peak memory usage:",
      (profile.memoryUsed / 1024 / 1024).toFixed(2),
      "MB",
    );

    // Analyze timings
    const slowest = [...profile.timings].sort(
      (a, b) => b.duration - a.duration,
    )[0];
    console.log(
      "Slowest operation:",
      slowest.name,
      "took",
      slowest.duration,
      "ms",
    );

    return profile;
  } catch (error) {
    stopProfiling(); // Always stop profiling, even on error
    throw error;
  }
}
```

## Next Steps

- [Core API Reference](/docs/api/core)
- [Configuration API Reference](/docs/api/configuration)
- [Best Practices](/docs/guides/best-practices)
