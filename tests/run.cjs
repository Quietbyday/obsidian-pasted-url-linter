/**
 * Node unit-test harness for the pure logic modules.
 *
 * Run via `npm test`, which first compiles the TypeScript sources to
 * `tests/dist/` (CommonJS) with `tsc`, then executes this file. esbuild's
 * native binary can't run in every sandbox, so we compile with `tsc` here and
 * require the emitted JS directly.
 *
 * `settings.js` imports the `obsidian` module (types-only at runtime), so we
 * redirect that bare import to a small stub before requiring anything.
 */
'use strict';

const assert = require('assert');
const path = require('path');
const Module = require('module');

// Redirect `require('obsidian')` to the local stub.
const stubPath = require.resolve('./obsidian-stub.cjs');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
	if (request === 'obsidian') {
		return stubPath;
	}
	return origResolve.call(this, request, ...args);
};

const dist = (p) => path.join(__dirname, 'dist', p);

const { cleanTrackingParams, cleanAmazonUrl, cleanHashFragment } = require(dist(
	'utils/urlCleaners.js'
));
const { isTrackingParam } = require(dist('utils/trackingParams.js'));
const { transformPaste } = require(dist('utils/transform.js'));
const { migrateSettings, DEFAULT_SETTINGS } = require(dist('settings.js'));

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
	try {
		fn();
		passed++;
	} catch (err) {
		failed++;
		failures.push({ name, err });
	}
}

const settings = (overrides = {}) => ({ ...DEFAULT_SETTINGS, ...overrides });

// ─────────────────────────────────────────────────────────────────────────
// Rule A — tracking parameters
// ─────────────────────────────────────────────────────────────────────────

test('KiwiCo: strips 3 utm params, KEEPS #body anchor', () => {
	const input =
		'https://www.kiwico.com/diy/stem/motion-mechanics/rubber-band-powered-cup-launcher?utm_content=sub&utm_campaign=NP-EOTW&utm_source=blast#body';
	const { url, removedCount } = cleanTrackingParams(input);
	assert.strictEqual(
		url,
		'https://www.kiwico.com/diy/stem/motion-mechanics/rubber-band-powered-cup-launcher#body'
	);
	assert.strictEqual(removedCount, 3);
});

test('Ad IDs: gclid/fbclid/igshid all removed', () => {
	const { url, removedCount } = cleanTrackingParams(
		'https://news.site/article?gclid=abc&fbclid=xyz&igshid=123'
	);
	assert.strictEqual(url, 'https://news.site/article');
	assert.strictEqual(removedCount, 3);
});

test('Mixed query: keeps non-tracking params (q, page)', () => {
	const { url, removedCount } = cleanTrackingParams(
		'https://shop.example.com/search?q=cups&utm_source=x&page=2'
	);
	assert.strictEqual(url, 'https://shop.example.com/search?q=cups&page=2');
	assert.strictEqual(removedCount, 1);
});

test('Novel utm_* caught by prefix match', () => {
	const { url, removedCount } = cleanTrackingParams(
		'https://e.com/p?utm_somethingnew=1'
	);
	assert.strictEqual(url, 'https://e.com/p');
	assert.strictEqual(removedCount, 1);
});

test('Case-insensitive: UTM_Source removed', () => {
	const { url, removedCount } = cleanTrackingParams('https://e.com/p?UTM_Source=x');
	assert.strictEqual(url, 'https://e.com/p');
	assert.strictEqual(removedCount, 1);
});

test('Generic names ref/tag/source removed', () => {
	const { url, removedCount } = cleanTrackingParams(
		'https://e.com/p?ref=a&tag=b&source=c'
	);
	assert.strictEqual(url, 'https://e.com/p');
	assert.strictEqual(removedCount, 3);
});

test('No-op when nothing to remove', () => {
	const input = 'https://e.com/p?q=1';
	const { url, removedCount } = cleanTrackingParams(input);
	assert.strictEqual(url, input);
	assert.strictEqual(removedCount, 0);
});

test('Unparseable input returned unchanged', () => {
	const { url, removedCount } = cleanTrackingParams('not a url');
	assert.strictEqual(url, 'not a url');
	assert.strictEqual(removedCount, 0);
});

// ─────────────────────────────────────────────────────────────────────────
// Fragments
// ─────────────────────────────────────────────────────────────────────────

test('Fragment: plain #section-1 preserved', () => {
	const input = 'https://e.com/p#section-1';
	assert.strictEqual(cleanTrackingParams(input).url, input);
});

test('Fragment: SPA route #/dashboard preserved', () => {
	const input = 'https://e.com/p#/dashboard';
	assert.strictEqual(cleanTrackingParams(input).url, input);
});

test('Fragment: encoded #utm_source%3D… removed entirely', () => {
	const { url, removedCount } = cleanTrackingParams(
		'https://e.com/page#utm_source%3Dgoogle'
	);
	assert.strictEqual(url, 'https://e.com/page');
	assert.strictEqual(removedCount, 1);
});

test('Fragment: mixed encoded keeps real part (page=1)', () => {
	const { url, removedCount } = cleanTrackingParams(
		'https://e.com/page#utm_source%3Dgoogle%26page%3D1'
	);
	assert.strictEqual(url, 'https://e.com/page#page=1');
	assert.strictEqual(removedCount, 1);
});

test('cleanHashFragment: anchor?params (hash routing) preserved', () => {
	const res = cleanHashFragment('product-reviews?sort=new');
	assert.strictEqual(res.hash, 'product-reviews?sort=new');
	assert.strictEqual(res.removed, 0);
});

// ─────────────────────────────────────────────────────────────────────────
// Rule B — Amazon
// ─────────────────────────────────────────────────────────────────────────

test('Amazon: /dp/<ASIN>/ref=… truncated to /dp/<ASIN>', () => {
	assert.strictEqual(
		cleanAmazonUrl(
			'https://www.amazon.ca/Strange-Houses-Novel-Uketsu/dp/006343315X/ref=asc_df_006343315X?mcid=0377&tag=googleshopc0c-20'
		),
		'https://www.amazon.ca/Strange-Houses-Novel-Uketsu/dp/006343315X'
	);
});

test('Amazon: /gp/product/<ASIN> truncated', () => {
	assert.strictEqual(
		cleanAmazonUrl('https://www.amazon.com/gp/product/B08N5WRWNW/ref=xyz?tag=a'),
		'https://www.amazon.com/gp/product/B08N5WRWNW'
	);
});

test('Amazon: .co.uk host handled', () => {
	assert.strictEqual(
		cleanAmazonUrl('https://www.amazon.co.uk/dp/B01ABCDEFG/ref=abc'),
		'https://www.amazon.co.uk/dp/B01ABCDEFG'
	);
});

test('Amazon: already-canonical is a no-op', () => {
	const input = 'https://www.amazon.com/dp/B01ABCDEFG';
	assert.strictEqual(cleanAmazonUrl(input), input);
});

test('Amazon: non-Amazon host untouched', () => {
	const input = 'https://example.com/dp/B01ABCDEFG/ref=x';
	assert.strictEqual(cleanAmazonUrl(input), input);
});

test('Amazon: missing ASIN falls back to /ref= cut', () => {
	assert.strictEqual(
		cleanAmazonUrl('https://www.amazon.com/some/path/ref=xyz?foo=bar'),
		'https://www.amazon.com/some/path'
	);
});

// ─────────────────────────────────────────────────────────────────────────
// isTrackingParam sanity
// ─────────────────────────────────────────────────────────────────────────

test('isTrackingParam: exact, prefix, and negatives', () => {
	assert.ok(isTrackingParam('gclid'));
	assert.ok(isTrackingParam('UTM_Medium')); // case-insensitive
	assert.ok(isTrackingParam('mtm_anything')); // prefix
	assert.ok(!isTrackingParam('q'));
	assert.ok(!isTrackingParam('page'));
});

// ─────────────────────────────────────────────────────────────────────────
// transform / toggles
// ─────────────────────────────────────────────────────────────────────────

test('transform: YouTube timestamp still works', () => {
	const out = transformPaste('https://youtu.be/49V-5Ock8LU?t=115', settings());
	assert.deepStrictEqual(out, {
		result: '[1:55](https://youtu.be/49V-5Ock8LU?t=115)',
		notice: 'Linked YouTube timestamp',
	});
});

test('transform: markdown tracking link → count notice', () => {
	const out = transformPaste(
		'[KiwiCo](https://www.kiwico.com/x?utm_content=sub&utm_campaign=a&utm_source=b#body)',
		settings()
	);
	assert.strictEqual(out.result, '[KiwiCo](https://www.kiwico.com/x#body)');
	assert.strictEqual(out.notice, 'Removed 3 tracking parameters');
});

test('transform: singular parameter notice', () => {
	const out = transformPaste(
		'[x](https://e.com/p?utm_source=a&keep=1)',
		settings()
	);
	assert.strictEqual(out.result, '[x](https://e.com/p?keep=1)');
	assert.strictEqual(out.notice, 'Removed 1 tracking parameter');
});

test('transform: Amazon markdown link → "Cleaned Amazon link"', () => {
	const out = transformPaste(
		'[Book](https://www.amazon.ca/Strange/dp/006343315X/ref=asc?tag=x)',
		settings()
	);
	assert.strictEqual(out.result, '[Book](https://www.amazon.ca/Strange/dp/006343315X)');
	assert.strictEqual(out.notice, 'Cleaned Amazon link');
});

test('transform: stripTrackingParams OFF → tracking link untouched', () => {
	const out = transformPaste(
		'[x](https://e.com/p?utm_source=a)',
		settings({ stripTrackingParams: false, cleanAmazonLinks: false })
	);
	assert.strictEqual(out, null);
});

test('transform: cleanAmazonLinks OFF → amazon link untouched by path rule', () => {
	// Params still stripped (tag), but path/ref kept since Amazon rule is off.
	const out = transformPaste(
		'[x](https://www.amazon.ca/Strange/dp/006343315X/ref=asc?tag=x)',
		settings({ cleanAmazonLinks: false })
	);
	// tag removed from query, but /ref= path stays.
	assert.strictEqual(
		out.result,
		'[x](https://www.amazon.ca/Strange/dp/006343315X/ref=asc)'
	);
	assert.strictEqual(out.notice, 'Removed 1 tracking parameter');
});

test('transform: bare URL untouched when toggle OFF', () => {
	const out = transformPaste('https://e.com/p?utm_source=a', settings());
	assert.strictEqual(out, null);
});

test('transform: bare URL cleaned when toggle ON', () => {
	const out = transformPaste(
		'https://e.com/p?utm_source=a',
		settings({ cleanBareUrls: true })
	);
	assert.strictEqual(out.result, 'https://e.com/p');
	assert.strictEqual(out.notice, 'Removed 1 tracking parameter');
});

test('transform: non-URL text returns null', () => {
	assert.strictEqual(transformPaste('just some words', settings()), null);
});

// ─────────────────────────────────────────────────────────────────────────
// settings migration
// ─────────────────────────────────────────────────────────────────────────

test('migrate: old keys carried over, old keys removed, flagged', () => {
	const { settings: s, migrated } = migrateSettings({
		youtubeTimestamp: true,
		stripUtm: false,
		stripAmazonRef: true,
		cleanBareUrls: false,
	});
	assert.strictEqual(migrated, true);
	assert.strictEqual(s.stripTrackingParams, false);
	assert.strictEqual(s.cleanAmazonLinks, true);
	assert.ok(!('stripUtm' in s));
	assert.ok(!('stripAmazonRef' in s));
});

test('migrate: new keys already present → no migration', () => {
	const { migrated } = migrateSettings({
		youtubeTimestamp: true,
		stripTrackingParams: true,
		cleanAmazonLinks: true,
		cleanBareUrls: false,
	});
	assert.strictEqual(migrated, false);
});

test('migrate: null/undefined raw → empty, not migrated', () => {
	assert.deepStrictEqual(migrateSettings(null), {
		settings: {},
		migrated: false,
	});
	assert.deepStrictEqual(migrateSettings(undefined), {
		settings: {},
		migrated: false,
	});
});

test('migrate result merges onto defaults correctly', () => {
	const { settings: s } = migrateSettings({ stripUtm: false });
	const merged = { ...DEFAULT_SETTINGS, ...s };
	assert.strictEqual(merged.stripTrackingParams, false);
	assert.strictEqual(merged.cleanAmazonLinks, true); // default kept
});

// ─────────────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) {
	for (const { name, err } of failures) {
		console.error(`✗ ${name}`);
		console.error(`  ${err.message}\n`);
	}
	process.exit(1);
}
