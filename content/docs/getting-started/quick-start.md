# Quick Start

Get up and running with ComputeSDK in just a few minutes.

## Your First Computation

Let's start with a simple computation to understand how ComputeSDK works:

```javascript
import { compute } from "@computesdk/core";

async function calculatePi() {
  // Define a function to calculate Pi using the Monte Carlo method
  const piCalculation = `
    function estimatePi(samples) {
      let inside = 0;
      for (let i = 0; i < samples; i++) {
        const x = Math.random();
        const y = Math.random();
        if (x * x + y * y <= 1) inside++;
      }
      return (4 * inside) / samples;
    }
    
    return estimatePi(1000000);
  `;

  try {
    const result = await compute(piCalculation);
    console.log("Approximate value of Pi:", result);
  } catch (error) {
    console.error("Error during computation:", error);
  }
}

calculatePi();
```

## Using External Dependencies

ComputeSDK allows you to use npm packages in your computations. Here's how:

```javascript
import { compute } from "@computesdk/core";

async function analyzeData() {
  const analysis = `
    // Use any npm package by specifying it in the dependencies
    const { PCA } = await import('ml-pca');
    
    // Sample data
    const data = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      [10, 11, 12]
    ];
    
    // Perform PCA
    const pca = new PCA(data);
    return {
      explainedVariance: pca.getExplainedVariance(),
      components: pca.getEigenvectors()
    };
  `;

  try {
    const result = await compute(analysis, {
      // Specify any npm dependencies
      dependencies: {
        "ml-pca": "^2.1.0",
      },
    });

    console.log("PCA Results:", result);
  } catch (error) {
    console.error("Error during analysis:", error);
  }
}

analyzeData();
```

## Handling Large Data

ComputeSDK is designed to handle large datasets efficiently. Here's an example of processing a large dataset:

```javascript
import { compute } from "@computesdk/core";

async function processLargeDataset() {
  const processData = `
    // Generate a large dataset
    const generateData = (size) => {
      return Array.from({ length: size }, (_, i) => ({
        id: i,
        value: Math.random() * 1000,
        timestamp: Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30) // Last 30 days
      }));
    };
    
    const largeDataset = generateData(1000000); // 1 million records
    
    // Process the data
    const stats = {
      count: largeDataset.length,
      total: largeDataset.reduce((sum, item) => sum + item.value, 0),
      average: 0,
      min: Infinity,
      max: -Infinity
    };
    
    largeDataset.forEach(item => {
      if (item.value < stats.min) stats.min = item.value;
      if (item.value > stats.max) stats.max = item.value;
    });
    
    stats.average = stats.total / stats.count;
    
    return stats;
  `;

  try {
    console.log("Processing large dataset...");
    const result = await compute(processData, {
      timeout: 300000, // 5 minutes timeout
    });

    console.log("Processing complete!");
    console.log("Statistics:", result);
  } catch (error) {
    console.error("Error processing data:", error);
  }
}

processLargeDataset();
```

## Next Steps

Now that you've seen the basics, you can explore more advanced topics:

- [API Reference](/docs/api/core) - Detailed documentation of all available methods
- [Best Practices](/docs/guides/best-practices) - Learn how to optimize your computations
- [Examples](/docs/guides/examples) - More code examples and use cases

## Need Help?

If you run into any issues or have questions:

1. Check our [Troubleshooting Guide](/docs/guides/troubleshooting)
2. Join our [Community Forum](https://community.computesdk.com)
3. Contact [Support](mailto:support@computesdk.com)
