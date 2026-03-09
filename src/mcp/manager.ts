import { readFileSync, existsSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { JsonObject } from "../utils/types";
import { mcpConfigSchema, type McpConfig, type McpServerConfig } from "./types";

export class McpManager {
  private readonly config: McpConfig;
  private readonly clients = new Map<string, Client>();

  constructor(configPath: string) {
    if (!existsSync(configPath)) {
      this.config = { mcpServers: {} };
      return;
    }
    const raw = readFileSync(configPath, "utf8");
    this.config = mcpConfigSchema.parse(JSON.parse(raw));
  }

  async callTool(serverName: string, toolName: string, input: JsonObject): Promise<unknown> {
    const server = this.config.mcpServers[serverName];
    if (!server) {
      const available = Object.keys(this.config.mcpServers).join(", ") || "(none)";
      throw new Error(`Unknown MCP server: "${serverName}". Available: ${available}`);
    }

    if (server.transport === "mock") {
      const response = server.tools?.[toolName]?.response;
      if (response === undefined) {
        throw new Error(`Mock tool not configured: ${serverName}.${toolName}`);
      }
      return response;
    }

    return this.callRemote(serverName, server, toolName, input);
  }

  async listTools(serverName: string): Promise<{ name: string; description: string | undefined }[]> {
    const client = await this.getOrConnect(serverName);
    const result = await client.listTools();
    return result.tools.map((t) => ({ name: t.name, description: t.description }));
  }

  async disconnectAll(): Promise<void> {
    for (const [, client] of this.clients) {
      try { await client.close(); } catch { /* best effort */ }
    }
    this.clients.clear();
  }

  private async callRemote(
    serverName: string,
    server: McpServerConfig,
    toolName: string,
    input: JsonObject,
  ): Promise<unknown> {
    const client = await this.getOrConnect(serverName);
    const result = await client.callTool({ name: toolName, arguments: input });

    // Extract text content from MCP result
    if (result.content && Array.isArray(result.content)) {
      const texts = (result.content as Array<{ type: string; text?: string }>)
        .filter((c) => c.type === "text")
        .map((c) => c.text ?? "");

      if (texts.length === 1) {
        try { return JSON.parse(texts[0]!); } catch { return texts[0]; }
      }
      if (texts.length > 1) return texts;
    }

    return result;
  }

  private async getOrConnect(serverName: string): Promise<Client> {
    const existing = this.clients.get(serverName);
    if (existing) return existing;

    const server = this.config.mcpServers[serverName];
    if (!server) throw new Error(`Unknown MCP server: "${serverName}"`);

    if (server.transport !== "stdio") {
      throw new Error(`Unsupported transport "${server.transport}" for server "${serverName}". Only stdio is supported.`);
    }

    if (!server.command) {
      throw new Error(`stdio MCP server "${serverName}" is missing command`);
    }

    const env = this.resolveEnv(server.env);
    const transport = new StdioClientTransport({
      command: server.command,
      args: server.args ?? [],
      env,
    });

    const client = new Client({ name: "cronbot", version: "1.0.0" });
    await client.connect(transport);
    this.clients.set(serverName, client);
    return client;
  }

  private resolveEnv(env?: Record<string, string>): Record<string, string> {
    const base = { ...process.env } as Record<string, string>;
    if (!env) return base;
    for (const [key, value] of Object.entries(env)) {
      base[key] = value.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? "");
    }
    return base;
  }
}
