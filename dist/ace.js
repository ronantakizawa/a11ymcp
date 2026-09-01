import * as accessibilityChecker from 'accessibility-checker';
const ACE_ENGINE_VERSION = '4.0.31';
const DEFAULT_POLICY = 'IBM_Accessibility';
const REPORT_LEVELS = [
    'violation',
    'potentialviolation',
    'recommendation',
    'potentialrecommendation',
    'manual',
];
const defaultAceApi = {
    setConfig: (config) => accessibilityChecker.setConfig(config),
    getCompliance: (page, label) => accessibilityChecker.getCompliance(page, label),
    close: () => accessibilityChecker.close(),
};
let aceQueue = Promise.resolve();
function uniqueNonEmpty(values) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
export function deriveAcePolicies(tags = [], policies = []) {
    const explicitPolicies = uniqueNonEmpty(policies);
    if (explicitPolicies.length > 0) {
        return explicitPolicies;
    }
    const normalizedTags = tags.map((tag) => tag.trim().toLowerCase());
    if (normalizedTags.some((tag) => tag.startsWith('wcag22'))) {
        return ['WCAG_2_2'];
    }
    if (normalizedTags.some((tag) => tag.startsWith('wcag21'))) {
        return ['WCAG_2_1'];
    }
    if (normalizedTags.some((tag) => tag.startsWith('wcag2'))) {
        return ['WCAG_2_0'];
    }
    return [DEFAULT_POLICY];
}
function normalizeIssue(issue) {
    const domPath = issue.path?.DOM ?? issue.path?.dom;
    const ariaPath = issue.path?.ARIA ?? issue.path?.aria;
    return {
        id: issue.ruleId ?? 'unknown',
        ruleId: issue.ruleId ?? 'unknown',
        reasonId: issue.reasonId ?? null,
        message: issue.message ?? '',
        description: issue.message ?? '',
        level: issue.level ?? 'unknown',
        domPath: domPath ?? null,
        ariaPath: ariaPath ?? null,
        paths: issue.path ?? {},
        snippet: issue.snippet ?? '',
        category: issue.category ?? null,
        value: issue.value ?? null,
        bounds: issue.bounds ?? null,
        source: issue.source ?? null,
        helpUrl: issue.help ?? null,
        affectedNodes: [
            {
                html: issue.snippet ?? '',
                target: domPath ? [domPath] : [],
                ariaPath: ariaPath ?? null,
                failureSummary: issue.message ?? '',
            },
        ],
    };
}
export function normalizeAceReport(report, context) {
    const aceReport = report;
    if (aceReport.details && !aceReport.results) {
        throw new Error(`ACE scan failed: ${JSON.stringify(aceReport.details)}`);
    }
    const issues = (aceReport.results ?? []).map(normalizeIssue);
    const counts = aceReport.summary?.counts ?? {};
    const startScan = aceReport.summary?.startScan;
    return {
        violations: issues.filter((issue) => issue.level === 'violation'),
        needsReview: issues.filter((issue) => ['potentialviolation', 'potentialrecommendation', 'manual'].includes(issue.level)),
        recommendations: issues.filter((issue) => issue.level === 'recommendation'),
        passes: counts.pass ?? 0,
        incomplete: (counts.potentialviolation ?? 0) + (counts.manual ?? 0),
        inapplicable: 0,
        timestamp: startScan ? new Date(startScan).toISOString() : new Date().toISOString(),
        url: context.url || aceReport.summary?.URL || 'about:blank',
        testEngine: {
            name: 'accessibility-checker',
            version: ACE_ENGINE_VERSION,
        },
        testRunner: {
            name: 'a11ymcp',
            version: '1.1.0',
        },
        testEnvironment: {
            viewport: context.viewport,
        },
        aceSummary: {
            counts,
            numExecuted: aceReport.numExecuted ?? 0,
            scanTime: aceReport.summary?.scanTime ?? null,
            startScan: startScan ?? null,
            ruleArchive: aceReport.summary?.ruleArchive ?? null,
            policies: aceReport.summary?.policies ?? [],
            reportLevels: aceReport.summary?.reportLevels ?? [],
            scanID: aceReport.scanID ?? null,
            toolID: aceReport.toolID ?? null,
            label: aceReport.label ?? null,
        },
    };
}
function enqueueAceScan(work) {
    const result = aceQueue.then(work, work);
    aceQueue = result.then(() => undefined, () => undefined);
    return result;
}
export function runAceScan(page, options = {}, api = defaultAceApi) {
    return enqueueAceScan(async () => {
        const policies = deriveAcePolicies(options.tags, options.policies);
        const label = options.label ?? `a11ymcp-${Date.now()}`;
        let checkerResult;
        try {
            await api.setConfig({
                ruleArchive: 'latest',
                policies,
                reportLevels: [...REPORT_LEVELS],
                outputFormat: ['disable'],
            });
            checkerResult = await api.getCompliance(page, label);
        }
        finally {
            await api.close();
        }
        return normalizeAceReport(checkerResult.report, {
            url: page.url(),
            viewport: page.viewport(),
        });
    });
}
