import { e as escape_html } from "./escaping.js";
import { w as writable } from "./index.js";
const replacements = {
  translate: /* @__PURE__ */ new Map([
    [true, "yes"],
    [false, "no"]
  ])
};
function attr(name, value, is_boolean = false) {
  if (value == null || !value && is_boolean) return "";
  const normalized = name in replacements && replacements[name].get(value) || value;
  const assignment = is_boolean ? "" : `="${escape_html(normalized, true)}"`;
  return ` ${name}${assignment}`;
}
const createAuthStore = () => {
  const { subscribe, set, update } = writable({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });
  return {
    subscribe,
    // Check authentication status
    checkAuth: async () => {
      return;
    },
    // Login with GitHub
    login: () => {
      return;
    },
    // Logout
    logout: async () => {
      return;
    },
    // Set loading state
    setLoading: (loading) => {
      update((state) => ({ ...state, isLoading: loading }));
    }
  };
};
const auth = createAuthStore();
export {
  attr as a,
  auth as b
};
