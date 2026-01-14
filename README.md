# Web Accessibility-Testing MCP Server (A11y MCP)
<a href="https://www.producthunt.com/products/web-accessibility-testing-mcp?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-web-accessibility-testing-mcp" target="_blank" rel="noopener noreferrer"><img alt="Web Accessibility Testing MCP -  Give LLMs access to web accessibility testing APIs | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1062073&amp;theme=light&amp;t=1768415232797"></a>

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/ronantakizawa-a11ymcp-badge.png)](https://mseep.ai/app/ronantakizawa-a11ymcp)

[![Verified on MseeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/01361aeb-0dce-45d6-80fb-76ff443dbfc8)

<a href="https://glama.ai/mcp/servers/@ronantakizawa/a11ymcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@ronantakizawa/a11ymcp/badge" />
</a>



https://github.com/user-attachments/assets/316c6d44-e677-433e-b4d5-63630b4bab2b




A11y MCP is an MCP (Model Context Protocol) server that gives LLMs access to web accessibility testing APIs. 

This server uses the Deque Axe-core API and Puppeteer to allow LLMs to analyze web content for WCAG compliance and identify accessibility issues.

NOTE: This is not an official MCP server from Deque Labs.

Leave a star if you enjoyed the project! 🌟



## Features

- **Test web pages**: Test any public URL for accessibility issues
- **Test HTML snippets**: Test raw HTML strings for accessibility issues
- **WCAG compliance testing**: Check content against various WCAG standards (2.0, 2.1, 2.2)
- **Customizable tests**: Specify which accessibility tags/standards to test against
- **Rule exploration**: Get information about available accessibility rules
- **Color contrast analysis**: Check color combinations for WCAG compliance
- **ARIA validation**: Test proper usage of ARIA attributes
- **Orientation lock detection**: Identify content that forces specific screen orientations

## Installation
To use this server with Claude Desktop, you need to configure it in the MCP settings:

**For macOS:**
Edit the file at `'~/Library/Application Support/Claude/claude_desktop_config.json'`

```
{
  "mcpServers": {
    "a11y-accessibility": {
    "command": "npx",
    "args": [
      "-y",
      "a11y-mcp-server"
    ]
   }
  }
}
```

**For Windows:**
Edit the file at `%APPDATA%\Claude\settings\claude_mcp_settings.json`

**For Linux:**
Edit the file at `~/.config/Claude/settings/claude_mcp_settings.json`
Replace `/path/to/axe-mcp-server/build/index.js` with the actual path to your compiled server file.


## Available Tools

### test_accessibility

Tests a URL for accessibility issues.

**Parameters:**
- `url` (required): The URL of the web page to test
- `tags` (optional): Array of WCAG tags to test against (e.g., ["wcag2aa"])

Example

```
{
 "url": "https://example.com",
 "tags": ["wcag2aa"]
}
```
### test_html_string

Tests an HTML string for accessibility issues.
Parameters:

* html (required): The HTML content to test
* tags (optional): Array of WCAG tags to test against (e.g., ["wcag2aa"])

Example

```
{
  "html": "<div><img src='image.jpg'></div>",
  "tags": ["wcag2aa"]
}
```

### get_rules

Get information about available accessibility rules with optional filtering.

### check_color_contrast

Check if a foreground and background color combination meets WCAG contrast requirements.

**Parameters:**

- `foreground` (required): Foreground color in hex format (e.g., "#000000")
- `background` (required): Background color in hex format (e.g., "#FFFFFF")
- `fontSize` (optional): Font size in pixels (default: 16)
- `isBold` (optional): Whether the text is bold (default: false)

Example

```
{
  "foreground": "#777777",
  "background": "#EEEEEE",
  "fontSize": 16,
  "isBold": false
}
```

### check_color_contrast

Check if ARIA attributes are used correctly in HTML.

**Parameters:**

- `html` (required): HTML content to test for ARIA attribute usage

Example

```
{
  "html": "<div role='button' aria-pressed='false'>Click me</div>"
}
```

### check_orientation_lock

Check if content forces a specific orientation.

**Parameters:**

- `html` (required): HTML content to test for orientation lock issues

Example

```
{
  "html": "<html><head><meta name='viewport' content='width=device-width, orientation=portrait'></head><body>Content</body></html>"
}
```

## Response Format
The server returns accessibility test results in a structured JSON format:
```
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
  },
  "testRunner": {
    "name": "axe"
  },
  "testEnvironment": {
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/135.0.0.0 Safari/537.36",
    "windowWidth": 800,
    "windowHeight": 600,
    "orientationAngle": 0,
    "orientationType": "portrait-primary"
  }
}
```

### Dependencies

- @modelcontextprotocol/sdk
- puppeteer
- @axe-core/puppeteer
- axe-core
