---
title: Server
description: Compute Server by Compute SDK.
sidebar:
    order: 1
---

#### ComputeSDK Proprietary Server for Cloud Integration
ComputeSDK offers a powerful proprietary server solution designed to provide a secure and efficient bridge for executing code within your existing AWS, Azure, and Google Cloud Platform (GCP) environments. This server acts as a dedicated ComputeSDK provider, allowing you to leverage your cloud infrastructure while maintaining the unified API and sandboxing benefits of ComputeSDK.

#### Overview
Our proprietary server extends ComputeSDK's capabilities by enabling direct integration with your private cloud resources. This is ideal for scenarios requiring:

Data Locality: Keep your data within your existing cloud infrastructure.

Custom Environments: Utilize custom machine images or specific configurations within your cloud.

Enhanced Security: Leverage your cloud's native security features and network controls.

Cost Optimization: Optimize resource usage by running sandboxes directly on your provisioned cloud instances.

The server abstracts the underlying cloud provider specifics, presenting a consistent ComputeSDK interface for execute, filesystem operations, and more.

### Installation and Setup
Setting up the ComputeSDK Proprietary Server involves deploying the server application within your chosen cloud environment (AWS, Azure, or GCP) and then configuring your client-side ComputeSDK to connect to it.

#### 1. Server Deployment
The proprietary server can be deployed as a containerized application (e.g., Docker) or directly on a virtual machine. Detailed deployment instructions for each cloud provider are available in our dedicated deployment guides (links coming soon).

#### Key Deployment Considerations:

Network Access: Ensure the server is accessible from your client applications (e.g., via a public IP, VPN, or private link).

Resource Allocation: Allocate sufficient CPU, memory, and storage based on your expected sandbox workload.

Security: Implement appropriate network security groups, firewalls, and IAM roles to secure the server.

#### 2. Client-Side Configuration
Once your proprietary server is deployed and accessible, configure your client-side ComputeSDK application to connect to it. This involves installing the @computesdk/proprietary-server package and providing the server's endpoint URL.

#### Installation:

```bash
npm install @computesdk/proprietary-server
```

#### Configuration:

```typescript
import { proprietaryServer } from '@computesdk/proprietary-server';

// Replace with the actual URL of your deployed proprietary server
const serverEndpoint = 'https://your-proprietary-server.example.com';

const sandbox = proprietaryServer({
  serverUrl: serverEndpoint,
  // Optional: API key for server authentication if configured
  apiKey: process.env.COMPUTESDK_SERVER_API_KEY,
  // Optional: Specify a default runtime if your server supports multiple
  runtime: 'python',
  timeout: 300000, // optional, defaults to 5 minutes
});

// Now you can use this sandbox instance as usual
const result = await sandbox.execute('print("Hello from Proprietary Server!")');
console.log(result.stdout);

await sandbox.kill();
```

#### 3. Cloud Provider Integration (Server-Side)
The proprietary server itself handles the integration with AWS, Azure, and GCP. When deploying the server, you will configure it with the necessary credentials and settings for the cloud providers you wish to utilize.

General Configuration Principles (Server-Side):

IAM Roles/Service Accounts: The server instance should have appropriate IAM roles (AWS), Managed Identities (Azure), or Service Accounts (GCP) to provision and manage compute resources (e.g., EC2 instances, Azure Container Instances, GCE VMs) for sandboxing.

API Keys/Credentials: For specific operations or fallback mechanisms, you might provide API keys directly to the server's environment.

Resource Tags/Labels: Configure the server to tag or label the provisioned resources for easier management and cost tracking within your cloud.

### AWS Integration
On the server-side, the proprietary server will use your AWS credentials (typically via IAM roles assigned to the EC2 instance running the server) to:

Launch EC2 instances or Fargate tasks for sandboxing.

Manage security groups and network configurations.

Interact with S3 for filesystem operations.

### Azure Integration
For Azure, the server will leverage Managed Identities or Service Principals to:

Provision Azure Container Instances (ACI) or Virtual Machines.

Configure network security groups.

Interact with Azure Blob Storage for filesystem operations.

### Google Cloud Platform (GCP) Integration
On GCP, the server will use Service Accounts to:

Create Google Compute Engine (GCE) instances or Cloud Run jobs.

Manage VPC networks and firewall rules.

Interact with Google Cloud Storage for filesystem operations.

### Examples
Here's how you might use the proprietary server with different runtimes, assuming your server is configured to support them and connect to the respective cloud backends:

Executing Python on AWS (via Proprietary Server)
```typescript
import { proprietaryServer } from '@computesdk/proprietary-server';

const serverEndpoint = 'https://your-proprietary-server.example.com';
const sandbox = proprietaryServer({ serverUrl: serverEndpoint, runtime: 'python' });

const result = await sandbox.execute(`
import platform
print(f"Python version: {platform.python_version()}")
print("Hello from AWS via Proprietary Server!")
`);
console.log(result.stdout);
await sandbox.kill();

Executing Node.js on Azure (via Proprietary Server)
import { proprietaryServer } from '@computesdk/proprietary-server';

const serverEndpoint = 'https://your-proprietary-server.example.com';
const sandbox = proprietaryServer({ serverUrl: serverEndpoint, runtime: 'node' });

const result = await sandbox.execute(`
console.log('Node.js version:', process.version);
console.log('Hello from Azure via Proprietary Server!');
`);
console.log(result.stdout);
await sandbox.kill();

Filesystem Operations on GCP (via Proprietary Server)
import { proprietaryServer } from '@computesdk/proprietary-server';

const serverEndpoint = 'https://your-proprietary-server.example.com';
const sandbox = proprietaryServer({ serverUrl: serverEndpoint }); // Default runtime or specify

const filePath = '/data/gcp_test.txt';
const fileContent = 'This file was created on GCP via our proprietary server.';

// Write a file
await sandbox.filesystem.writeFile(filePath, fileContent);
console.log(`File written to ${filePath}`);

// Read the file
const readContent = await sandbox.filesystem.readFile(filePath);
console.log(`Content read from ${filePath}: "${readContent}"`);

// Check if it exists
const exists = await sandbox.filesystem.exists(filePath);
console.log(`File exists: ${exists}`);

// Remove the file
await sandbox.filesystem.remove(filePath);
console.log(`File removed from ${filePath}`);

await sandbox.kill();
```

This page serves as an introduction to integrating your ComputeSDK client with our proprietary server for AWS, Azure, and GCP. For detailed server deployment instructions and advanced configurations, please refer to the specific deployment guides for each cloud provider.
