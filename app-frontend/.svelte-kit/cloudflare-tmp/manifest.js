export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.Dl-Sdmzt.js",app:"_app/immutable/entry/app.B8oMuAP5.js",imports:["_app/immutable/entry/start.Dl-Sdmzt.js","_app/immutable/chunks/ChYyABG3.js","_app/immutable/chunks/CZg8cpZA.js","_app/immutable/entry/app.B8oMuAP5.js","_app/immutable/chunks/CZg8cpZA.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BIUB_teb.js","_app/immutable/chunks/CcIIV-Qb.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('../output/server/nodes/0.js')),
			__memo(() => import('../output/server/nodes/1.js')),
			__memo(() => import('../output/server/nodes/2.js')),
			__memo(() => import('../output/server/nodes/3.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/callback",
				pattern: /^\/api\/callback\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/callback/_server.ts.js'))
			},
			{
				id: "/api/links",
				pattern: /^\/api\/links\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/links/_server.ts.js'))
			},
			{
				id: "/api/links/[shortCode]",
				pattern: /^\/api\/links\/([^/]+?)\/?$/,
				params: [{"name":"shortCode","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/links/_shortCode_/_server.ts.js'))
			},
			{
				id: "/api/login",
				pattern: /^\/api\/login\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/login/_server.ts.js'))
			},
			{
				id: "/api/logout",
				pattern: /^\/api\/logout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/logout/_server.ts.js'))
			},
			{
				id: "/api/me",
				pattern: /^\/api\/me\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/me/_server.ts.js'))
			},
			{
				id: "/api/security/stats",
				pattern: /^\/api\/security\/stats\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/security/stats/_server.ts.js'))
			},
			{
				id: "/api/shorten",
				pattern: /^\/api\/shorten\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/shorten/_server.ts.js'))
			},
			{
				id: "/app",
				pattern: /^\/app\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/[shortCode]",
				pattern: /^\/([^/]+?)\/?$/,
				params: [{"name":"shortCode","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/_shortCode_/_server.ts.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export const prerendered = new Set([]);

export const base_path = "";
