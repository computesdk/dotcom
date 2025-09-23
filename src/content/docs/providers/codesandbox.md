---
title: CodeSandbox
description: Execute code in secure CodeSandbox environments with full filesystem and development environment support
sidebar:
    order: 2
---

# @computesdk/codesandbox

CodeSandbox provider for ComputeSDK - Execute code in secure, isolated CodeSandbox environments with full filesystem and development environment support.

## Installation

```bash
npm install @computesdk/codesandbox
```

## Setup

1. Get your CodeSandbox API key from [codesandbox.io/t/api](https://codesandbox.io/t/api)
2. Set the environment variable:

```bash
export CSB_API_KEY=your_api_key_here
```

## Usage

### With ComputeSDK

```typescript
import { compute } from 'computesdk';
import { codesandbox } from '@computesdk/codesandbox';

// Set as default provider
compute.setConfig({ 
  defaultProvider: codesandbox({ apiKey: process.env.CSB_API_KEY }) 
});

// Create sandbox
const sandbox = await compute.sandbox.create();

// Execute JavaScript/Node.js code
const result = await sandbox.runCode(`
const message = "Hello from CodeSandbox!";
console.log(message);

const data = { users: 3, tasks: 15 };
console.log(JSON.stringify(data, null, 2));
`);

console.log(result.stdout);
// Output:
// Hello from CodeSandbox!
// {
//   "users": 3,
//   "tasks": 15
// }

// Execute Python code
const pythonResult = await sandbox.runCode(`
import json
data = {"framework": "CodeSandbox", "language": "Python"}
print(json.dumps(data, indent=2))
print(f"Running in: {data['framework']}")
`, 'python');

console.log(pythonResult.stdout);
// Output:
// {
//   "framework": "CodeSandbox",
//   "language": "Python"
// }
// Running in: CodeSandbox

// Clean up
await compute.sandbox.destroy(sandbox.sandboxId);
```

### Direct Usage

```typescript
import { codesandbox } from '@computesdk/codesandbox';

// Create provider
const provider = codesandbox({ 
  apiKey: 'your_api_key',
  templateId: 'universal', // Optional: specify template
  timeout: 600000 // 10 minutes
});

// Use with compute singleton
const sandbox = await compute.sandbox.create({ defaultProvider: provider });
```

## Configuration

### Environment Variables

```bash
export CSB_API_KEY=your_api_key_here
```

### Configuration Options

```typescript
interface CodesandboxConfig {
  /** CodeSandbox API key - if not provided, will use CSB_API_KEY env var */
  apiKey?: string;
  /** Template to use for new sandboxes (defaults to universal template) */
  templateId?: string;
  /** Default runtime environment */
  runtime?: 'python' | 'node';
  /** Execution timeout in milliseconds */
  timeout?: number;
}
```

## Features

- ✅ **Code Execution** - Python and Node.js runtime support
- ✅ **Command Execution** - Run shell commands in sandbox
- ✅ **Filesystem Operations** - Full file system access via CodeSandbox API
- ✅ **Template Support** - Create sandboxes from custom templates
- ✅ **Auto Runtime Detection** - Automatically detects Python vs Node.js
- ✅ **Development Environment** - Full development setup with package managers
- ✅ **Persistence** - Files persist across hibernation/resume cycles
- ✅ **Snapshot/Resume** - Fast sandbox restoration from snapshots

## API Reference

### Code Execution

```typescript
// Execute Node.js code
const result = await sandbox.runCode(`
const fs = require('fs');
const data = { timestamp: Date.now() };
console.log('Processing data:', JSON.stringify(data));
`);

// Execute Python code  
const result = await sandbox.runCode(`
import datetime
import json

data = {'timestamp': datetime.datetime.now().isoformat()}
print('Processing data:', json.dumps(data))
`, 'python');

// Auto-detection (based on code patterns)
const result = await sandbox.runCode('print("Auto-detected as Python")');
```

### Command Execution

```typescript
// List files
const result = await sandbox.runCommand('ls', ['-la']);

// Install Node.js packages
const result = await sandbox.runCommand('npm', ['install', 'lodash']);

// Install Python packages
const result = await sandbox.runCommand('pip', ['install', 'requests']);

// Run development server
const result = await sandbox.runCommand('npm', ['run', 'dev']);
```

### Filesystem Operations

```typescript
// Write file
await sandbox.filesystem.writeFile('/project/workspace/app.js', `
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello from CodeSandbox!' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
`);

// Read file
const content = await sandbox.filesystem.readFile('/project/workspace/package.json');

// Create directory
await sandbox.filesystem.mkdir('/project/workspace/src');

// List directory contents
const files = await sandbox.filesystem.readdir('/project/workspace');

// Check if file exists
const exists = await sandbox.filesystem.exists('/project/workspace/app.js');

// Remove file or directory
await sandbox.filesystem.remove('/project/workspace/temp.txt');
```

### Sandbox Management

```typescript
// Get sandbox info
const info = await sandbox.getInfo();
console.log(info.id, info.provider, info.status);

// Resume existing sandbox
const existing = await compute.sandbox.getById(provider, 'sandbox-id');

// Hibernate sandbox (saves state)
await compute.sandbox.destroy(provider, 'sandbox-id'); // Actually hibernates

// Note: CodeSandbox doesn't support listing all sandboxes
// Each sandbox is managed individually
```

## Runtime Detection

The provider automatically detects the runtime based on code patterns:

**Python indicators:**
- `print(` statements
- `import` statements  
- `def` function definitions
- Python-specific syntax (`f"`, `__`, etc.)

**Default:** Node.js for all other cases

## Error Handling

```typescript
try {
  const result = await sandbox.runCode('invalid code');
} catch (error) {
  if (error.message.includes('Missing CodeSandbox API key')) {
    console.error('Set CSB_API_KEY environment variable');
  } else if (error.message.includes('Invalid CodeSandbox API key format')) {
    console.error('Check your CodeSandbox API key format');
  } else if (error.message.includes('authentication failed')) {
    console.error('Check your CodeSandbox API key');
  } else if (error.message.includes('quota exceeded')) {
    console.error('CodeSandbox usage limits reached');
  } else if (error.message.includes('Syntax error')) {
    console.error('Code has syntax errors');
  }
}
```

## Web Framework Integration

Use with web frameworks via the request handler:

```typescript
import { handleComputeRequest } from 'computesdk';
import { codesandbox } from '@computesdk/codesandbox';

export async function POST(request: Request) {
  return handleComputeRequest({
    request,
    provider: codesandbox({ apiKey: process.env.CSB_API_KEY })
  });
}
```

## Examples

### Full-Stack Web Application

```typescript
const sandbox = await compute.sandbox.create();

// Create project structure
await sandbox.filesystem.mkdir('/project/workspace/src');
await sandbox.filesystem.mkdir('/project/workspace/public');

// Create package.json
const packageJson = {
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "node server.js",
    "build": "echo 'Build complete'"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5"
  }
};

await sandbox.filesystem.writeFile(
  '/project/workspace/package.json', 
  JSON.stringify(packageJson, null, 2)
);

// Create Express server
await sandbox.filesystem.writeFile('/project/workspace/server.js', `
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API endpoint
app.get('/api/data', (req, res) => {
  res.json({
    message: 'Hello from CodeSandbox API!',
    timestamp: new Date().toISOString(),
    environment: 'CodeSandbox'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`);

// Create HTML file
await sandbox.filesystem.writeFile('/project/workspace/public/index.html', `
<!DOCTYPE html>
<html>
<head>
    <title>CodeSandbox App</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 600px; margin: 0 auto; }
        button { padding: 10px 20px; margin: 10px 0; }
        #output { background: #f5f5f5; padding: 20px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>CodeSandbox Demo App</h1>
        <button onclick="fetchData()">Fetch API Data</button>
        <div id="output"></div>
    </div>
    
    <script>
        async function fetchData() {
            try {
                const response = await fetch('/api/data');
                const data = await response.json();
                document.getElementById('output').innerHTML = 
                    '<h3>API Response:</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
                document.getElementById('output').innerHTML = 
                    '<h3>Error:</h3><pre>' + error.message + '</pre>';
            }
        }
    </script>
</body>
</html>
`);

// Install dependencies
console.log('Installing dependencies...');
const installResult = await sandbox.runCommand('npm', ['install'], {
  cwd: '/project/workspace'
});
console.log(installResult.stdout);

// Start the server (in background)
console.log('Starting server...');
const serverResult = await sandbox.runCommand('npm', ['run', 'dev'], {
  cwd: '/project/workspace',
  timeout: 5000 // Run for 5 seconds then continue
});

console.log('Server started:', serverResult.stdout);
```

### Data Processing Pipeline

```typescript
const sandbox = await compute.sandbox.create();

// Create data processing project
await sandbox.filesystem.mkdir('/project/workspace/data-pipeline');
await sandbox.filesystem.mkdir('/project/workspace/data-pipeline/input');
await sandbox.filesystem.mkdir('/project/workspace/data-pipeline/output');

// Create sample data
const csvData = `id,name,age,department,salary
1,Alice Johnson,28,Engineering,75000
2,Bob Smith,34,Marketing,65000
3,Carol Davis,29,Engineering,80000
4,David Wilson,42,Sales,70000
5,Eva Brown,31,Engineering,85000`;

await sandbox.filesystem.writeFile('/project/workspace/data-pipeline/input/employees.csv', csvData);

// Create Python data processing script
const pythonScript = `
import pandas as pd
import json
import os
from datetime import datetime

# Read the data
df = pd.read_csv('/project/workspace/data-pipeline/input/employees.csv')

print("Original data:")
print(df)
print(f"\\nTotal employees: {len(df)}")

# Process data
summary = {
    'total_employees': len(df),
    'departments': df['department'].unique().tolist(),
    'avg_salary_by_dept': df.groupby('department')['salary'].mean().to_dict(),
    'avg_age': df['age'].mean(),
    'salary_stats': {
        'min': df['salary'].min(),
        'max': df['salary'].max(),
        'median': df['salary'].median()
    },
    'processed_at': datetime.now().isoformat()
}

print("\\nSummary statistics:")
for key, value in summary.items():
    if key != 'processed_at':
        print(f"{key}: {value}")

# Save processed data
output_dir = '/project/workspace/data-pipeline/output'

# Save summary as JSON
with open(f'{output_dir}/summary.json', 'w') as f:
    json.dump(summary, f, indent=2, default=str)

# Save high earners (>70k)
high_earners = df[df['salary'] > 70000]
high_earners.to_csv(f'{output_dir}/high_earners.csv', index=False)

# Save department summary
dept_summary = df.groupby('department').agg({
    'salary': ['mean', 'count'],
    'age': 'mean'
}).round(2)
dept_summary.to_csv(f'{output_dir}/department_summary.csv')

print(f"\\nProcessing complete! Files saved to {output_dir}")
print(f"High earners: {len(high_earners)} employees")
`;

await sandbox.filesystem.writeFile('/project/workspace/data-pipeline/process.py', pythonScript);

// Run the data processing
console.log('Running data processing pipeline...');
const result = await sandbox.runCode(`
import os
os.chdir('/project/workspace/data-pipeline')
exec(open('process.py').read())
`);

console.log(result.stdout);

// Read the results
const summary = await sandbox.filesystem.readFile('/project/workspace/data-pipeline/output/summary.json');
console.log('\\nProcessing Summary:', JSON.parse(summary));

// Check output files
const outputFiles = await sandbox.filesystem.readdir('/project/workspace/data-pipeline/output');
console.log('\\nGenerated files:', outputFiles);
```

### Interactive Development Environment

```typescript
const sandbox = await compute.sandbox.create();

// Set up a Node.js project with live reloading
await sandbox.filesystem.mkdir('/project/workspace/dev-env');

// Create package.json with nodemon for live reloading
const packageJson = {
  "name": "dev-environment",
  "version": "1.0.0",
  "scripts": {
    "dev": "nodemon app.js",
    "start": "node app.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "nodemon": "^2.0.0"
  }
};

await sandbox.filesystem.writeFile(
  '/project/workspace/dev-env/package.json',
  JSON.stringify(packageJson, null, 2)
);

// Create initial app
let version = 1;
const createApp = (version) => `
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Development Environment!',
    version: ${version},
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    uptime: process.uptime(),
    version: ${version}
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(\`[v${version}] Server running on port \${PORT}\`);
});
`;

await sandbox.filesystem.writeFile('/project/workspace/dev-env/app.js', createApp(version));

// Install dependencies
console.log('Setting up development environment...');
const installResult = await sandbox.runCommand('npm', ['install'], {
  cwd: '/project/workspace/dev-env'
});

console.log('Dependencies installed:', installResult.success);

// Start development server
console.log('Starting development server...');
const startResult = await sandbox.runCommand('npm', ['run', 'dev'], {
  cwd: '/project/workspace/dev-env',
  timeout: 3000 // Let it start up
});

// Simulate live development - make changes to the app
for (let i = 2; i <= 4; i++) {
  console.log(`\\nUpdating app to version ${i}...`);
  
  await sandbox.filesystem.writeFile('/project/workspace/dev-env/app.js', createApp(i));
  
  // Give nodemon time to restart
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`App updated to version ${i} - nodemon should auto-restart`);
}

console.log('\\nDevelopment simulation complete!');
```

## Best Practices

1. **Resource Management**: Use hibernation instead of destroying sandboxes to preserve state
2. **Error Handling**: Use try-catch blocks for robust error handling
3. **Timeouts**: Set appropriate timeouts for long-running tasks
4. **File Organization**: Organize files in `/project/workspace/` directory
5. **Template Usage**: Use appropriate templates for your project type
6. **API Key Security**: Never commit API keys to version control
7. **Snapshot Management**: Leverage CodeSandbox's snapshot/resume capabilities

## Limitations

- **Memory Limits**: Subject to CodeSandbox sandbox memory constraints
- **Network Access**: Limited outbound network access in some plans
- **Execution Time**: Subject to CodeSandbox timeout limits
- **Template Dependency**: Sandbox behavior depends on chosen template

## Support

- [CodeSandbox Documentation](https://codesandbox.io/docs/sdk)
- [ComputeSDK Issues](https://github.com/computesdk/computesdk/issues)
- [CodeSandbox Support](https://codesandbox.io/support)

## License

MIT