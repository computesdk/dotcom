---
title: Configuration
description: Configure ComputeSDK with providers and settings
sidebar:
    order: 1
---

Configure ComputeSDK with providers and global settings.

## Methods

### `compute.setConfig(config)`

Set the global configuration including default provider.

```typescript
import { compute } from 'computesdk';
import { e2b } from '@computesdk/e2b';

compute.setConfig({ 
  provider: e2b({ apiKey: process.env.E2B_API_KEY }) 
});
```

**Parameters:**
- `config` - Configuration object
  - `provider` - Default provider instance

### `compute.getConfig()`

Get the current global configuration.

```typescript
const config = compute.getConfig();
console.log(config.provider); // Current provider
```

**Returns:** Current configuration object

### `compute.clearConfig()`

Clear the global configuration.

```typescript
compute.clearConfig();
```

## Types

```typescript
interface ComputeConfig {
  provider?: Provider;
}
```