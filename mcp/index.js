#!/usr/bin/env node
// Wordspace MCP server — exposes the Wordspace DB as tools for Claude.
//
// Transport: stdio (for Claude Desktop / Claude Code).
// Loads .env from CWD if present, then falls back to the system env so
// Claude Desktop can pass credentials via the env block instead.

import 'dotenv/config'

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import createExcerpt    from './tools/create_excerpt.js'
import updateExcerpt    from './tools/update_excerpt.js'
import deleteExcerpt    from './tools/delete_excerpt.js'
import getExcerpt       from './tools/get_excerpt.js'
import searchTool       from './tools/search.js'
import listRecent       from './tools/list_recent.js'
import addReflection    from './tools/add_reflection.js'
import listThemes       from './tools/list_themes.js'
import addQuestion      from './tools/add_question.js'
import listQuestions    from './tools/list_questions.js'
import recentReflections from './tools/recent_reflections.js'

const TOOLS = [
  createExcerpt,
  updateExcerpt,
  deleteExcerpt,
  getExcerpt,
  searchTool,
  listRecent,
  addReflection,
  listThemes,
  addQuestion,
  listQuestions,
  recentReflections,
]

const toolMap = new Map(TOOLS.map(t => [t.name, t]))

const server = new Server(
  { name: 'wordspace', version: '0.0.1' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params
  const tool = toolMap.get(name)
  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    }
  }
  try {
    const result = await tool.handler(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (err) {
    console.error(`[wordspace-mcp] ${name} failed:`, err)
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)

// Keep alive — stdio transport handles its own lifecycle.
console.error(`[wordspace-mcp] running. ${TOOLS.length} tools registered.`)
