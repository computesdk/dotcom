# Configuration API Reference

This document details the configuration options available in ComputeSDK for customizing the behavior of your computations.

## Client Configuration

### `ClientConfig` Interface

```typescript
interface ClientConfig {
  // Required: Your ComputeSDK API key
  apiKey: string;

  // Environment: 'production' (default) or 'development'
  environment?: "production" | "development";

  // Custom API URL (defaults to production/development endpoints)
  apiUrl?: string;

  // Enable debug logging (default: false)
  debug?: boolean;

  // Default timeout for all compute requests in ms (default: 30000)
  defaultTimeout?: number;

  // Enable/disable automatic retries on transient failures (default: true)
  retryOnFailure?: boolean;

  // Number of retry attempts (default: 3)
  maxRetries?: number;

  // Custom headers to include in all requests
  headers?: Record<string, string>;
}
```

## Computation Configuration

### `ComputeOptions` Interface

```typescript
interface ComputeOptions {
  // Key-value pairs of variables available in the computation context
  context?: Record<string, any>;

  // NPM dependencies required by the computation
  dependencies?: Record<string, string>;

  // Maximum execution time in milliseconds (default: 30000 or value from ClientConfig)
  timeout?: number;

  // Environment variables available during computation
  env?: Record<string, string>;

  // Enable/disable console logging (default: true)
  console?: boolean;

  // Enable/disable network access (default: true)
  networkAccess?: boolean;

  // Maximum memory allocation in MB (default: 1024)
  memoryLimit?: number;

  // CPU allocation (1 = 100% of one core, 0.5 = 50%, etc.)
  cpuAllocation?: number;

  // Enable/disable persistent storage between computations (default: false)
  persistentStorage?: boolean;

  // Custom metadata to associate with the computation
  metadata?: Record<string, any>;
}
```

## Environment Variables

ComputeSDK supports the following environment variables for configuration:

- `COMPUTESDK_API_KEY`: Your API key (alternative to programmatic configuration)
- `COMPUTESDK_ENVIRONMENT`: Set to 'development' or 'production'
- `COMPUTESDK_DEBUG`: Set to '1' to enable debug logging
- `COMPUTESDK_API_URL`: Override the default API URL
- `COMPUTESDK_TIMEOUT`: Default timeout in milliseconds
- `COMPUTESDK_MAX_RETRIES`: Maximum number of retry attempts

## Configuration Precedence

Configuration is applied in the following order (later items take precedence):

1. Default values
2. Environment variables
3. Global configuration via `configure()`
4. Per-client configuration via `createClient()`
5. Per-computation options

## Examples

### Basic Configuration

```javascript
import { configure } from "@computesdk/core";

// Configure with required API key
configure({
  apiKey: "your-api-key-here",
  environment: "production",
  debug: false,
  defaultTimeout: 60000,
});
```

### Per-Computation Configuration

```javascript
import { compute } from "@computesdk/core";

const result = await compute("return process.env.MY_VAR", {
  env: { MY_VAR: "Hello, World!" },
  timeout: 120000, // 2 minutes
  memoryLimit: 2048, // 2GB
  dependencies: {
    lodash: "^4.17.21",
    axios: "^1.0.0",
  },
});
```

### Creating Multiple Clients with Different Configurations

```javascript
import { createClient } from "@computesdk/core";

// Production client with standard settings
const prodClient = createClient({
  apiKey: "prod-key-here",
  environment: "production",
});

// Development client with more verbose logging
const devClient = createClient({
  apiKey: "dev-key-here",
  environment: "development",
  debug: true,
  defaultTimeout: 120000,
});

// Use the appropriate client for each environment
const client = process.env.NODE_ENV === "production" ? prodClient : devClient;
```

## Best Practices

1. **Security**: Never hardcode API keys in your source code. Use environment variables or a secure secret management system.

2. **Performance**: Set appropriate timeouts based on your expected computation duration to avoid unnecessary waiting.

3. **Resource Management**: Be mindful of memory and CPU allocations to optimize costs and performance.

4. **Error Handling**: Always handle potential configuration errors, especially for required fields like `apiKey`.

5. **Environment Separation**: Use different API keys and configurations for development, staging, and production environments.

## Next Steps

- [Core API Reference](/docs/api/core)
- [Advanced API Reference](/docs/api/advanced)
- [Best Practices Guide](/docs/guides/best-practices)
