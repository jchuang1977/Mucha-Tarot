declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    ADMIN_EMAIL: string;
    CONFIG_ENCRYPTION_KEY: string;
    SITE_ORIGIN: string;
  }
}
