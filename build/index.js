#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const puppeteer_1 = __importDefault(require("puppeteer"));
const puppeteer_2 = __importDefault(require("@axe-core/puppeteer"));
class AxeAccessibilityServer {
    server;
    constructor() {
        console.error('[Setup] Initializing Axe Accessibility MCP server...');
        this.server = new index_js_1.Server({
            name: 'axe-accessibility-server',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
        this.server.onerror = (error) => console.error('[Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupToolHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'test_accessibility',
                    description: 'Test a webpage for accessibility issues using Axe-core',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            url: {
                                type: 'string',
                                description: 'URL of the webpage to test',
                            },
                            tags: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Optional array of accessibility tags to test (e.g., "wcag2a", "wcag2aa", "wcag21a")',
                                default: ['wcag2aa']
                            }
                        },
                        required: ['url'],
                    },
                },
                {
                    name: 'test_html_string',
                    description: 'Test an HTML string for accessibility issues',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            html: {
                                type: 'string',
                                description: 'HTML content to test',
                            },
                            tags: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Optional array of accessibility tags to test (e.g., "wcag2a", "wcag2aa", "wcag21a")',
                                default: ['wcag2aa']
                            }
                        },
                        required: ['html'],
                    },
                }
            ],
        }));
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            try {
                if (!['test_accessibility', 'test_html_string'].includes(request.params.name)) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
                }
                let result;
                let browser;
                try {
                    browser = await puppeteer_1.default.launch({
                        headless: true,
                        args: ['--no-sandbox', '--disable-setuid-sandbox']
                    });
                    const page = await browser.newPage();
                    if (request.params.name === 'test_accessibility') {
                        const args = request.params.arguments;
                        if (!args.url) {
                            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Missing required parameter: url');
                        }
                        console.error(`[API] Testing accessibility for URL: ${args.url}`);
                        await page.goto(args.url, { waitUntil: 'networkidle0' });
                        // Run axe analysis
                        const axe = new puppeteer_2.default(page);
                        if (args.tags && args.tags.length > 0) {
                            axe.withTags(args.tags);
                        }
                        result = await axe.analyze();
                    }
                    else {
                        // test_html_string
                        const args = request.params.arguments;
                        if (!args.html) {
                            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Missing required parameter: html');
                        }
                        console.error(`[API] Testing accessibility for HTML string`);
                        await page.setContent(args.html, { waitUntil: 'networkidle0' });
                        // Run axe analysis
                        const axe = new puppeteer_2.default(page);
                        if (args.tags && args.tags.length > 0) {
                            axe.withTags(args.tags);
                        }
                        result = await axe.analyze();
                    }
                }
                finally {
                    if (browser) {
                        await browser.close();
                    }
                }
                // Format the results
                const formattedResult = {
                    violations: result.violations.map((violation) => ({
                        id: violation.id,
                        impact: violation.impact || 'unknown',
                        description: violation.description,
                        help: violation.help,
                        helpUrl: violation.helpUrl,
                        affectedNodes: violation.nodes.map((node) => ({
                            html: node.html,
                            target: node.target,
                            failureSummary: node.failureSummary || ''
                        }))
                    })),
                    passes: result.passes.length,
                    incomplete: result.incomplete.length,
                    inapplicable: result.inapplicable.length,
                    timestamp: result.timestamp,
                    url: result.url,
                    testEngine: {
                        name: result.testEngine.name,
                        version: result.testEngine.version
                    },
                    testRunner: result.testRunner,
                    testEnvironment: result.testEnvironment,
                };
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(formattedResult, null, 2),
                        },
                    ],
                };
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('[Error] Failed to perform accessibility test:', error);
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Failed to perform accessibility test: ${error.message}`);
                }
                throw error;
            }
        });
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error('Axe Accessibility MCP server running on stdio');
    }
}
const server = new AxeAccessibilityServer();
server.run().catch(console.error);
