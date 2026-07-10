/**
 * Merged tracking-parameter list — the single source of truth for query-string
 * cleaning. Synthesised from two reference extensions:
 *
 *   - Eraser  (Psychosynthesis/Eraser)  → src/shared/constants.js
 *                                          `DEFAULT_PARAMS_TO_REMOVE` (~80 names)
 *   - clean-url (laststance/clean-url)  → utils/clean-url-logic.ts
 *                                          `TRACKING_PARAM_PATTERNS`
 *
 * Matching is CASE-INSENSITIVE (all names below are lowercased) and HYBRID:
 * a parameter is stripped if its lowercased name is in TRACKING_PARAMS
 * (exact match) OR starts with one of TRACKING_PARAM_PREFIXES.
 *
 * ── Update checklist (keeps future re-ports a one-file diff) ──────────────
 *   1. Diff Eraser `DEFAULT_PARAMS_TO_REMOVE` vs the "Eraser base" block below.
 *   2. Diff clean-url `TRACKING_PARAM_PATTERNS` vs the "clean-url additions".
 *   3. Add/remove names here only; the cleaning code never needs to change.
 *   Dropped from Eraser: the dead prefix-only stems `mc_` and `vn_` (Eraser
 *   matches exactly, so they were no-ops there; prefix matching here is handled
 *   by TRACKING_PARAM_PREFIXES instead).
 */

/**
 * Exact-match tracking parameter names (all lowercase). Compared against the
 * lowercased parameter key.
 */
export const TRACKING_PARAMS: ReadonlySet<string> = new Set([
	// ── Eraser base (DEFAULT_PARAMS_TO_REMOVE, minus dead stems mc_ / vn_) ──
	// UTM / campaign families (also covered by prefixes, kept for provenance)
	'utm_source',
	'utm_medium',
	'utm_campaign',
	'utm_term',
	'utm_content',
	'utm_id',
	'utm_referrer',
	'utm_name',
	'itm_campaign',
	'itm_medium',
	'itm_source',
	'mtm_content',
	'mtm_keyword',
	'mtm_group',
	'mtm_cid',
	'mtm_medium',
	'mtm_placement',
	'mtm_source',
	'mtm_campaign',
	'otm_source',
	'otm_medium',
	'otm_campaign',
	'otm_content',
	'otm_term',
	'ga_source',
	'ga_medium',
	'ga_campaign',
	'ga_term',
	'ga_content',
	'hmb_campaign',
	'hmb_medium',
	'hmb_source',
	// Ad / click IDs
	'gclid',
	'cmpid',
	'dclid',
	'_ga',
	'yclid',
	'_openstat',
	'fbclid',
	'fb_action_types',
	'fb_action_ids',
	'fb_source',
	'fb_ref',
	'gs_l',
	'mkt_tok',
	'msclkid',
	'twclid',
	'rb_clickid',
	'wickedid',
	// Email / analytics long tail
	'mc_eid',
	'mc_cid',
	'mc_tc',
	'os_ehash',
	'_gl',
	'__twitter_impression',
	'wt_mc',
	'wtrid',
	'tracking_source',
	'ceneo_spo',
	'__hsfp',
	'__hssc',
	'__hstc',
	'_hsenc',
	'_hsmi',
	'hsctatracking',
	'ml_subscriber',
	'ml_subscriber_hash',
	'oly_anon_id',
	'oly_enc_id',
	's_cid',
	'vero_conv',
	'vero_id',
	'_trksid',
	'athena',
	'athasset',
	'social_share',
	'content_source',
	'from',

	// ── clean-url additions (social / affiliate / ads / Amazon query) ──
	'igshid',
	'ttclid',
	'tiktok_r',
	'li_fat_id',
	'gad_source',
	'gad_campaignid',
	'gbraid',
	'matchtype',
	'campaign_id',
	'ad_id',
	'ck_subscriber_id',
	'_bhlid',
	'ascsubtag',
	'pd_rd_i',
	'pd_rd_r',
	'pd_rd_w',
	'pd_rd_wg',
	'sr_share',
	'sthash',
	'adgroup',
	'adposition',
	'linkcode',
	'linkid',
	'creative',
	'camp',
	'utm_nooverride',
	'utm_ad',
	'subid',
	'sub_id',
	'partner_id',
	'affiliate_id',
	'afid',
	'click_id',
	'clickid',

	// ── Aggressive generic names (confirmed in plan §3.5) ──
	// These clean more but can occasionally strip a legitimate parameter
	// (a blog's ?tag=, a store's ?ref=). Accepted tradeoff; easy to dial back
	// by deleting a line here.
	'ref',
	'referral',
	'referrer',
	'source',
	'campaign',
	'tag',
	'trk',
]);

/**
 * Prefix families. A parameter is stripped if its lowercased name starts with
 * any of these (so a novel `utm_somethingnew` is caught even though it is not
 * individually listed above).
 */
export const TRACKING_PARAM_PREFIXES: readonly string[] = [
	'utm_',
	'itm_',
	'mtm_',
	'otm_',
	'ga_',
	'hmb_',
];

/**
 * True if a parameter name is tracking cruft: either an exact match against
 * TRACKING_PARAMS or a match against one of TRACKING_PARAM_PREFIXES.
 * Case-insensitive.
 */
export function isTrackingParam(name: string): boolean {
	const lower = name.toLowerCase();
	if (TRACKING_PARAMS.has(lower)) {
		return true;
	}
	return TRACKING_PARAM_PREFIXES.some((prefix) => lower.startsWith(prefix));
}
