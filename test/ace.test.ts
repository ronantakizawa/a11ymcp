import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveAcePolicies,
  normalizeAceReport,
  runAceScan,
  type AceApi,
} from '../src/ace.js';

const emptyCounts = {
  ignored: 0,
  elements: 1,
  elementsViolation: 0,
  elementsViolationReview: 0,
  violation: 0,
  potentialviolation: 0,
  recommendation: 0,
  potentialrecommendation: 0,
  manual: 0,
  pass: 35,
};

function makeReport(overrides: Record<string, unknown> = {}) {
  return {
    results: [],
    numExecuted: 35,
    summary: {
      counts: { ...emptyCounts },
      scanTime: 24,
      ruleArchive: 'Latest Deployment (latest)',
      policies: ['WCAG_2_2'],
      reportLevels: [
        'violation',
        'potentialviolation',
        'recommendation',
        'potentialrecommendation',
        'manual',
      ],
      startScan: 1_700_000_000_000,
      URL: 'about:blank',
    },
    scanID: 'scan-1',
    toolID: 'accessibility-checker',
    label: 'unit-test',
    ...overrides,
  };
}

test('deriveAcePolicies maps the highest requested WCAG tag version', () => {
  assert.deepEqual(deriveAcePolicies(['wcag2a']), ['WCAG_2_0']);
  assert.deepEqual(deriveAcePolicies(['wcag2aa', 'wcag21aa']), ['WCAG_2_1']);
  assert.deepEqual(deriveAcePolicies(['wcag21aa', 'wcag22aa']), ['WCAG_2_2']);
  assert.deepEqual(deriveAcePolicies(['best-practice']), ['IBM_Accessibility']);
});

test('deriveAcePolicies prefers and de-duplicates explicit policies', () => {
  assert.deepEqual(
    deriveAcePolicies(['wcag22aa'], ['WCAG_2_1', 'WCAG_2_1', 'IBM_Accessibility']),
    ['WCAG_2_1', 'IBM_Accessibility'],
  );
});

test('normalizeAceReport preserves ACE levels and detailed node evidence', () => {
  const report = makeReport({
    results: [
      {
        ruleId: 'img_alt_valid',
        reasonId: 'fail_no_alt',
        message: 'The image has no alternative text.',
        level: 'violation',
        path: { DOM: '/html[1]/body[1]/img[1]', ARIA: 'img' },
        snippet: '<img src="example.png">',
        category: 'Perceivable',
        value: ['VIOLATION', 'FAIL'],
        help: 'https://able.ibm.com/rules/archives/latest/doc/en-US/img_alt_valid.html',
      },
      {
        ruleId: 'link_context_review',
        reasonId: 'potential',
        message: 'Review the link purpose.',
        level: 'potentialviolation',
        path: { DOM: '/html[1]/body[1]/a[1]' },
        snippet: '<a href="/one">Notify Me</a>',
        category: 'Operable',
        value: ['VIOLATION', 'POTENTIAL'],
      },
      {
        ruleId: 'landmark_recommendation',
        reasonId: 'recommend',
        message: 'Prefer native landmark semantics.',
        level: 'recommendation',
        path: { DOM: '/html[1]/body[1]/main[1]' },
        snippet: '<main role="main">',
        category: 'Robust',
        value: ['RECOMMENDATION', 'FAIL'],
      },
    ],
    summary: {
      ...makeReport().summary,
      counts: {
        ...emptyCounts,
        elementsViolation: 1,
        elementsViolationReview: 1,
        violation: 1,
        potentialviolation: 1,
        recommendation: 1,
        pass: 34,
      },
    },
  });

  const normalized = normalizeAceReport(report, {
    url: 'https://example.test/page',
    viewport: { width: 777, height: 555 },
  });

  assert.equal(normalized.violations.length, 1);
  assert.equal(normalized.violations[0].id, 'img_alt_valid');
  assert.equal(normalized.violations[0].level, 'violation');
  assert.equal('impact' in normalized.violations[0], false);
  assert.deepEqual(normalized.violations[0].domPath, '/html[1]/body[1]/img[1]');
  assert.deepEqual(normalized.violations[0].ariaPath, 'img');
  assert.equal(normalized.needsReview.length, 1);
  assert.equal(normalized.recommendations.length, 1);
  assert.equal(normalized.passes, 34);
  assert.equal(normalized.incomplete, 1);
  assert.equal(normalized.inapplicable, 0);
  assert.deepEqual(normalized.testEnvironment.viewport, { width: 777, height: 555 });
  assert.deepEqual(normalized.aceSummary.policies, ['WCAG_2_2']);
});

test('runAceScan serializes global ACE configuration and scans the exact page', async () => {
  let activeScans = 0;
  let maximumActiveScans = 0;
  const configuredPolicies: string[][] = [];
  const scannedPages: unknown[] = [];
  let closeCalls = 0;

  const api: AceApi = {
    async setConfig(config) {
      configuredPolicies.push([...(config.policies ?? [])]);
    },
    async getCompliance(page) {
      scannedPages.push(page);
      activeScans += 1;
      maximumActiveScans = Math.max(maximumActiveScans, activeScans);
      await new Promise((resolve) => setTimeout(resolve, 20));
      activeScans -= 1;
      return { report: makeReport() };
    },
    async close() {
      closeCalls += 1;
    },
  };

  const firstPage = {
    url: () => 'https://example.test/first',
    viewport: () => ({ width: 777, height: 555 }),
  };
  const secondPage = {
    url: () => 'https://example.test/second',
    viewport: () => ({ width: 333, height: 222 }),
  };

  const [first, second] = await Promise.all([
    runAceScan(firstPage, { tags: ['wcag22aa'] }, api),
    runAceScan(secondPage, { policies: ['WCAG_2_1'] }, api),
  ]);

  assert.equal(maximumActiveScans, 1);
  assert.deepEqual(scannedPages, [firstPage, secondPage]);
  assert.deepEqual(configuredPolicies, [['WCAG_2_2'], ['WCAG_2_1']]);
  assert.equal(closeCalls, 2);
  assert.deepEqual(first.testEnvironment.viewport, { width: 777, height: 555 });
  assert.deepEqual(second.testEnvironment.viewport, { width: 333, height: 222 });
});

