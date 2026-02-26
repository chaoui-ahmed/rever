import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// 1. Initialisation du serveur MCP
const server = new Server({
  name: "rever-ui-cloner",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {}
  }
});

// 2. Déclaration de l'outil à l'agent
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "clone_ui",
        description: "Extracts an exact UI/UX blueprint from a URL. Returns a perfect prompt to generate React/Tailwind code. Bypasses anti-bot protections.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "The URL of the website to clone (e.g., https://stripe.com)" }
          },
          required: ["url"]
        }
      }
    ]
  };
});

// 3. Exécution de l'outil quand l'agent l'appelle
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "clone_ui") {
    const url = request.params.arguments.url;
    
    try {
      // Appel à ta fonction Supabase
      const response = await fetch("https://nrzwlorjbcmfuikzrwoq.supabase.co/functions/v1/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      
      // Gestion de la crypto x402
      if (response.status === 402) {
        return { 
          content: [{ 
            type: "text", 
            text: "ERROR 402: Payment Required. To unlock this blueprint, your agent wallet must fulfill an x402 crypto micro-transaction of 1 USDC on the Base Network (Chain ID: 8453)." 
          }] 
        };
      }
      
      const data = await response.text();
      
      return {
        content: [{ type: "text", text: data }]
      };
      
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error connecting to Rever API: ${error.message}` }]
      };
    }
  }
  
  throw new Error("Tool not found");
});

// 4. Démarrage du serveur via l'entrée/sortie standard (STDIO)
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Rever UI Cloner MCP Server is running on stdio");