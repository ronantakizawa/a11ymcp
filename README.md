# Web Accessibility-Testing MCP Server (A11y MCP)

<a href="https://www.producthunt.com/products/web-accessibility-testing-mcp?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-web-accessibility-testing-mcp" target="_blank" rel="noopener noreferrer"><img alt="Web Accessibility Testing MCP - Give LLMs access to web accessibility testing APIs | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1062073&theme=light&t=1768415232797"></a>

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/ronantakizawa-a11ymcp-badge.png)](https://mseep.ai/app/ronantakizawa-a11ymcp)

[![Verified on MseeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/01361aeb-0dce-45d6-80fb-76ff443dbfc8)

<a href="https://glama.ai/mcp/servers/@ronantakizawa/a11ymcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@ronantakizawa/a11ymcp/badge" />
</a>

https://github.com/user-attachments/assets/316c6d44-e677-433e-b4d5-63630b4bab2b

A11y MCP is an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that gives LLMs access to web accessibility testing APIs.

This server uses the [Deque Axe-core](https://github.com/dequelabs/axe-core) API and [Puppeteer](https://pptr.dev/) to allow LLMs to analyze web content for WCAG compliance and identify accessibility issues.

> **Note:** This is not an official MCP server from Deque Labs.

## Features

- **Test web pages**: Test any public URL for accessibility issues with customizable viewport dimensions
- **Test HTML snippets**: Test raw HTML strings for accessibility issues
- **WCAG compliance testing**: Check content against various WCAG standards (2.0, 2.1, 2.2)
- **Customizable tests**: Specify which accessibility tags/standards to test against
- **Rule exploration**: Get information about available accessibility rules
- **Color contrast analysis**: Check color combinations for WCAG compliance
- **ARIA validation**: Test proper usage of ARIA attributes
- **Orientation lock detection**: Identify content that forces specific screen orientations

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- An MCP-compatible client (Claude Desktop, Claude Code, VS Code, Cursor, etc.)

### Claude Desktop

Edit your MCP configuration file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

Add the server to the `mcpServers` object:

```json
{
  "mcpServers": {
    "a11y-accessibility": {
      "command": "npx",
      "args": ["-y", "a11y-mcp-server"]
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add a11y-accessibility -- npx -y a11y-mcp-server
```

This registers the server for the current project. To make it available across all projects:

```bash
claude mcp add --scope user a11y-accessibility -- npx -y a11y-mcp-server
```

Verify the server is registered:

```bash
claude mcp list
```

> **Note:** MCP tools become available after restarting your Claude Code session.

### VS Code (Copilot)

Add to your VS Code `settings.json` or `.vscode/settings.json`:

```json
{
  "mcp": {
    "servers": {
      "a11y-accessibility": {
        "command": "npx",
        "args": ["-y", "a11y-mcp-server"]
      }
    }
  }
}
```

### Cursor

Add to your Cursor MCP configuration (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "a11y-accessibility": {
      "command": "npx",
      "args": ["-y", "a11y-mcp-server"]
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP configuration (`~/.codeium/windsurf/mcp_config.json`):

```json
{
  "mcpServers": {
    "a11y-accessibility": {
      "command": "npx",
      "args": ["-y", "a11y-mcp-server"]
    }
  }
}
```

## Available Tools

### test_accessibility

Tests a URL for accessibility issues.

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `url` | Yes | The URL of the web page to test |
| `tags` | No | Array of WCAG tags to test against (e.g., `["wcag2aa"]`) |
| `width` | No | Viewport width in pixels (default: 1280) |
| `height` | No | Viewport height in pixels (default: 800) |

**Example — desktop viewport (default):**

```json
{
  "url": "https://example.com",
  "tags": ["wcag2aa"]
}
```

**Example — mobile viewport (iPhone 12/13):**

```json
{
  "url": "https://example.com",
  "tags": ["wcag2aa"],
  "width": 390,
  "height": 844
}
```

### test_html_string

Tests an HTML string for accessibility issues.

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `html` | Yes | The HTML content to test |
| `tags` | No | Array of WCAG tags to test against (e.g., `["wcag2aa"]`) |
| `width` | No | Viewport width in pixels (default: 1280) |
| `height` | No | Viewport height in pixels (default: 800) |

**Example — default viewport:**

```json
{
  "html": "<div><img src='image.jpg'></div>",
  "tags": ["wcag2aa"]
}
```

**Example — mobile viewport:**

```json
{
  "html": "<div><img src='image.jpg'></div>",
  "tags": ["wcag2aa"],
  "width": 375,
  "height": 812
}
```

### get_rules

Get information about available accessibility rules with optional filtering. Returns an array of rule objects, each containing `ruleId`, `description`, `help`, `helpUrl`, and `tags`.

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `tags` | No | Filter rules by tags (e.g., `["wcag2a", "wcag2aa", "best-practice"]`) |

**Example — filter rules by WCAG 2.1 AA:**

```json
{
  "tags": ["wcag21aa"]
}
```

**Example — get all rules (no filter):**

```json
{}
```

### check_color_contrast

Check if a foreground and background color combination meets WCAG contrast requirements.

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `foreground` | Yes | Foreground color (e.g., `"#000000"`, `"rgb(0,0,0)"`) |
| `background` | Yes | Background color (e.g., `"#FFFFFF"`, `"rgb(255,255,255)"`) |
| `fontSize` | No | Font size in pixels (default: 16) |
| `isBold` | No | Whether the text is bold (default: false) |

**Example:**

```json
{
  "foreground": "#777777",
  "background": "#EEEEEE",
  "fontSize": 16,
  "isBold": false
}
```

### check_aria_attributes

Check if ARIA attributes are used correctly in HTML.

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `html` | Yes | HTML content to test for ARIA attribute usage |

**Example:**

```json
{
  "html": "<div role='button' aria-pressed='false'>Click me</div>"
}
```

### check_orientation_lock

Check if content forces a specific orientation.

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `html` | Yes | HTML content to test for orientation lock issues |

**Example:**

```json
{
  "html": "<html><head><meta name='viewport' content='width=device-width, orientation=portrait'></head><body>Content</body></html>"
}
```

## Response Format

The server returns accessibility test results in structured JSON:

```json
{
  "violations": [
    {
      "id": "color-contrast",
      "impact": "serious",
      "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
      "help": "Elements must meet minimum color contrast ratio thresholds",
      "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
      "affectedNodes": [
        {
          "html": "<div style=\"color: #aaa; background-color: #eee;\">Low contrast text</div>",
          "target": ["div"],
          "failureSummary": "Fix any of the following: Element has insufficient color contrast of 1.98 (foreground color: #aaa, background color: #eee, font size: 12.0pt, font weight: normal)"
        }
      ]
    }
  ],
  "passes": 1,
  "incomplete": 0,
  "inapplicable": 2,
  "timestamp": "2025-04-25T16:45:33.655Z",
  "url": "about:blank",
  "testEngine": {
    "name": "axe-core",
    "version": "4.10.3"
  }
}
```

## WCAG Tags Reference

Common tags you can use with the `tags` parameter:

| Tag | Description |
|-----|-------------|
| `wcag2a` | WCAG 2.0 Level A |
| `wcag2aa` | WCAG 2.0 Level AA |
| `wcag2aaa` | WCAG 2.0 Level AAA |
| `wcag21a` | WCAG 2.1 Level A |
| `wcag21aa` | WCAG 2.1 Level AA |
| `wcag22aa` | WCAG 2.2 Level AA |
| `best-practice` | Best practices (not strictly WCAG) |

## Dependencies

- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk)
- [puppeteer](https://pptr.dev/)
- [@axe-core/puppeteer](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/puppeteer)
- [axe-core](https://github.com/dequelabs/axe-core)

## License

MIT
