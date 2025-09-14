export interface Env {
  // KV Namespaces
  LINKS: KVNamespace;
  SESSIONS: KVNamespace;
  
  // D1 Database
  DB: D1Database;
  
  // Services
  RESOLVER: Fetcher;
  
  // Secrets (KV bindings from secrets store)
  GITHUB_CLIENT_ID: KVNamespace;
  GITHUB_CLIENT_SECRET: KVNamespace;
}