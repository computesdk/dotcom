# Installation

Get started with ComputeSDK by installing it in your project.

## Prerequisites

- Node.js 16.0 or later
- npm or yarn package manager
- A ComputeSDK account (Sign up at [https://app.computesdk.com](https://app.computesdk.com))

## Installation

### Using npm

```bash
npm install @computesdk/core
```

### Using yarn

```bash
yarn add @computesdk/core
```

## Configuration

After installation, you'll need to configure your API key. You can find your API key in the [ComputeSDK Dashboard](https://app.computesdk.com/dashboard).

```javascript
import { configure } from "@computesdk/core";

configure({
  apiKey: "your-api-key-here",
  environment: "production", // or 'development' for testing
});
```

## Verifying Installation

To verify that everything is set up correctly, create a simple test file:

```javascript
import { compute } from "@computesdk/core";

async function testConnection() {
  try {
    const result = await compute("2 + 2");
    console.log("Connection successful!", result); // Should output: Connection successful! 4
  } catch (error) {
    console.error("Connection failed:", error);
  }
}

testConnection();
```

## Troubleshooting

If you encounter any issues during installation:

1. Ensure you have the correct Node.js version installed
2. Check your internet connection
3. Verify your API key is correct
4. Check our [Troubleshooting Guide](/docs/guides/troubleshooting) for common issues

## Next Steps

- [Quick Start Guide](/docs/getting-started/quick-start)
- [API Reference](/docs/api/core)
