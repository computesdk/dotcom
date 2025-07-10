# Core API Reference

This document provides detailed information about the core functionality of ComputeSDK.

## `compute` Function

The main function to execute computations on the ComputeSDK platform.

### Signature

```typescript
function compute<T = any>(
  code: string | Function,
  options?: ComputeOptions,
): Promise<T>;
```

### Parameters

- `code`: `string | Function`  
  The code to execute. Can be a string of code or a function.

- `options`: `ComputeOptions` (optional)  
  Configuration options for the computation.

  ```typescript
  interface ComputeOptions {
    // Key-value pairs of variables to be available in the computation context
    context?: Record<string, any>;

    // NPM dependencies required by the computation
    dependencies?: Record<string, string>;

    // Maximum execution time in milliseconds (default: 30000)
    timeout?: number;

    // Environment variables to be available during computation
    env?: Record<string, string>;

    // Enable/disable console logging (default: true)
    console?: boolean;
  }
  ```

### Returns

A Promise that resolves with the result of the computation or rejects with an error.

### Example

```javascript
import { compute } from "@computesdk/core";

// Basic usage
const result = await compute("return 1 + 1");
console.log(result); // 2

// With context
const contextResult = await compute("return a + b", {
  context: { a: 5, b: 10 },
});
console.log(contextResult); // 15
```

## `configure` Function

Configure the global settings for the ComputeSDK client.

### Signature

```typescript
function configure(options: ClientConfig): void;
```

### Parameters

- `options`: `ClientConfig`  
  Configuration options for the client.

  ```typescript
  interface ClientConfig {
    // Your ComputeSDK API key
    apiKey: string;

    // Environment ('production' or 'development')
    environment?: "production" | "development";

    // API base URL (defaults to production)
    apiUrl?: string;

    // Enable/disable debug logging (default: false)
    debug?: boolean;
  }
  ```

### Example

```javascript
import { configure } from "@computesdk/core";

configure({
  apiKey: "your-api-key-here",
  environment: "production",
  debug: false,
});
```

## `createClient` Function

Create a new client instance with custom configuration.

### Signature

```typescript
function createClient(config: ClientConfig): ComputeClient;
```

### Returns

A new `ComputeClient` instance with the provided configuration.

### Example

```javascript
import { createClient } from "@computesdk/core";

const client = createClient({
  apiKey: "your-api-key-here",
  environment: "production",
});

// Use the client instance
const result = await client.compute("return 42");
```

## `ComputeClient` Class

A client for interacting with the ComputeSDK API.

### Methods

#### `compute<T = any>(code: string | Function, options?: ComputeOptions): Promise<T>`

Execute a computation (same as the global `compute` function).

#### `configure(config: ClientConfig): void`

Update the client configuration.

#### `getConfig(): ClientConfig`

Get the current client configuration.

## Error Handling

ComputeSDK throws custom error types for different scenarios:

- `ComputeError`: Base error class for all ComputeSDK errors
- `AuthenticationError`: Invalid or missing API key
- `RateLimitError`: Rate limit exceeded
- `TimeoutError`: Computation timed out
- `ValidationError`: Invalid input parameters
- `RuntimeError`: Error during computation execution

### Example Error Handling

```javascript
try {
  const result = await compute("return someUndefinedVariable");
} catch (error) {
  if (error.name === "RuntimeError") {
    console.error("Runtime error:", error.message);
    console.error("Stack trace:", error.stack);
  } else if (error.name === "RateLimitError") {
    console.error("Rate limit exceeded. Please try again later.");
  } else {
    console.error("An unexpected error occurred:", error);
  }
}
```

## Next Steps

- [Configuration API Reference](/docs/api/configuration)
- [Advanced API Reference](/docs/api/advanced)
- [Best Practices](/docs/guides/best-practices)
