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

export const AGENT_TOOL_DEFINITIONS = Object.values(AGENT_TOOLS).map((tool) => {
  // Use strategy: "none" to force inline definitions without $ref pointers
  const jsonSchema = zodToJsonSchema(tool.schema, {
    $refStrategy: "none",
  }) as Record<string, any>;

  delete jsonSchema.$schema;
  delete jsonSchema.additionalProperties;

  console.log(`tool.name: ${tool.name}, jsonSchema: ${JSON.stringify(jsonSchema)}`);
  console.log(`tool.schema: jsonSchema.properties::`,jsonSchema.properties);
  console.log(`tool.schema: jsonSchema.required::`,jsonSchema.required);

  console.log(" I am here  1")

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