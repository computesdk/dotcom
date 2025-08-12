---
title: Filesystem
description: File and directory operations in sandboxes
sidebar:
    order: 4
---

Perform file and directory operations within sandbox environments.

## Methods

### `sandbox.filesystem.writeFile(path, content)`

Write content to a file.

```typescript
await sandbox.filesystem.writeFile('/tmp/hello.py', 'print("Hello World!")');

// Write JSON data
const data = { message: "Hello", timestamp: new Date().toISOString() };
await sandbox.filesystem.writeFile('/tmp/data.json', JSON.stringify(data, null, 2));
```

**Parameters:**
- `path` - File path string
- `content` - File content string

### `sandbox.filesystem.readFile(path)`

Read content from a file.

```typescript
const content = await sandbox.filesystem.readFile('/tmp/hello.py');
console.log(content); // "print("Hello World!")"

// Read JSON data
const jsonContent = await sandbox.filesystem.readFile('/tmp/data.json');
const data = JSON.parse(jsonContent);
```

**Parameters:**
- `path` - File path string

**Returns:** File content as string

### `sandbox.filesystem.mkdir(path)`

Create a directory (and parent directories if needed).

```typescript
await sandbox.filesystem.mkdir('/tmp/myproject');
await sandbox.filesystem.mkdir('/tmp/myproject/data/output'); // Creates nested dirs
```

**Parameters:**
- `path` - Directory path string

### `sandbox.filesystem.readdir(path)`

List directory contents.

```typescript
const files = await sandbox.filesystem.readdir('/tmp');
files.forEach(file => {
  console.log(`${file.name} (${file.isDirectory ? 'directory' : 'file'})`);
});
```

**Parameters:**
- `path` - Directory path string

**Returns:** Array of file/directory entries

### `sandbox.filesystem.exists(path)`

Check if a file or directory exists.

```typescript
const exists = await sandbox.filesystem.exists('/tmp/hello.py');
if (exists) {
  console.log('File exists');
}
```

**Parameters:**
- `path` - File or directory path string

**Returns:** Boolean indicating existence

### `sandbox.filesystem.remove(path)`

Remove a file or directory.

```typescript
// Remove file
await sandbox.filesystem.remove('/tmp/hello.py');

// Remove directory and contents
await sandbox.filesystem.remove('/tmp/myproject');
```

**Parameters:**
- `path` - File or directory path string

## Types

```typescript
interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
}
```

## Examples

### Project Structure Creation

```typescript
// Create project structure
await sandbox.filesystem.mkdir('/workspace/myapp');
await sandbox.filesystem.mkdir('/workspace/myapp/src');
await sandbox.filesystem.mkdir('/workspace/myapp/data');
await sandbox.filesystem.mkdir('/workspace/myapp/output');

// Create configuration file
const config = {
  name: "MyApp",
  version: "1.0.0",
  description: "Sample application"
};
await sandbox.filesystem.writeFile(
  '/workspace/myapp/config.json', 
  JSON.stringify(config, null, 2)
);

// Create main script
await sandbox.filesystem.writeFile('/workspace/myapp/src/main.py', `
import json
import os

# Read configuration
with open('/workspace/myapp/config.json', 'r') as f:
    config = json.load(f)

print(f"Running {config['name']} v{config['version']}")
print(f"Description: {config['description']}")
`);
```

### File Processing Workflow

```typescript
// Write input data
const csvData = `name,age,city
Alice,25,New York
Bob,30,San Francisco
Charlie,35,Chicago`;

await sandbox.filesystem.writeFile('/data/input.csv', csvData);

// Process with Python
await sandbox.runCode(`
import pandas as pd
import json

# Read and process data
df = pd.read_csv('/data/input.csv')
result = {
    'total_records': len(df),
    'average_age': df['age'].mean(),
    'cities': df['city'].unique().tolist()
}

# Write results
with open('/data/results.json', 'w') as f:
    json.dump(result, f, indent=2)

print("Processing complete!")
`);

// Read results
const results = await sandbox.filesystem.readFile('/data/results.json');
const analysis = JSON.parse(results);
console.log(analysis);
```

### Directory Management

```typescript
// Check if directory exists, create if not
const dataDir = '/workspace/data';
if (!(await sandbox.filesystem.exists(dataDir))) {
  await sandbox.filesystem.mkdir(dataDir);
}

// List all files in directory
const files = await sandbox.filesystem.readdir('/workspace');
console.log('Workspace contents:');
files.forEach(file => {
  const type = file.isDirectory ? 'DIR' : 'FILE';
  console.log(`  ${type}: ${file.name}`);
});

// Clean up temporary files
const tempFiles = await sandbox.filesystem.readdir('/tmp');
for (const file of tempFiles) {
  if (file.name.endsWith('.tmp')) {
    await sandbox.filesystem.remove(`/tmp/${file.name}`);
  }
}
```