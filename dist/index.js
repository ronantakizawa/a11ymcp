#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import puppeteer from 'puppeteer';
import AxePuppeteer from '@axe-core/puppeteer';
// Import axe-core for direct API access
import * as axe from 'axe-core';
class AxeAccessibilityServer {
    server;
    constructor() {
        this.server = new Server({
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
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
                },
                {
                    name: 'get_rules',
                    description: 'Get information about available accessibility rules with optional filtering',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tags: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Filter rules by these tags (e.g., "wcag2a", "wcag2aa", "best-practice")',
                            }
                        },
                    },
                },
                {
                    name: 'check_color_contrast',
                    description: 'Check if a foreground and background color combination meets WCAG contrast requirements',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            foreground: {
                                type: 'string',
                                description: 'Foreground color in various formats (e.g., "#000000", "#000", "rgb(0,0,0)", "hsv(0,0%,0%)")',
                            },
                            background: {
                                type: 'string',
                                description: 'Background color in various formats (e.g., "#FFFFFF", "#FFF", "rgb(255,255,255)", "hsv(0,0%,100%)")',
                            },
                            fontSize: {
                                type: 'number',
                                description: 'Font size in pixels',
                                default: 16
                            },
                            isBold: {
                                type: 'boolean',
                                description: 'Whether the text is bold',
                                default: false
                            }
                        },
                        required: ['foreground', 'background'],
                    },
                },
                {
                    name: 'check_aria_attributes',
                    description: 'Check if ARIA attributes are used correctly in HTML',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            html: {
                                type: 'string',
                                description: 'HTML content to test for ARIA attribute usage',
                            }
                        },
                        required: ['html'],
                    },
                },
                {
                    name: 'check_orientation_lock',
                    description: 'Check if content forces a specific orientation',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            html: {
                                type: 'string',
                                description: 'HTML content to test for orientation lock issues',
                            }
                        },
                        required: ['html'],
                    },
                }
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                switch (request.params.name) {
                    case 'test_accessibility':
                        return await this.testAccessibility(request.params.arguments);
                    case 'test_html_string':
                        return await this.testHtmlString(request.params.arguments);
                    case 'get_rules':
                        return await this.getRules(request.params.arguments);
                    case 'check_color_contrast':
                        return await this.checkColorContrast(request.params.arguments);
                    case 'check_aria_attributes':
                        return await this.checkAriaAttributes(request.params.arguments);
                    case 'check_orientation_lock':
                        return await this.checkOrientationLock(request.params.arguments);
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('[Error] Failed to perform requested operation:', error);
                    throw new McpError(ErrorCode.InternalError, `Failed to perform requested operation: ${error.message}`);
                }
                throw error;
            }
        });
    }
    async testAccessibility(args) {
        const { url, tags } = args;
        if (!url) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: url');
        }
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            // Set a reasonable viewport
            await page.setViewport({ width: 1280, height: 800 });
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 0 });
            // Run axe analysis
            const axe = new AxePuppeteer(page);
            if (tags && tags.length > 0) {
                axe.withTags(tags);
            }
            const result = await axe.analyze();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(this.formatResults(result), null, 2),
                    },
                ],
            };
        }
        finally {
            if (browser) {
                await browser.close();
            }
        }
    }
    async testHtmlString(args) {
        const { html, tags } = args;
        if (!html) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: html');
        }
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            // Set a reasonable viewport
            await page.setViewport({ width: 1280, height: 800 });
            await page.setContent(html, { waitUntil: 'networkidle0' });
            // Run axe analysis
            const axe = new AxePuppeteer(page);
            if (tags && tags.length > 0) {
                axe.withTags(tags);
            }
            const result = await axe.analyze();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(this.formatResults(result), null, 2),
                    },
                ],
            };
        }
        finally {
            if (browser) {
                await browser.close();
            }
        }
    }
    async getRules(args) {
        const { tags } = args;
        try {
            // Get the axe rules
            let rules;
            if (tags && tags.length > 0) {
                // Filter rules by tags
                rules = axe.getRules(tags);
            }
            else {
                // Get all rules
                rules = axe.getRules();
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            rules: rules.map((rule) => ({
                                ruleId: rule.ruleId,
                                description: rule.description,
                                help: rule.help,
                                helpUrl: rule.helpUrl,
                                tags: rule.tags
                            }))
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            console.error('[Error] Failed to get rules:', error);
            throw new McpError(ErrorCode.InternalError, `Failed to get rules: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Convert various color formats to RGB values
     * Supports Hex (#RGB, #RRGGBB), RGB, HSV, and named colors
     */
    parseColor(color) {
        // Clean up the color string
        color = color.trim().toLowerCase();
        // Check if it's a hex color
        if (color.startsWith('#')) {
            // Handle #RGB format
            if (color.length === 4) {
                const r = parseInt(color[1] + color[1], 16);
                const g = parseInt(color[2] + color[2], 16);
                const b = parseInt(color[3] + color[3], 16);
                return { r, g, b };
            }
            // Handle #RRGGBB format
            else if (color.length === 7) {
                const r = parseInt(color.substring(1, 3), 16);
                const g = parseInt(color.substring(3, 5), 16);
                const b = parseInt(color.substring(5, 7), 16);
                return { r, g, b };
            }
        }
        // Check if it's an RGB color
        const rgbMatch = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1], 10);
            const g = parseInt(rgbMatch[2], 10);
            const b = parseInt(rgbMatch[3], 10);
            return { r, g, b };
        }
        // Check if it's an HSV color
        const hsvMatch = color.match(/^hsv\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)$/i);
        if (hsvMatch) {
            return this.hsvToRgb(parseInt(hsvMatch[1], 10), parseInt(hsvMatch[2], 10) / 100, parseInt(hsvMatch[3], 10) / 100);
        }
        // If we can't parse it, throw an error
        throw new Error(`Unsupported color format: ${color}. Supported formats are: #RGB, #RRGGBB, rgb(r,g,b), hsv(h,s%,v%)`);
    }
    /**
     * Convert RGB color to hex format
     */
    rgbToHex(rgb) {
        const toHex = (val) => {
            const hex = Math.round(Math.max(0, Math.min(255, val))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    }
    /**
     * Convert HSV color to RGB format
     * h: 0-360 (degrees)
     * s: 0-1 (saturation percentage)
     * v: 0-1 (value percentage)
     */
    hsvToRgb(h, s, v) {
        h = Math.max(0, Math.min(360, h));
        s = Math.max(0, Math.min(1, s));
        v = Math.max(0, Math.min(1, v));
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;
        let r = 0, g = 0, b = 0;
        if (h >= 0 && h < 60) {
            r = c;
            g = x;
            b = 0;
        }
        else if (h >= 60 && h < 120) {
            r = x;
            g = c;
            b = 0;
        }
        else if (h >= 120 && h < 180) {
            r = 0;
            g = c;
            b = x;
        }
        else if (h >= 180 && h < 240) {
            r = 0;
            g = x;
            b = c;
        }
        else if (h >= 240 && h < 300) {
            r = x;
            g = 0;
            b = c;
        }
        else if (h >= 300 && h < 360) {
            r = c;
            g = 0;
            b = x;
        }
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }
    /**
     * Calculate contrast ratio directly
     */
    calculateContrastRatio(color1, color2) {
        // Calculate luminance for a color
        const luminance = (rgb) => {
            const a = [rgb.r, rgb.g, rgb.b].map(v => {
                v /= 255;
                return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            });
            return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
        };
        const l1 = luminance(color1);
        const l2 = luminance(color2);
        // Calculate contrast ratio
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        return parseFloat(ratio.toFixed(2));
    }
    async checkColorContrast(args) {
        const { foreground, background, fontSize = 16, isBold = false } = args;
        if (!foreground || !background) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters: foreground and background colors');
        }
        let browser;
        try {
            // Parse colors to RGB values
            let fgRgb, bgRgb;
            try {
                fgRgb = this.parseColor(foreground);
                bgRgb = this.parseColor(background);
            }
            catch (error) {
                throw new McpError(ErrorCode.InvalidParams, `Color parsing error: ${error instanceof Error ? error.message : String(error)}`);
            }
            // Convert to hex for Axe engine (as that's what it uses internally)
            const fgHex = this.rgbToHex(fgRgb);
            const bgHex = this.rgbToHex(bgRgb);
            // Calculate contrast ratio directly
            const directContrastRatio = this.calculateContrastRatio(fgRgb, bgRgb);
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            // Create a simple HTML page with the specified colors
            const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              .test-element {
                color: ${fgHex};
                background-color: ${bgHex};
                font-size: ${fontSize}px;
                font-weight: ${isBold ? 'bold' : 'normal'};
                padding: 20px;
              }
            </style>
          </head>
          <body>
            <div class="test-element">Test Text</div>
          </body>
        </html>
      `;
            await page.setContent(html);
            // Run only the color-contrast rule
            const axe = new AxePuppeteer(page)
                .options({
                runOnly: {
                    type: 'rule',
                    values: ['color-contrast']
                }
            });
            const result = await axe.analyze();
            // Check if there are any violations
            const passes = result.violations.length === 0;
            // Extract contrast ratio from failure summary text
            let contrastRatio = directContrastRatio; // Use our calculated ratio as default
            let extractionMethod = 'direct-calculation';
            if (result.violations.length > 0 && result.violations[0].nodes.length > 0) {
                const failureSummary = result.violations[0].nodes[0].failureSummary || '';
                // Extract contrast ratio from failure summary using regex
                const match = failureSummary.match(/contrast ratio of ([0-9.]+)/);
                if (match && match[1]) {
                    contrastRatio = parseFloat(match[1]);
                    extractionMethod = 'axe-calculation';
                }
                // Additional inspection of violation data
                if (contrastRatio === null) {
                    // Log all properties of the first node to see if contrast data is available elsewhere
                    const node = result.violations[0].nodes[0];
                    if (node.any && node.any.length > 0) {
                        if (node.any[0].data) {
                            if (node.any[0].data.contrastRatio) {
                                contrastRatio = node.any[0].data.contrastRatio;
                                extractionMethod = 'axe-violation-data';
                            }
                        }
                    }
                }
            }
            else if (result.passes.length > 0 && result.passes[0].nodes.length > 0) {
                // Try to extract from pass data
                const node = result.passes[0].nodes[0];
                if (node.any && node.any.length > 0 && node.any[0].data && node.any[0].data.contrastRatio) {
                    contrastRatio = node.any[0].data.contrastRatio;
                    extractionMethod = 'axe-pass-data';
                }
            }
            // Determine required contrast ratios based on font size
            const isLargeText = (fontSize >= 18) || (fontSize >= 14 && isBold);
            const requiredRatioAA = isLargeText ? 3.0 : 4.5;
            const requiredRatioAAA = isLargeText ? 4.5 : 7.0;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            originalInput: {
                                foreground: foreground,
                                background: background,
                            },
                            normalizedColors: {
                                foregroundHex: fgHex,
                                backgroundHex: bgHex,
                                foregroundRgb: `rgb(${fgRgb.r}, ${fgRgb.g}, ${fgRgb.b})`,
                                backgroundRgb: `rgb(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b})`,
                            },
                            fontSize,
                            isBold,
                            contrastRatio,
                            calculationMethod: extractionMethod,
                            isLargeText,
                            passesWCAG2AA: contrastRatio !== null ? contrastRatio >= requiredRatioAA : passes,
                            requiredRatioForAA: requiredRatioAA,
                            requiredRatioForAAA: requiredRatioAAA,
                            passesWCAG2AAA: contrastRatio !== null ? contrastRatio >= requiredRatioAAA : null,
                            helpUrl: "https://dequeuniversity.com/rules/axe/4.10/color-contrast"
                        }, null, 2),
                    },
                ],
            };
        }
        finally {
            if (browser) {
                await browser.close();
            }
        }
    }
    async checkAriaAttributes(args) {
        const { html } = args;
        if (!html) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: html');
        }
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(html);
            // Run only the ARIA-related rules
            const axe = new AxePuppeteer(page)
                .options({
                runOnly: {
                    type: 'rule',
                    values: [
                        'aria-allowed-attr',
                        'aria-hidden-body',
                        'aria-required-attr',
                        'aria-required-children',
                        'aria-required-parent',
                        'aria-roles',
                        'aria-valid-attr',
                        'aria-valid-attr-value'
                    ]
                }
            });
            const result = await axe.analyze();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            violations: result.violations.map(violation => ({
                                id: violation.id,
                                impact: violation.impact,
                                description: violation.description,
                                help: violation.help,
                                helpUrl: violation.helpUrl,
                                affectedNodes: violation.nodes.map(node => ({
                                    html: node.html,
                                    target: node.target,
                                    failureSummary: node.failureSummary
                                }))
                            })),
                            passes: result.passes.map(pass => ({
                                id: pass.id,
                                description: pass.description,
                                help: pass.help,
                                nodes: pass.nodes.length
                            }))
                        }, null, 2),
                    },
                ],
            };
        }
        finally {
            if (browser) {
                await browser.close();
            }
        }
    }
    async checkOrientationLock(args) {
        const { html } = args;
        if (!html) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: html');
        }
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(html);
            // Run the orientation-lock rule (experimental in Axe)
            const axe = new AxePuppeteer(page)
                .options({
                rules: {
                    'meta-viewport': { enabled: true }
                }
            });
            const result = await axe.analyze();
            // Filter for the meta-viewport rule and orientation-related issues
            const orientationIssues = result.violations.filter(v => v.id === 'meta-viewport' &&
                v.nodes.some(n => n.html.includes('user-scalable=no') ||
                    n.html.includes('maximum-scale=1.0') ||
                    n.html.includes('orientation=portrait') ||
                    n.html.includes('orientation=landscape')));
            // Also look for CSS orientation locks
            // This requires additional checks since Axe doesn't have a specific rule for this
            const hasCssOrientationLock = await page.evaluate(() => {
                const styleSheets = Array.from(document.styleSheets);
                try {
                    for (const sheet of styleSheets) {
                        const rules = Array.from(sheet.cssRules || []);
                        for (const rule of rules) {
                            const ruleText = rule.cssText || '';
                            if (ruleText.includes('@media screen and (orientation:') ||
                                ruleText.includes('orientation:')) {
                                return true;
                            }
                        }
                    }
                }
                catch (e) {
                    // CORS issues can occur when accessing CSS rules
                    console.error('Error checking CSS:', e);
                }
                return false;
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            hasOrientationLock: orientationIssues.length > 0 || hasCssOrientationLock,
                            viewportIssues: orientationIssues.map(issue => ({
                                id: issue.id,
                                impact: issue.impact,
                                description: issue.description,
                                help: issue.help,
                                helpUrl: issue.helpUrl,
                                affectedNodes: issue.nodes.map(node => ({
                                    html: node.html,
                                    target: node.target,
                                    failureSummary: node.failureSummary
                                }))
                            })),
                            hasCssOrientationLock,
                            wcagCriteria: "WCAG 2.1 SC 1.3.4 (Orientation)",
                            helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/orientation.html"
                        }, null, 2),
                    },
                ],
            };
        }
        finally {
            if (browser) {
                await browser.close();
            }
        }
    }
    formatResults(result) {
        return {
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
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
}
const server = new AxeAccessibilityServer();
server.run().catch(console.error);
