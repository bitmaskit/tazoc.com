

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.CXl-zFkh.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CZg8cpZA.js","_app/immutable/chunks/DoRsGw_t.js"];
export const stylesheets = ["_app/immutable/assets/0.CwzivqHL.css"];
export const fonts = [];
