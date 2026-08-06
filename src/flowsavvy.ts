import type { FlowSavvyEnv } from "./types.ts";

const BASE_URL = "https://my.flowsavvy.app/api/";

interface FoundTask {
  id: number;
}

export class UpstreamError extends Error {
  constructor(endpoint: string, status: number | string) {
    super(`FlowSavvy ${endpoint}: ${status}`);
  }
}

export class FlowSavvy {
  private cookies = new Map<string, string>();
  private csrf = "";
  private loginPromise?: Promise<void>;
  private env: FlowSavvyEnv;

  constructor(env: FlowSavvyEnv) {
    this.env = env;
  }

  private mergeCookies(headers: Headers) {
    const values =
      (
        headers as Headers & { getSetCookie?: () => string[] }
      ).getSetCookie?.() ?? [];
    for (const cookie of values) {
      const pair = cookie.split(";", 1)[0]!;
      const at = pair.indexOf("=");

      if (at > 0) this.cookies.set(pair.slice(0, at), pair.slice(at + 1));
    }
  }

  private cookieHeader() {
    return [...this.cookies]
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }

  private async fetch(endpoint: string, init: RequestInit = {}) {
    const response = await fetch(BASE_URL + endpoint, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { Cookie: this.cookieHeader(), ...init.headers },
    });

    this.mergeCookies(response.headers);
    return response;
  }

  private async refreshToken() {
    const endpoint = "Schedule/AntiForgeryToken";
    const response = await this.fetch(endpoint);
    if (!response.ok) throw new UpstreamError(endpoint, response.status);

    const match = (await response.text()).match(
      /name="__RequestVerificationToken"[^>]*value="([^"]+)"/,
    );
    if (!match) throw new UpstreamError(endpoint, "missing CSRF token");

    this.csrf = match[1]!;
  }

  private async login() {
    await this.refreshToken();

    const form = new FormData();
    form.set("Email", this.env.FLOW_SAVVY_EMAIL);
    form.set("Password", this.env.FLOW_SAVVY_PASSWORD);
    form.set("TimeZone", this.env.FLOW_SAVVY_TIME_ZONE);
    const response = await this.fetch("Account/Login", {
      method: "POST",
      body: form,
      headers: { "x-csrf-token": this.csrf },
    });
    const data = (await response.json().catch(() => null)) as {
      success?: boolean;
    } | null;

    if (!response.ok || data?.success !== true) {
      throw new UpstreamError("Account/Login", response.status);
    }
  }

  private authenticated() {
    return (this.loginPromise ??= this.login().catch((error) => {
      this.loginPromise = undefined;
      throw error;
    }));
  }

  async request(
    endpoint: string,
    init: RequestInit = {},
    retry = true,
  ): Promise<Response> {
    await this.authenticated();
    if (init.method && init.method !== "GET") await this.refreshToken();

    const response = await this.fetch(endpoint, {
      ...init,
      headers: { "x-csrf-token": this.csrf, ...init.headers },
    });
    if (
      (response.status === 302 ||
        response.status === 401 ||
        response.status === 403) &&
      retry
    ) {
      this.loginPromise = undefined;
      return this.request(endpoint, init, false);
    }

    if (!response.ok) throw new UpstreamError(endpoint, response.status);
    return response;
  }

  async search(identifier: string): Promise<FoundTask | undefined> {
    const response = await this.request(
      `item/search?query=${encodeURIComponent(identifier)}&searchCompletedTasks=false&getItemsAfterCursor=true&takeFirst=true&batchSize=50`,
    );
    const data = (await response.json()) as {
      searchResponse?: { items?: Array<{ id: number }> };
    };

    return data.searchResponse?.items?.[0];
  }

  async post(endpoint: string, fields: Record<string, string>) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);

    await this.request(endpoint, { method: "POST", body: form });
  }

  recalculate() {
    return this.post("Schedule/Recalculate", { force: "true" });
  }
}
