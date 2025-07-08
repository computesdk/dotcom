import type { DocContent } from "../../types";

const installation: DocContent = {
  title: "Installation",
  description: "Learn how to install and set up ComputeSDK in your project",
  content: [
    {
      type: "h1",
      text: "Getting Started: Installation"
    },
    {
      type: "p",
      text: "Before you can start making API calls, you'll need to set up your development environment. This section guides you through the necessary steps to install our SDKs and prepare your workspace."
    },
    {
      type: "h2",
      text: "1. Choose Your Language/Framework",
      id: "choose-language"
    },
    {
      type: "p",
      text: "Our API provides official SDKs for the most popular programming languages to simplify your integration. Select the one that best fits your project:"
    },
    {
      type: "code",
      language: "bash",
      code: "# Node.js/JavaScript\nnpm install @computesdk/api-sdk\n\n# Python\npip install computesdk\n\n# Ruby\ngem install computesdk\n\n# PHP\ncomposer require computesdk/api-sdk"
    },
    {
      type: "p",
      text: "For Java, add the following to your build configuration:"
    },
    {
      type: "code",
      language: "xml",
      code: "<!-- Maven -->\n<dependency>\n    <groupId>com.computesdk</groupId>\n    <artifactId>api-sdk</artifactId>\n    <version>1.0.0</version>\n</dependency>"
    },
    {
      type: "code",
      language: "gradle",
      code: "// Gradle\nimplementation 'com.computesdk:api-sdk:1.0.0'"
    },
    {
      type: "h2",
      text: "2. Initialize the SDK",
      id: "initialize-sdk"
    },
    {
      type: "p",
      text: "Once installed, you'll need to initialize the SDK with your API key. This typically happens once at the start of your application or service."
    },
    {
      type: "h3",
      text: "2.1 Example: Node.js"
    },
    {
      type: "code",
      language: "javascript",
      code: "const ComputeSDK = require('@computesdk/api-sdk');\nconst computesdk = new ComputeSDK('YOUR_API_KEY');"
    },
    {
      type: "h3",
      text: "2.2 Example: Python"
    },
    {
      type: "code",
      language: "python",
      code: "import computesdk\ncomputesdk = computesdk.ComputeSDK('YOUR_API_KEY')"
    },
    {
      type: "h2",
      text: "Security Best Practices"
    },
    {
      type: "p",
      text: "To ensure the security of your API keys and data, follow these guidelines:"
    },
    {
      type: "ul",
      items: [
        "Store your API keys securely, such as in environment variables or a secrets manager.",
        "Use HTTPS for all API requests to encrypt data in transit.",
        "Validate and sanitize user input to prevent injection attacks.",
        "Implement rate limiting and IP blocking to prevent abuse.",
        "Regularly update your SDKs and dependencies to ensure you have the latest security patches."
      ]
    }
  ]
};

export default installation;
