declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    ADMIN_BOOTSTRAP_EMAIL: string;
    ADMIN_SESSION_SECRET: string;
    CONFIG_ENCRYPTION_KEY: string;
    SITE_ORIGIN: string;
  }
}
