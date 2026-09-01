import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', path.resolve('src', 'index.ts')],
    stderr: 'pipe',
  });
  const client = new Client({ name: 'a11ymcp-test', version: '1.0.0' });

  try {
    await client.connect(transport);
    return await run(client);
  } finally {
    await client.close().catch(() => {});
  }
}

function parseTextResult(result: Awaited<ReturnType<Client['callTool']>>) {
  const text = result.content.find((item) => item.type === 'text');
  assert.ok(text && text.type === 'text');
  return JSON.parse(text.text);
}

test('scan tools advertise axe and ACE engine selection', { timeout: 30_000 }, async () => {
  await withClient(async (client) => {
    const response = await client.listTools();

    for (const name of ['test_accessibility', 'test_html_string']) {
      const tool = response.tools.find((candidate) => candidate.name === name);
      assert.ok(tool, `missing MCP tool ${name}`);
      assert.deepEqual(tool.inputSchema.properties?.engine?.enum, ['axe', 'ace']);
      assert.equal(tool.inputSchema.properties?.policies?.type, 'array');
    }
  });
});

test('test_html_string keeps axe as the default engine', { timeout: 60_000 }, async () => {
  await withClient(async (client) => {
    const result = await client.callTool({
      name: 'test_html_string',
      arguments: {
        html: '<!doctype html><html lang="en"><title>Fixture</title><body><img src="missing.png"></body></html>',
        tags: ['wcag2a', 'wcag2aa'],
        width: 777,
        height: 555,
      },
    });
    const parsed = parseTextResult(result);

    assert.equal(parsed.testEngine.name, 'axe-core');
    assert.ok(parsed.violations.some((violation: { id: string }) => violation.id === 'image-alt'));
    assert.equal(parsed.aceSummary, undefined);
  });
});

test('test_html_string runs ACE on the requested policy and viewport', { timeout: 90_000 }, async () => {
  await withClient(async (client) => {
    const result = await client.callTool({
      name: 'test_html_string',
      arguments: {
        html: '<!doctype html><html lang="en"><title>Fixture</title><body><img src="missing.png"></body></html>',
        engine: 'ace',
        policies: ['WCAG_2_2'],
        width: 777,
        height: 555,
      },
    });
    const parsed = parseTextResult(result);

    assert.equal(parsed.testEngine.name, 'accessibility-checker');
    assert.deepEqual(parsed.aceSummary.policies, ['WCAG_2_2']);
    assert.deepEqual(parsed.testEnvironment.viewport, { width: 777, height: 555 });
    assert.ok(parsed.violations.some((violation: { id: string }) => violation.id === 'img_alt_valid'));
  });
});

