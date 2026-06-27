/**
 * dependency-cruiser config — enforces the SPEC §Project Structure boundaries
 * so the architecture stays legible (run via `npm run graph`, gated in CI).
 *
 * Hard rule (SPEC): logic lives in plain .ts under src/lib; .svelte files stay
 * presentational. The lib layers must not depend "upward" on routes/components.
 */
module.exports = {
	forbidden: [
		{
			name: 'no-circular',
			severity: 'error',
			comment: 'Circular dependencies make the graph unreadable and break tree-shaking.',
			from: {},
			to: { circular: true }
		},
		{
			name: 'spectrum-is-pure',
			severity: 'error',
			comment: 'src/lib/spectrum is pure math — no Svelte, no DOM, no app state.',
			from: { path: '^src/lib/spectrum' },
			to: { path: '\\.svelte$|^src/lib/(state|components)|^src/routes' }
		},
		{
			name: 'data-is-pure',
			severity: 'error',
			comment: 'src/lib/data must not depend on UI, state, or routes.',
			from: { path: '^src/lib/data' },
			to: { path: '\\.svelte$|^src/lib/(state|components)|^src/routes' }
		},
		{
			name: 'no-orphans',
			severity: 'warn',
			comment: 'Unused modules are usually dead code.',
			from: { orphan: true, pathNot: ['\\.d\\.ts$', '(^|/)\\.[^/]+\\.(cjs|js|ts)$'] },
			to: {}
		}
	],
	options: {
		doNotFollow: { path: 'node_modules' },
		tsConfig: { fileName: 'tsconfig.json' },
		tsPreCompilationDeps: true,
		enhancedResolveOptions: {
			extensions: ['.ts', '.js', '.svelte'],
			conditionNames: ['import', 'require', 'svelte', 'browser', 'default']
		},
		reporterOptions: {
			dot: { collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)' }
		}
	}
};
