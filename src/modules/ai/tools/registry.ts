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

export const AGENT_TOOL_DEFINITIONS = Object.values(AGENT_TOOLS).map((tool) => {
  const jsonSchema = zodToJsonSchema(tool.schema, {
    target: "openAi",
  }) as Record<string, any>;

  // Remove $schema top-level tag as Groq/OpenAI APIs reject it
  delete jsonSchema.$schema;

  return {
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: jsonSchema,
    },
  };
});