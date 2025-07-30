---
title: E2B
description: Compute E2B by Compute SDK.
sidebar:
    order: 2
---

### ComputeSDK E2B Provider Documentation
This guide provides detailed information on how to install, configure, and use the E2B provider within ComputeSDK. The E2B provider allows you to execute code in secure, isolated sandboxed environments powered by E2B's infrastructure, all while maintaining the consistent ComputeSDK interface.

#### Overview
The @computesdk/e2b package integrates ComputeSDK with the E2B code execution platform. This allows you to leverage E2B's robust sandboxing capabilities, including support for various runtimes and comprehensive filesystem operations, through a familiar ComputeSDK API.

#### Installation
To use the E2B provider, you need to install its dedicated package in addition to the core ComputeSDK.

```bash
npm install @computesdk/e2b
```

If you haven't already, also install the core SDK:

```bash
npm install computesdk
```

#### Provider Setup
To authenticate with E2B, you must set your E2B API key as an environment variable. ComputeSDK's E2B provider will automatically pick this up.

```bash
export E2B_API_KEY=your_e2b_api_key
```

Replace your_e2b_api_key with your actual API key obtained from E2B.

#### Usage
You can use the E2B provider either through ComputeSDK's auto-detection mechanism (if E2B_API_KEY is set and E2B is the first available provider) or by explicitly initializing it.

#### Explicit Initialization
To explicitly use the E2B provider, import e2b from @computesdk/e2b:

```typescript
import { e2b } from '@computesdk/e2b';

const sandbox = e2b({
  template: 'python', // optional, defaults to 'python'
  timeout: 300000,    // optional, defaults to 5 minutes (300 seconds)
});

// Now you can execute code and perform filesystem operations
const result = await sandbox.execute('print("Hello from E2B!")');
console.log(result.stdout);

await sandbox.kill();
```

template: (Optional) Specifies the sandbox template to use (e.g., 'python', 'node'). Defaults to 'python'.

timeout: (Optional) Sets the maximum execution time for the sandbox in milliseconds. Defaults to 5 minutes (300,000 ms).

#### Examples
Here are some practical examples demonstrating the use of the E2B provider for code execution and filesystem operations.

#### Data Science with E2B
This example shows how to execute Python code that uses matplotlib and numpy to generate a plot and save it within the sandbox's filesystem.

```typescript
import { e2b } from '@computesdk/e2b';

const sandbox = e2b(); // Initialize E2B sandbox

const result = await sandbox.execute(`
import matplotlib.pyplot as plt
import numpy as np

# Generate data
x = np.linspace(0, 10, 100)
y = np.sin(x)

# Create plot
plt.figure(figsize=(10, 6))
plt.plot(x, y, 'b-', linewidth=2)
plt.title('Sine Wave')
plt.xlabel('x')
plt.ylabel('sin(x)')
plt.grid(True)
plt.savefig('sine_wave.png') # Save the plot to the sandbox filesystem
plt.show() # This will not display in the console but saves the file

print("Plot saved as sine_wave.png")
`);
console.log(result.stdout);

// You could then use sandbox.filesystem.readFile to retrieve 'sine_wave.png' if needed
await sandbox.kill();
```

#### Filesystem Operations with E2B
This example demonstrates how to create directories, write files, execute a script that reads and writes files, and then list the contents of a directory, all within the E2B sandbox.

```typescript
import { e2b } from '@computesdk/e2b';

const sandbox = e2b(); // Initialize E2B sandbox

// Create a directory structure
await sandbox.filesystem.mkdir('/project/data');
await sandbox.filesystem.mkdir('/project/output');

// Write a configuration file
const config = JSON.stringify({
  name: 'My E2B Project',
  version: '1.0.0',
  settings: { debug: true }
}, null, 2);
await sandbox.filesystem.writeFile('/project/config.json', config);
console.log('Configuration file written.');

// Create a Python script
const script = `
import json
import os

# Read configuration
with open('/project/config.json', 'r') as f:
    config = json.load(f)
print(f"Project: {config['name']} v{config['version']}")

# Process data
data = [1, 2, 3, 4, 5]
result = sum(data)

# Write results
with open('/project/output/results.txt', 'w') as f:
    f.write(f"Sum: {result}\\n")
    f.write(f"Count: {len(data)}\\n")
print("Processing complete!")
`;
await sandbox.filesystem.writeFile('/project/process.py', script);
console.log('Processing script written.');

// Execute the script
const result = await sandbox.execute('python /project/process.py');
console.log('Script execution output:', result.stdout);

// Read the results
const results = await sandbox.filesystem.readFile('/project/output/results.txt');
console.log('Results file content:', results);

// List all files in the project directory
const files = await sandbox.filesystem.readdir('/project');
console.log('Project files:');
files.forEach(file => {
  console.log(`  ${file.name} (${file.isDirectory ? 'directory' : 'file'})`);
});

await sandbox.kill();
```

This documentation page provides a comprehensive guide to using the ComputeSDK E2B provider. For more general information on ComputeSDK's core features, such as error handling or other providers, please refer to the main ComputeSDK documentation.