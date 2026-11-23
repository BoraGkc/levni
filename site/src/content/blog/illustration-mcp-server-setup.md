---
title: "Add an Illustration MCP Server to Claude, Cursor and VS Code"
description: "Add an MCP server for images to Claude Desktop, Cursor, VS Code or Claude Code. Exact config for each client, what the five tools return, and a first test prompt."
date: 2026-11-20
category: agents
kind: Guide
coverAlt: "A laptop on the left, a robot on the right and a power plug in the middle on a yellow disc, all on a blue card"
faq:
  - q: "How do I add an MCP server to Claude Desktop?"
    a: "Open claude_desktop_config.json, add a levni entry under mcpServers with the command npx and the arguments -y, @levni/levni and mcp, then restart Claude Desktop. The five tools appear in the tools menu of a new chat."
  - q: "Where is the Cursor MCP config file?"
    a: "Cursor reads .cursor/mcp.json in your project for one repository, or a global mcp.json in your home .cursor folder for every project. Both use the same mcpServers format as Claude Desktop."
  - q: "Why does the first run of npx take so long?"
    a: "On first run npx has to download the package and its image library, sharp, before the server starts. The first start can take a minute. Later starts use the cache and are quick."
  - q: "Does the Levni MCP server need an API key?"
    a: "No. The server draws from a JSON scene on your machine. It calls no image model and no web service, so there is no key to set and no cost per image."
  - q: "Which Node version do I need?"
    a: "Node 20 or newer. If your client starts the server with an older Node, it will fail before it answers, so check node --version in the same shell the client uses."
---

You can give an AI agent a drawing tool in about two minutes. The Model Context Protocol, or MCP, lets a client such as Claude Desktop, Cursor or VS Code start a small program and call the tools it offers. If one of those tools draws pictures, your agent can make a cover image without leaving the chat.

This guide adds **Levni** as that tool. Levni is an open-source illustration engine: the agent writes a short JSON scene, Levni draws it in a hand-inked riso style and sends back layout notes and a preview. It is not an image model, so there is no API key and no cost per image.

You need Node 20 or newer and one of four clients: Claude Code, Claude Desktop, Cursor or VS Code. Pick your section below. Each one gives the exact config to paste. Then we look at what the five tools do, run a first test prompt and fix the usual snags.

## See how the client and server fit

The client is the app you chat in. It starts `levni mcp` as a child process and talks to it over stdio, one JSON message per line. Nothing listens on a port and nothing leaves your machine.

![A laptop and a small robot on a coral card, an arrow to a power plug on a yellow disc, and an arrow to a server rack on a blue card](/blog/illustration-mcp-server-setup/fig-1.webp)
*The client (laptop and agent) starts the server and speaks to it through stdio.*

So every client needs the same three facts: a command (`npx`), its arguments (`-y @levni/levni mcp`) and a name (`levni`). Only the file that holds them changes. For the background, the [MCP documentation](https://modelcontextprotocol.io) explains the protocol in full.

## Add the server to Claude Code

Claude Code has a command for it, so there is no file to edit:

```bash
claude mcp add levni -- npx -y @levni/levni mcp
```

Start a new session and ask Claude to list its tools. You should see `scene_guide`, `list_props`, `show_props`, `render_scene` and `critique_scene`. For a full walk-through that ends in a finished cover, read [how to generate blog covers with Claude Code](/blog/generate-blog-covers-claude-code/).

## Add the server to Claude Desktop

Claude Desktop reads `claude_desktop_config.json`. Open it from Settings, Developer, Edit Config, or find it in the Claude folder: `~/Library/Application Support/Claude/` on macOS and `%APPDATA%\Claude\` on Windows. Add a `levni` entry:

```json
{
  "mcpServers": {
    "levni": {
      "command": "npx",
      "args": ["-y", "@levni/levni", "mcp"]
    }
  }
}
```

If the file already has an `mcpServers` object, add `levni` next to the other servers instead of pasting a second object. Quit Claude Desktop fully and open it again. The tools appear in the tools menu of a new chat.

## Add the server to Cursor

Cursor uses the same `mcpServers` format. Save it as `.cursor/mcp.json` in your project to enable Levni for that project only, or as `mcp.json` in the `.cursor` folder of your home directory to enable it everywhere:

```json
{
  "mcpServers": {
    "levni": {
      "command": "npx",
      "args": ["-y", "@levni/levni", "mcp"]
    }
  }
}
```

Open Cursor's MCP settings and check that `levni` shows a green dot and five tools. If the dot is red, jump to the troubleshooting section below.

## Add the server to VS Code

VS Code differs in two ways: the top-level key is `servers`, not `mcpServers`, and each server states its `type`. Create `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "levni": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@levni/levni", "mcp"]
    }
  }
}
```

VS Code shows a Start button above the server entry in the file. Press it, then use Copilot Chat in agent mode and open the tools picker to confirm the five Levni tools are ticked.

## Know what each tool takes and returns

All five tools are small and have one job. This is what they accept and what you get back.

| Tool | Takes | Returns |
| --- | --- | --- |
| `scene_guide` | nothing | The scene format as text: canvas, every element type, colours, style packs. Read it once per session. |
| `list_props` | `query` (words), `category`, `limit` (default 40) | A count such as "N of 538 props match", then each prop with its variant count, category, tags and a note per variant. |
| `show_props` | `names`: an array of prop names, up to 12 | One contact image with every variant numbered, plus a text line naming them. It draws at most 18 variants. |
| `render_scene` | `scene`, optional `out` and `preview` | The critic's notes, a 560 px preview image, and with `out` a full-size `.png`, `.webp` or `.svg`. |
| `critique_scene` | `scene` | Only the critic's notes. No image, so it is the fast check inside a loop. |

Two details save time. `out` is relative to the working directory of the client, so a file you expect in your project may land elsewhere if the client was opened in another folder. And `preview` can be set to `false` for an agent that cannot see images, so it reads only the notes.

When a render is clean, the notes say `- critic: no layout problems found`. Otherwise you get up to six lines, each saying what to fix. How the critic decides is covered in [the agent layout critic](/blog/agent-layout-critic/).

## See what show_props returns

`show_props` is the tool that lets an agent choose a drawing by eye. Give it `["laptop", "robot"]` and it returns a numbered row of every variant, like this:

![A row of six hand-inked props on a paper card, labelled laptop 0, laptop 1, laptop 2, robot 0, robot 1 and robot 2](/blog/illustration-mcp-server-setup/fig-2.webp)
*The same idea as a contact image: three laptops and three robots, each variant numbered.*

The numbers are the `variant` values. To place the second robot, the agent writes `{ "type": "prop", "name": "robot", "variant": 2, "x": 600, "y": 336, "size": 300 }`. The library has 538 props in 848 variants across 15 categories, so a short search with `list_props` first keeps the contact image focused.

## Run a first test prompt

Paste this into a new chat. It touches every tool once and asks for a small result, so you know the whole chain works:

```text
Use the levni MCP server.

1. Call scene_guide and read it.
2. Call list_props with the query "laptop", then show_props for "laptop" and "robot".
3. Write a scene on a 1200 x 673 canvas: one blue panel, one large focal prop,
   one small supporting prop, no text.
4. Call render_scene with out set to levni-test/cover.webp.
5. Fix every note the critic gives and render again.
Tell me the final critic notes and where the file was saved.
```

A working setup answers with a short list of tool calls, a preview image and a path. Open the file. If it is a hand-inked picture on a blue card, you are done. The agent has everything it needs to illustrate whole articles now.

## Fix the usual problems

Most failures come from four causes.

1. **Old Node.** Levni needs Node 20 or newer. Run `node --version` in the shell your client uses. A client launched from the dock can see a different Node from your terminal.
2. **A slow first start.** `npx` downloads Levni from npm, along with `sharp`, on first run. That can take a minute, and some clients give up before the server answers. Run `npx -y @levni/levni mcp` once in a terminal to warm the cache, stop it with Ctrl+C, then restart the client.
3. **`npx` not found.** GUI apps do not always inherit your shell's PATH. Give the full path to `npx` in `command`, or run Levni from a checkout instead: `"command": "node", "args": ["/path/to/levni/bin/levni.mjs", "mcp"]`. On Windows, if the client cannot launch `npx` directly, use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@levni/levni", "mcp"]`.
4. **The file is not where you looked.** Files from `render_scene` are written relative to the client's working directory. Ask the agent to print the path from the `wrote` line, or give `out` as an absolute path.

A JSON typo in the config fails silently in some clients. If no tools appear, validate the file and restart the client fully.

## What to do next

Browse the [Levni library](/library/) to see the 538 drawings your agent will pick from, or open [the agents section](/#agents) for more setups. Once the server works, follow [the Claude Code cover guide](/blog/generate-blog-covers-claude-code/) to make your first real image, and read [how an agent checks its own layout](/blog/agent-layout-critic/) to learn what the critic's notes mean.

Related: if you publish with Ghost, the same server can add images to your drafts, see [add featured images to Ghost drafts with an AI assistant](/blog/ghost-featured-images-ai/).
