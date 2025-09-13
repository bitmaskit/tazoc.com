
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/callback" | "/api/links" | "/api/links/[shortCode]" | "/api/login" | "/api/logout" | "/api/me" | "/api/security" | "/api/security/stats" | "/api/shorten" | "/app" | "/[shortCode]";
		RouteParams(): {
			"/api/links/[shortCode]": { shortCode: string };
			"/[shortCode]": { shortCode: string }
		};
		LayoutParams(): {
			"/": { shortCode?: string };
			"/api": { shortCode?: string };
			"/api/callback": Record<string, never>;
			"/api/links": { shortCode?: string };
			"/api/links/[shortCode]": { shortCode: string };
			"/api/login": Record<string, never>;
			"/api/logout": Record<string, never>;
			"/api/me": Record<string, never>;
			"/api/security": Record<string, never>;
			"/api/security/stats": Record<string, never>;
			"/api/shorten": Record<string, never>;
			"/app": Record<string, never>;
			"/[shortCode]": { shortCode: string }
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/callback" | "/api/callback/" | "/api/links" | "/api/links/" | `/api/links/${string}` & {} | `/api/links/${string}/` & {} | "/api/login" | "/api/login/" | "/api/logout" | "/api/logout/" | "/api/me" | "/api/me/" | "/api/security" | "/api/security/" | "/api/security/stats" | "/api/security/stats/" | "/api/shorten" | "/api/shorten/" | "/app" | "/app/" | `/${string}` & {} | `/${string}/` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}