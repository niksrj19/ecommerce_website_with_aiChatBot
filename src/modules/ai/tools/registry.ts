import { searchCatalogTool } from "./implementations/search-catalog.tool.js";
import { manageCartTool } from "./implementations/manage-cart.tool.js";
import { getOrderStatusTool } from "./implementations/get-order-status.tool.js";
import { queryRunbooksTool } from "./implementations/query-runbooks.tool.js";
import { issueRefundTool } from "./implementations/issue-refund.tool.js";
import { zodToJsonSchema } from "zod-to-json-schema";

export const AGENT_TOOLS: Record<string, any> = {
  [searchCatalogTool.name]: searchCatalogTool,
  [manageCartTool.name]: manageCartTool,
  [getOrderStatusTool.name]: getOrderStatusTool,
  [queryRunbooksTool.name]: queryRunbooksTool,
  [issueRefundTool.name]: issueRefundTool,
};

export const AGENT_TOOL_DEFINITIONS = Object.values(AGENT_TOOLS).map((tool) => {
  // Use strategy: "none" to force inline definitions without $ref pointers
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