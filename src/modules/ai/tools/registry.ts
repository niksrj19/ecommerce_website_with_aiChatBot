import { searchCatalogTool } from "./implementations/search-catalog.tool";
import { manageCartTool } from "./implementations/manage-cart.tool";
import { getOrderStatusTool } from "./implementations/get-order-status.tool";
import { queryRunbooksTool } from "./implementations/query-runbooks.tool";
import { issueRefundTool } from "./implementations/issue-refund.tool";
import { zodToJsonSchema } from "zod-to-json-schema";

export const AGENT_TOOLS: Record<string, any> = {
  [searchCatalogTool.name]: searchCatalogTool,
  [manageCartTool.name]: manageCartTool,
  [getOrderStatusTool.name]: getOrderStatusTool,
  [queryRunbooksTool.name]: queryRunbooksTool,
  [issueRefundTool.name]: issueRefundTool,
};

// export const AGENT_TOOL_DEFINITIONS = Object.values(AGENT_TOOLS).map((tool) => ({
//   type: "function" as const,
//   function: {
//     name: tool.name,
//     description: tool.description,
//     parameters: zodToJsonSchema(tool.schema, {
//       target: "openAi", // Formats output specifically for OpenAI/Groq tool calls
//     }),
//   },
// }));

console.log("AGENT_TOOLS :::::",JSON.stringify(AGENT_TOOLS))

export const AGENT_TOOL_DEFINITIONS = Object.values(AGENT_TOOLS).map((tool) => {
  // Use strategy: "none" to force inline definitions without $ref pointers

  console.log(`Tool: ${tool.name}, Zod Schema:`, tool.schema);

  const jsonSchema = zodToJsonSchema(tool.schema, {
    $refStrategy: "none",
  }) as Record<string, any>;

  delete jsonSchema.$schema;
  delete jsonSchema.additionalProperties;

  return {
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: jsonSchema.properties || {},
        required: jsonSchema.required || [],
      },
    },
  };
});