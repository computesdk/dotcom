import type { DocContent } from "../../types";

const introduction: DocContent = {
  title: "Introduction",
  description: "Welcome to the ComputeSDK API Documentation!",
  content: [
    {
      type: "h1",
      text: "Getting Started: Introduction"
    },
    {
      type: "p",
      text: "Welcome to the ComputeSDK API Documentation!"
    },
    {
      type: "p",
      text: "Our API empowers developers to seamlessly integrate with our powerful compute platform and unlock a world of possibilities. Whether you're looking to automate workflows, build custom applications, or extend existing functionalities, our robust and flexible API is designed to meet your needs."
    },
    {
      type: "p",
      text: "This documentation serves as your comprehensive guide, covering everything from initial setup and authentication to detailed API references and best practices. We aim to provide clear, concise, and actionable information to help you get up and running quickly and efficiently."
    },
    {
      type: "h2",
      text: "Key capabilities",
      id: "key-capabilities"
    },
    {
      type: "ul",
      items: [
        "Data Management: Create, read, update, and delete records for your compute resources and workflows.",
        "Workflow Automation: Trigger events, manage tasks, and streamline computational processes.",
        "Performance Analytics: Access real-time metrics and generate custom reports on your compute jobs.",
        "Seamless Integration: Connect with other services and platforms through our comprehensive API."
      ]
    },
    {
      type: "p",
      text: "We're excited to see what you'll build!"
    }
  ]
};

export default introduction;
