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
const { stripNotificationCount } = require(dist('utils/linkTitle.js'));
const { parseDomainList, domainMatches } = require(dist('utils/domainList.js'));
const { transformPaste, transformText } = require(dist('utils/transform.js'));
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
// Rule C — notification counts (stripNotificationCount)
// ─────────────────────────────────────────────────────────────────────────

test('count: leading (14) stripped', () => {
	const r = stripNotificationCount('(14) Home / X');
	assert.strictEqual(r.title, 'Home / X');
	assert.strictEqual(r.changed, true);
});

test('count: leading (20+) stripped', () => {
	const r = stripNotificationCount('(20+) Facebook');
	assert.strictEqual(r.title, 'Facebook');
	assert.strictEqual(r.changed, true);
});

test('count: leading (8) stripped', () => {
	const r = stripNotificationCount('(8) YouTube');
	assert.strictEqual(r.title, 'YouTube');
	assert.strictEqual(r.changed, true);
});

test('count: embedded Gmail (47) stripped, single space kept', () => {
	const r = stripNotificationCount(
		'Inbox (47) - quietbyday@gmail.com - Gmail'
	);
	assert.strictEqual(r.title, 'Inbox - quietbyday@gmail.com - Gmail');
	assert.strictEqual(r.changed, true);
});

test('count: embedded token at end trimmed cleanly', () => {
	const r = stripNotificationCount('Messages (5)');
	assert.strictEqual(r.title, 'Messages');
	assert.strictEqual(r.changed, true);
});

test('count: only the first (leading) count removed', () => {
	const r = stripNotificationCount('(3) Foo (5)');
	assert.strictEqual(r.title, 'Foo (5)');
	assert.strictEqual(r.changed, true);
});

test('count: 4-digit year (2049) is NOT a count', () => {
	const r = stripNotificationCount('Blade Runner (2049)');
	assert.strictEqual(r.title, 'Blade Runner (2049)');
	assert.strictEqual(r.changed, false);
});

test('count: 4-digit year (2023) is NOT a count', () => {
	const r = stripNotificationCount('Report (2023)');
	assert.strictEqual(r.title, 'Report (2023)');
	assert.strictEqual(r.changed, false);
});

test('count: number glued to text is NOT stripped', () => {
	const r = stripNotificationCount('abc(3)def');
	assert.strictEqual(r.title, 'abc(3)def');
	assert.strictEqual(r.changed, false);
});

test('count: no count is a no-op', () => {
	const r = stripNotificationCount('Just a title');
	assert.strictEqual(r.title, 'Just a title');
	assert.strictEqual(r.changed, false);
});

test('count: max 3-digit count (999) stripped', () => {
	const r = stripNotificationCount('(999) Notifications');
	assert.strictEqual(r.title, 'Notifications');
	assert.strictEqual(r.changed, true);
});

test('count: 4-digit count (1000) not stripped', () => {
	const r = stripNotificationCount('(1000) Notifications');
	assert.strictEqual(r.title, '(1000) Notifications');
	assert.strictEqual(r.changed, false);
});

test('transform: markdown title count → title-only notice', () => {
	const out = transformPaste('[(14) Home / X](https://x.com/home)', settings());
	assert.strictEqual(out.result, '[Home / X](https://x.com/home)');
	assert.strictEqual(out.notice, 'Removed notification count');
});

test('transform: Gmail embedded count stripped', () => {
	const out = transformPaste(
		'[Inbox (47) - quietbyday@gmail.com - Gmail](https://mail.google.com/mail/u/0/#inbox)',
		settings()
	);
	assert.strictEqual(
		out.result,
		'[Inbox - quietbyday@gmail.com - Gmail](https://mail.google.com/mail/u/0/#inbox)'
	);
	assert.strictEqual(out.notice, 'Removed notification count');
});

test('transform: title count + tracking param → combined notice', () => {
	const out = transformPaste(
		'[(3) News](https://e.com/p?utm_source=a&keep=1)',
		settings({ notificationCountDomains: 'e.com' })
	);
	assert.strictEqual(out.result, '[News](https://e.com/p?keep=1)');
	assert.strictEqual(
		out.notice,
		'Removed notification count · Removed 1 tracking parameter'
	);
});

test('transform: stripNotificationCounts OFF → title kept', () => {
	const out = transformPaste(
		'[(14) Home / X](https://x.com/home)',
		settings({ stripNotificationCounts: false })
	);
	assert.strictEqual(out, null);
});

test('transform: year in title NOT stripped (whitelisted domain)', () => {
	const out = transformPaste(
		'[Blade Runner (2049)](https://x.com/movie)',
		settings()
	);
	assert.strictEqual(out, null);
});

// ─────────────────────────────────────────────────────────────────────────
// Domain lists — whitelist (notification) + exceptions (trackers)
// ─────────────────────────────────────────────────────────────────────────

test('domainList: parse handles commas, newlines, www, scheme, paths', () => {
	assert.deepStrictEqual(
		parseDomainList('x.com, www.facebook.com\nhttps://mail.google.com/inbox'),
		['x.com', 'facebook.com', 'mail.google.com']
	);
});

test('domainList: empty / whitespace-only → empty array', () => {
	assert.deepStrictEqual(parseDomainList(''), []);
	assert.deepStrictEqual(parseDomainList('  ,\n , '), []);
});

test('domainList: match is subdomain-inclusive, empty never matches', () => {
	assert.ok(domainMatches('https://x.com/home', ['x.com']));
	assert.ok(domainMatches('https://www.x.com/home', ['x.com']));
	assert.ok(domainMatches('https://mail.google.com/u/0', ['google.com']));
	assert.ok(!domainMatches('https://notx.com/home', ['x.com']));
	assert.ok(!domainMatches('https://x.com/home', []));
});

test('transform: count NOT stripped on non-whitelisted domain', () => {
	const out = transformPaste('[(14) Home](https://not-listed.com/home)', settings());
	assert.strictEqual(out, null);
});

test('transform: empty whitelist strips nowhere', () => {
	const out = transformPaste(
		'[(14) Home / X](https://x.com/home)',
		settings({ notificationCountDomains: '' })
	);
	assert.strictEqual(out, null);
});

test('transform: tracking params skipped for excepted domain', () => {
	const out = transformPaste(
		'[Search](https://e.com/search?q=cups&utm_source=a)',
		settings({ trackingParamExceptions: 'e.com' })
	);
	assert.strictEqual(out, null);
});

test('transform: exception is subdomain-inclusive', () => {
	const out = transformPaste(
		'[Search](https://shop.e.com/search?utm_source=a)',
		settings({ trackingParamExceptions: 'e.com' })
	);
	assert.strictEqual(out, null);
});

test('transform: unlisted domain still cleaned when exceptions set', () => {
	const out = transformPaste(
		'[x](https://other.com/p?utm_source=a&keep=1)',
		settings({ trackingParamExceptions: 'e.com' })
	);
	assert.strictEqual(out.result, '[x](https://other.com/p?keep=1)');
	assert.strictEqual(out.notice, 'Removed 1 tracking parameter');
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
// transformText — bulleted, multi-line, inline, multiple links (Issues 1–3)
// ─────────────────────────────────────────────────────────────────────────

test('multiline: bulleted markdown link is linted in place (Issue 1)', () => {
	const out = transformText(
		'- [KiwiCo](https://www.kiwico.com/x?utm_source=b)',
		settings()
	);
	assert.strictEqual(out.result, '- [KiwiCo](https://www.kiwico.com/x)');
	assert.strictEqual(out.notice, 'Removed 1 tracking parameter');
});

test('multiline: indented bullet keeps leading whitespace', () => {
	const out = transformText(
		'    - [x](https://e.com/p?utm_source=a&keep=1)',
		settings()
	);
	assert.strictEqual(out.result, '    - [x](https://e.com/p?keep=1)');
});

test('multiline: two bulleted tabs, summary notice (Issue 2)', () => {
	const input =
		'- [A](https://a.com/x?utm_source=a)\n- [B](https://b.com/y?utm_source=b&gclid=z)';
	const out = transformText(input, settings());
	assert.strictEqual(
		out.result,
		'- [A](https://a.com/x)\n- [B](https://b.com/y)'
	);
	assert.strictEqual(
		out.notice,
		'Linted 2 of 2 links · removed 3 tracking parameters'
	);
});

test('multiline: unchanged lines pass through verbatim', () => {
	const input =
		'Some heading\n- [A](https://a.com/x?utm_source=a)\nplain text line';
	const out = transformText(input, settings());
	assert.strictEqual(
		out.result,
		'Some heading\n- [A](https://a.com/x)\nplain text line'
	);
	assert.strictEqual(out.notice, 'Removed 1 tracking parameter');
});

test('multiline: blank lines and trailing newline preserved', () => {
	const input = '- [A](https://a.com/x?utm_source=a)\n\n';
	const out = transformText(input, settings());
	assert.strictEqual(out.result, '- [A](https://a.com/x)\n\n');
});

test('inline: two markdown links on one line both cleaned', () => {
	const out = transformText(
		'see [A](https://a.com/x?utm_source=a) and [B](https://b.com/y?gclid=z) here',
		settings()
	);
	assert.strictEqual(
		out.result,
		'see [A](https://a.com/x) and [B](https://b.com/y) here'
	);
	assert.strictEqual(
		out.notice,
		'Linted 2 of 2 links · removed 2 tracking parameters'
	);
});

test('inline: bare URL in prose only cleaned when cleanBareUrls ON', () => {
	const input = 'check https://e.com/p?utm_source=a today';
	assert.strictEqual(transformText(input, settings()), null);

	const out = transformText(input, settings({ cleanBareUrls: true }));
	assert.strictEqual(out.result, 'check https://e.com/p today');
	assert.strictEqual(out.notice, 'Removed 1 tracking parameter');
});

test('inline: trailing punctuation after a bare URL is preserved', () => {
	const out = transformText(
		'link: https://e.com/p?utm_source=a.',
		settings({ cleanBareUrls: true })
	);
	assert.strictEqual(out.result, 'link: https://e.com/p.');
});

test('inline: bare YouTube timestamp converts mid-sentence (not gated)', () => {
	const out = transformText(
		'watch https://youtu.be/49V-5Ock8LU?t=115 now',
		settings()
	);
	assert.strictEqual(
		out.result,
		'watch [1:55](https://youtu.be/49V-5Ock8LU?t=115) now'
	);
	assert.strictEqual(out.notice, 'Linked YouTube timestamp');
});

test('inline: URL inside a markdown link is not double-processed', () => {
	// The bare-URL scanner must not touch the URL already inside [..](..).
	const out = transformText(
		'[Book](https://www.amazon.ca/Strange/dp/006343315X/ref=asc?tag=x)',
		settings()
	);
	assert.strictEqual(
		out.result,
		'[Book](https://www.amazon.ca/Strange/dp/006343315X)'
	);
	assert.strictEqual(out.notice, 'Cleaned Amazon link');
});

test('multiline: mixed rules produce a compound summary', () => {
	const input =
		'- [(3) News](https://x.com/p?utm_source=a)\n' +
		'- [Book](https://www.amazon.ca/S/dp/006343315X/ref=z)';
	const out = transformText(input, settings());
	assert.strictEqual(
		out.result,
		'- [News](https://x.com/p)\n- [Book](https://www.amazon.ca/S/dp/006343315X)'
	);
	assert.strictEqual(
		out.notice,
		'Linted 2 of 2 links · removed 1 tracking parameter · stripped 1 notification count · cleaned 1 Amazon link'
	);
});

test('multiline: "of N" counts all candidates, changed and not', () => {
	const input =
		'- [A](https://a.com/x?utm_source=a)\n- [B](https://b.com/clean)';
	const out = transformText(input, settings());
	// 2 links seen, only 1 changed.
	assert.strictEqual(out.notice, 'Removed 1 tracking parameter');
	assert.strictEqual(
		out.result,
		'- [A](https://a.com/x)\n- [B](https://b.com/clean)'
	);
});

test('transformText: nothing to change returns null', () => {
	assert.strictEqual(
		transformText('- [A](https://a.com/clean)\njust words', settings()),
		null
	);
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
