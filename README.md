# A11y MCP Server

![image](https://github.com/user-attachments/assets/dc3af3c4-4d72-4454-b363-8f5951198675)


An MCP (Model Context Protocol) server that provides accessibility testing capabilities to Claude and other AI assistants using the Deque Axe-core API.

## Overview

This project enables AI assistants to perform automated accessibility testing on web pages and HTML content through the Model Context Protocol. It uses Puppeteer and the Axe-core library from Deque to analyze web content for WCAG compliance and identify accessibility issues.

## Features

- **Test web pages**: Test any public URL for accessibility issues
- **Test HTML snippets**: Test raw HTML strings for accessibility issues
- **WCAG compliance testing**: Check content against various WCAG standards (2.0, 2.1, 2.2)
- **Customizable tests**: Specify which accessibility tags/standards to test against

## Available Tools

### test_accessibility

Tests a URL for accessibility issues.

**Parameters:**
- `url` (required): The URL of the web page to test
- `tags` (optional): Array of WCAG tags to test against (e.g., ["wcag2aa"])
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
```
{
  "html": "<div><img src='image.jpg'></div>",
  "tags": ["wcag2aa"]
}
```

## Integration with Claude Desktop
To use this server with Claude Desktop, you need to configure it in the MCP settings:

**For macOS:**
Edit the file at `~/Library/Application Support/Claude/settings/cline_mcp_settings.json`

```
{
  "mcpServers": {
    "axe-accessibility": {
      "command": "node",
      "args": ["/path/to/axe-mcp-server/build/index.js"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

**For Windows:**
Edit the file at `%APPDATA%\Claude\settings\cline_mcp_settings.json`

**For Linux:**
Edit the file at `~/.config/Claude/settings/cline_mcp_settings.json`
Replace `/path/to/axe-mcp-server/build/index.js` with the actual path to your compiled server file.


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
