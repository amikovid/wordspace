# Wordspace MCP server

An MCP (Model Context Protocol) server that exposes the Wordspace DB
as tools for Claude — so a Claude chat can capture excerpts, search the
library, and write reflections without you ever touching the SQL.

The Wordspace app **presents**. The Claude chat **thinks**. The DB is
the shared state — which means a chat hitting its image limit can hand
off to a new chat that just calls `wordspace_recent_reflections` and
picks up.

## Tools (16 total)

**Capture / library**

| Tool | What it does |
|---|---|
| `wordspace_create_excerpt`     | Add a new excerpt. Embeds, finds neighbors, attaches themes. |
| `wordspace_update_excerpt`     | Patch fields (text / book / author / themes / etc). Re-embeds if text or my_thought changed. |
| `wordspace_delete_excerpt`     | Permanently delete; cascades theme links + scrubs dangling refs. |
| `wordspace_get_excerpt`        | Full record + themes + neighbors. |
| `wordspace_search`             | Semantic search via pgvector cosine. |
| `wordspace_list_recent`        | Newest-first excerpts. |
| `wordspace_add_reflection`     | Inline on excerpt OR standalone reflection. |
| `wordspace_list_themes`        | All themes with attachment counts. |
| `wordspace_add_question`       | File an open question. |
| `wordspace_list_questions`     | Filter by status. |
| `wordspace_recent_reflections` | Recent reflections (optionally by kind). |

**Practice layer**

| Tool | What it does |
|---|---|
| `wordspace_get_profile`           | Read the user's profile (about / current_focus / constraints / facts). |
| `wordspace_update_profile`        | Patch text fields and/or replace facts array. Always show user before mutating. |
| `wordspace_add_practice`          | Propose a practice — must satisfy moment/action/stop-condition/<15min constraints. |
| `wordspace_list_practices`        | Active set by default (proposed / accepted / tried). |
| `wordspace_log_practice_outcome`  | Close the loop. Status: accepted / declined / tried / completed + optional outcome text. |

## Setup

### 1. Apply the schema to Neon (one-time)

From the repo root:

```bash
psql "$DATABASE_URL" -f scripts/schema.sql
```

Or paste `scripts/schema.sql` into the Neon SQL editor and run it.

### 2. Install MCP server deps

```bash
cd mcp
npm install
```

### 3. Wire to Claude Desktop

Edit your Claude Desktop config:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the Wordspace entry to `mcpServers`:

```json
{
  "mcpServers": {
    "wordspace": {
      "command": "node",
      "args": ["C:\\Users\\Kovid Bhaduri\\Desktop\\Claude projects\\wordspace\\mcp\\index.js"],
      "env": {
        "DATABASE_URL": "postgresql://...",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

(On macOS use `/Users/...` style absolute paths.)

Restart Claude Desktop. You should see `wordspace` show up in the MCP
servers list and `wordspace_*` tools become available.

### 4. (Optional) Add to Claude Code

In Claude Code, add the MCP config to `.mcp.json` at the project root:

```json
{
  "mcpServers": {
    "wordspace": {
      "command": "node",
      "args": ["mcp/index.js"]
    }
  }
}
```

It picks up env from the project `.env`.

## Workflow

1. Chat with Claude. Share a screenshot or an excerpt. Tell Claude what
   you thought about it.
2. Claude calls `wordspace_create_excerpt` with the text, source, and
   your thought. It gets back the new id + nearest neighbors and writes
   a reflection citing them via `wordspace_add_reflection`.
3. From your terminal, run `npm run snapshot` from the wordspace repo.
   That re-runs PCA over the full corpus and refreshes
   `src/data/excerpts-processed.json` — the file the 3D app reads.
4. Reload Wordspace in your browser. The new excerpt is now a star.

## Project Claude system prompt

Put something like the following in your Claude Project / system prompt
so Claude knows what role to play. (Adjust the voice section to taste —
or pull from `prompts/_voice.md` in the repo.)

```
You are the curator of my reading library. I share excerpts and
screenshots with you; you store them via the wordspace tools and write
careful, restrained reflections that connect new passages to what's
already in the corpus.

When I send a new excerpt:
1. Call wordspace_search to find what's adjacent already.
2. Call wordspace_create_excerpt with the text + my thought.
3. Use the returned nearest_neighbors plus your own reading to write a
   2–3 sentence reflection.
4. Save the reflection with wordspace_add_reflection(excerpt_id, body).

Voice: felt, restrained, literary. No flattery. No advice. Cite excerpt
ids in [brackets]. Stop when you've said the true thing.

At the start of a fresh chat (e.g. after hitting an image limit), call
wordspace_recent_reflections({ limit: 5 }) and wordspace_list_recent({ limit: 10 })
to pick up context.
```

## Logs

The server logs to stderr (Claude Desktop captures these). Look for
`[wordspace-mcp]` lines in the MCP server log panel of Claude Desktop's
developer settings.
