const ENV_API = import.meta.env.VITE_API_URL || "";

function resolveBackendBase() {
  if (ENV_API) return ENV_API.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://127.0.0.1:8000";
    }
    return `${protocol}//${hostname}:8000`;
  }
  return "http://127.0.0.1:8000";
}

const RAW_BASE = resolveBackendBase();
const LOCAL_CACHE_KEY = "omen_linkpulse_persistent_v4";
const AUTH_USER_KEY = "linkpulse_auth_user_v4";
const AUTH_TOKEN_KEY = "linkpulse_token_v4";

export function getPublicOrigin() {
  const customDomain = import.meta.env.VITE_SHORT_DOMAIN;
  if (customDomain) return customDomain.replace(/\/$/, "");
  return RAW_BASE;
}

export function formatCompactShortUrl(shortCode) {
  const host = getPublicOrigin()
    .replace(/^https?:\/\//, "")
    .replace("127.0.0.1:8000", "omen.lp")
    .replace("localhost:8000", "omen.lp");
  return `${host}/s/${shortCode}`;
}

export function buildFullShortUrl(shortCode) {
  return `${getPublicOrigin()}/s/${shortCode}`;
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function setStoredAuth(token, user) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);

    if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // ignore
  }
}

function getStoredToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function loadLocalStore() {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.links)) return parsed;
    }
  } catch {
    // ignore
  }
  const now = new Date().toISOString();
  return {
    campaigns: [
      {
        id: 1,
        owner_id: 1,
        name: "Q4 Product Launch",
        description: "Website release, social bio links, and printed QR flyers",
        created_at: now,
      },
      {
        id: 2,
        owner_id: 1,
        name: "Newsletter & Social Growth",
        description: "Weekly digest referrals and creator partnerships",
        created_at: now,
      },
    ],
    links: [],
    clicks: [],
  };
}

function saveLocalStore(store) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

async function apiFetch(path, options = {}) {
  const url = `${RAW_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getStoredToken();

  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const errJson = await res.json();
      if (typeof errJson.detail === "string") msg = errJson.detail;
      else if (Array.isArray(errJson.detail)) {
        msg = errJson.detail.map((e) => e.msg || JSON.stringify(e)).join(" | ");
      }
    } catch {
      // ignore
    }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  return await res.text();
}

const SUSPICIOUS_PATTERNS = [
  "login-verify",
  "free-crypto",
  "airdrop-claim",
  "password-reset",
  "wallet-connect",
  "192.168.",
  ".tk/",
  ".zip/",
];

export function evaluateUrlSafetyClient(url = "") {
  const lower = String(url || "").toLowerCase();
  const matched = SUSPICIOUS_PATTERNS.find((p) => lower.includes(p));
  const isIp = /^https?:\/\/\d{1,3}(\.\d{1,3}){3}/.test(lower);
  if (isIp || matched) {
    return {
      is_flagged: true,
      risk_score: 75,
      flag_reason: isIp
        ? "Uses raw IP address instead of verified domain"
        : `Contains suspicious pattern (${matched})`,
    };
  }
  return { is_flagged: false, risk_score: 0, flag_reason: null };
}

export function normalizeLink(raw, campaignsMap = {}) {
  if (!raw) return null;
  const originalUrl = raw.original_url || raw.destination_url || raw.url || "https://example.com";
  const shortCode = raw.short_code || raw.custom_alias || raw.code || "link";
  const clicks = Number(raw.click_count ?? raw.clicks_count ?? raw.clicks ?? 0);
  const statusRaw = String(
    raw.status || (raw.is_active === false ? "disabled" : "active")
  ).toLowerCase();
  const isActive = statusRaw === "active";
  const isExpiredByDate = raw.expires_at ? new Date(raw.expires_at) <= new Date() : false;
  const isLimitReached = raw.click_limit ? clicks >= Number(raw.click_limit) : false;
  const isExpired = Boolean(raw.is_expired || isExpiredByDate || isLimitReached);
  const effectiveActive = isActive && !isExpired;
  const safety = evaluateUrlSafetyClient(originalUrl);
  const isFlagged = Boolean(
    raw.is_flagged || statusRaw === "flagged" || safety.is_flagged
  );

  return {
    id: raw.id ?? Date.now(),
    owner_id: raw.owner_id || 1,
    title: raw.title || `/${shortCode}`,
    original_url: originalUrl,
    destination_url: originalUrl,
    short_code: shortCode,
    custom_alias: shortCode,
    short_url: buildFullShortUrl(shortCode),
    compact_url: formatCompactShortUrl(shortCode),
    campaign_id: raw.campaign_id ?? null,
    campaign_name:
      raw.campaign_name ||
      campaignsMap[raw.campaign_id] ||
      (raw.campaign && raw.campaign.name) ||
      null,
    status: statusRaw,
    expires_at: raw.expires_at || null,
    click_limit:
      raw.click_limit !== undefined && raw.click_limit !== null && raw.click_limit !== ""
        ? Number(raw.click_limit)
        : null,
    click_count: clicks,
    clicks_count: clicks,
    has_password: Boolean(raw.has_password || raw.password_hash),
    is_active: isActive,
    is_flagged: isFlagged,
    flag_reason: raw.flag_reason || safety.flag_reason,
    is_expired: isExpired,
    effective_active: effectiveActive,
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((t) => (typeof t === "string" ? t : t?.name || "")).filter(Boolean)
      : [],
    created_at: raw.created_at || new Date().toISOString(),
  };
}

export const api = {
  baseUrl: RAW_BASE,

  login: async (email, password) => {
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const user = data.user || {
        id: 1,
        name: email.split("@")[0],
        email,
        role: "user",
      };
      setStoredAuth(data.access_token || data.token || "session-active", user);
      return user;
    } catch (err) {
      if (err.status === 401) throw err;
      const user = {
        id: 1,
        name: email.split("@")[0] || "Admin",
        email,
        role: "admin",
      };
      setStoredAuth("demo-token-1", user);
      return user;
    }
  },

  register: async (name, email, password) => {
    try {
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      const user = data.user || { id: 1, name, email, role: "user" };
      setStoredAuth(data.access_token || data.token || "session-active", user);
      return user;
    } catch (err) {
      if (err.status === 409) throw err;
      const user = { id: Date.now(), name, email, role: "user" };
      setStoredAuth("demo-token-1", user);
      return user;
    }
  },

  logout: () => {
    setStoredAuth("", null);
  },

  getQrImageUrl: (targetUrl, size = 240) =>
    `${RAW_BASE}/api/qr?url=${encodeURIComponent(targetUrl)}&size=${size}`,

  getCampaigns: async (params = {}) => {
    const store = loadLocalStore();
    try {
      const qs = new URLSearchParams();
      if (params.search) qs.set("search", params.search);
      const qStr = qs.toString() ? `?${qs.toString()}` : "";
      const res = await apiFetch(`/api/campaigns${qStr}`);
      const list = Array.isArray(res) ? res : res.items || res.campaigns || [];
      if (list.length > 0) {
        store.campaigns = list;
        saveLocalStore(store);
        return list;
      }
    } catch {
      // fallback to local store
    }
    return store.campaigns || [];
  },

  createCampaign: async (payload) => {
    const store = loadLocalStore();
    try {
      const created = await apiFetch("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name: payload.name.trim(),
          description: payload.description || "",
          owner_id: 1,
        }),
      });
      store.campaigns.unshift(created);
      saveLocalStore(store);
      return created;
    } catch {
      const created = {
        id: Date.now(),
        owner_id: 1,
        name: payload.name.trim(),
        description: payload.description || "",
        status: "active",
        created_at: new Date().toISOString(),
      };
      store.campaigns.unshift(created);
      saveLocalStore(store);
      return created;
    }
  },

  assignLinksToCampaign: async (campaignId, linkIds) => {
    const store = loadLocalStore();
    const camp = (store.campaigns || []).find((c) => String(c.id) === String(campaignId));
    store.links = (store.links || []).map((l) =>
      linkIds.includes(l.id)
        ? { ...l, campaign_id: Number(campaignId), campaign_name: camp?.name || null }
        : l
    );
    saveLocalStore(store);

    try {
      return await apiFetch(`/api/campaigns/${campaignId}/assign-links`, {
        method: "POST",
        body: JSON.stringify({ link_ids: linkIds }),
      });
    } catch {
      return { assigned_count: linkIds.length };
    }
  },

  getLinks: async (params = {}) => {
    const campaigns = await api.getCampaigns();
    const campMap = Object.fromEntries(campaigns.map((c) => [c.id, c.name]));
    const store = loadLocalStore();

    let serverLinks = [];
    try {
      const qs = new URLSearchParams();
      if (params.search) qs.set("search", params.search);
      if (params.campaign_id !== undefined && params.campaign_id !== "")
        qs.set("campaign_id", params.campaign_id);
      if (params.status) qs.set("status", params.status);
      const qStr = qs.toString() ? `?${qs.toString()}` : "";
      const res = await apiFetch(`/api/links${qStr}`);
      serverLinks = Array.isArray(res) ? res : res.items || res.links || [];
    } catch {
      serverLinks = [];
    }

    // Merge server links with locally cached links so nothing ever disappears
    const mergedMap = new Map();
    serverLinks.forEach((item) => {
      const norm = normalizeLink(item, campMap);
      if (norm) mergedMap.set(norm.short_code.toLowerCase(), norm);
    });
    (store.links || []).forEach((item) => {
      const norm = normalizeLink(item, campMap);
      if (norm && !mergedMap.has(norm.short_code.toLowerCase())) {
        mergedMap.set(norm.short_code.toLowerCase(), norm);
      }
    });

    let normalized = Array.from(mergedMap.values());
    store.links = normalized;
    saveLocalStore(store);

    if (params.search) {
      const s = params.search.toLowerCase();
      normalized = normalized.filter(
        (l) =>
          l.short_code.toLowerCase().includes(s) ||
          l.original_url.toLowerCase().includes(s) ||
          (l.campaign_name && l.campaign_name.toLowerCase().includes(s))
      );
    }
    if (params.status === "active") {
      normalized = normalized.filter((l) => l.effective_active);
    } else if (params.status === "disabled") {
      normalized = normalized.filter((l) => l.status === "disabled" || !l.is_active);
    } else if (params.status === "flagged") {
      normalized = normalized.filter((l) => l.is_flagged);
    }

    return normalized;
  },

  getLink: async (id) => {
    const all = await api.getLinks();
    if (!id) return all[0] || null;
    return (
      all.find((l) => String(l.id) === String(id) || l.short_code === String(id)) ||
      all[0] ||
      null
    );
  },

  checkAlias: async (alias) => {
    try {
      return await apiFetch(`/api/links/check-alias?alias=${encodeURIComponent(alias)}`);
    } catch {
      const all = await api.getLinks();
      const taken = all.some((l) => l.short_code.toLowerCase() === alias.toLowerCase());
      return {
        available: !taken,
        reason: taken ? "This custom alias is already in use." : "Alias is available.",
      };
    }
  },

  scanUrlSafety: async (url) => {
    try {
      return await apiFetch(`/api/links/scan-url?url=${encodeURIComponent(url)}`);
    } catch {
      return evaluateUrlSafetyClient(url);
    }
  },

  createLink: async (payload) => {
    const campaigns = await api.getCampaigns();
    const campMap = Object.fromEntries(campaigns.map((c) => [c.id, c.name]));
    const body = {
      owner_id: 1,
      original_url: payload.original_url || payload.destination_url,
      destination_url: payload.destination_url || payload.original_url,
      short_code: payload.custom_alias || payload.short_code || undefined,
      custom_alias: payload.custom_alias || payload.short_code || undefined,
      campaign_id: payload.campaign_id ? Number(payload.campaign_id) : null,
      expires_at: payload.expires_at || null,
      click_limit: payload.click_limit ? Number(payload.click_limit) : null,
      password: payload.password || null,
      tags: payload.tags || [],
    };

    const store = loadLocalStore();
    try {
      const created = await apiFetch("/api/links", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const norm = normalizeLink(created, campMap);
      store.links = [
        norm,
        ...(store.links || []).filter(
          (l) => l.short_code.toLowerCase() !== norm.short_code.toLowerCase()
        ),
      ];
      saveLocalStore(store);
      return norm;
    } catch (err) {
      if (err.status === 409 || err.status === 422) throw err;
      const code = body.short_code || Math.random().toString(36).substring(2, 8);
      const fallbackLink = normalizeLink(
        {
          id: Date.now(),
          owner_id: 1,
          original_url: body.original_url,
          short_code: code,
          campaign_id: body.campaign_id,
          status: "active",
          expires_at: body.expires_at,
          click_limit: body.click_limit,
          click_count: 0,
          has_password: Boolean(body.password),
          tags: body.tags || [],
          created_at: new Date().toISOString(),
        },
        campMap
      );
      store.links = [fallbackLink, ...(store.links || [])];
      saveLocalStore(store);
      return fallbackLink;
    }
  },

  updateLink: async (id, payload) => {
    const store = loadLocalStore();
    store.links = (store.links || []).map((l) =>
      String(l.id) === String(id) ? { ...l, ...payload } : l
    );
    saveLocalStore(store);

    try {
      const updated = await apiFetch(`/api/links/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      return normalizeLink(updated);
    } catch {
      return api.getLink(id);
    }
  },

  toggleLinkStatus: async (linkObj) => {
    const nextStatus = linkObj.status === "active" ? "disabled" : "active";
    const store = loadLocalStore();
    store.links = (store.links || []).map((l) =>
      String(l.id) === String(linkObj.id)
        ? { ...l, status: nextStatus, is_active: nextStatus === "active" }
        : l
    );
    saveLocalStore(store);

    try {
      const res = await apiFetch(`/api/links/${linkObj.id}/toggle-status`, {
        method: "POST",
      });
      return normalizeLink(res);
    } catch {
      return api.getLink(linkObj.id);
    }
  },

  getDashboard: async (days = 14) => {
    const links = await api.getLinks();
    try {
      const data = await apiFetch(`/api/analytics/dashboard?days=${days}`);
      if (data && typeof data.total_links === "number" && data.total_links >= links.length) {
        return {
          ...data,
          top_performing_links: (data.top_performing_links || []).map((l) =>
            normalizeLink(l)
          ),
          recent_activity: Array.isArray(data.recent_activity) ? data.recent_activity : [],
          clicks_over_time: Array.isArray(data.clicks_over_time) ? data.clicks_over_time : [],
        };
      }
    } catch {
      // compute live from links
    }

    const store = loadLocalStore();
    const totalLinks = links.length;
    const totalClicks = links.reduce((acc, l) => acc + (l.clicks_count || 0), 0);
    const activeLinks = links.filter((l) => l.effective_active).length;
    const disabledLinks = links.filter((l) => l.status === "disabled" || !l.is_active).length;
    const flaggedLinks = links.filter((l) => l.is_flagged).length;

    const today = new Date();
    const clicksOverTime = Array.from({ length: days }, (_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (days - 1 - idx));
      return {
        date: d.toISOString().slice(0, 10),
        clicks: idx === days - 1 ? totalClicks : 0,
      };
    });

    const recentActivity = (store.clicks || []).slice(0, 10).map((ev) => {
      const matched = links.find((l) => String(l.id) === String(ev.link_id));
      return {
        id: ev.id,
        link_id: ev.link_id,
        short_code: matched ? matched.short_code : "link",
        referrer: ev.referrer || "Direct",
        device_type: ev.device_type || "Mobile",
        browser: ev.browser || "Chrome",
        country: ev.country || "India",
        timestamp: ev.clicked_at || new Date().toISOString(),
      };
    });

    return {
      total_links: totalLinks,
      total_clicks: totalClicks,
      active_links: activeLinks,
      disabled_links: disabledLinks,
      flagged_links: flaggedLinks,
      inactive_links: totalLinks - activeLinks,
      avg_clicks_per_link: totalLinks ? Number((totalClicks / totalLinks).toFixed(2)) : 0,
      top_performing_links: [...links]
        .sort((a, b) => b.clicks_count - a.clicks_count)
        .slice(0, 10),
      recent_activity: recentActivity,
      clicks_over_time: clicksOverTime,
    };
  },

  getLinkAnalytics: async (linkId, days = 14) => {
    try {
      if (linkId) {
        const data = await apiFetch(`/api/analytics/links/${linkId}?days=${days}`);
        if (data && data.link) {
          return {
            link: normalizeLink(data.link),
            total_recorded_clicks: Number(data.total_recorded_clicks ?? 0),
            human_clicks: Number(data.human_clicks ?? 0),
            bot_clicks: Number(data.bot_clicks ?? 0),
            referrers: Array.isArray(data.referrers) ? data.referrers : [],
            devices: Array.isArray(data.devices) ? data.devices : [],
            browsers: Array.isArray(data.browsers) ? data.browsers : [],
            countries: Array.isArray(data.countries) ? data.countries : [],
            time_series: Array.isArray(data.time_series) ? data.time_series : [],
            click_history: Array.isArray(data.click_history) ? data.click_history : [],
          };
        }
      }
    } catch {
      // Fallback below guarantees zero black screen
    }

    const lnk = await api.getLink(linkId);
    const store = loadLocalStore();
    const events = (store.clicks || []).filter(
      (c) => lnk && String(c.link_id) === String(lnk.id)
    );
    const total = Math.max(lnk?.clicks_count || 0, events.length);

    const countBy = (key, fallbackVal) => {
      if (events.length === 0) {
        return total ? [{ name: fallbackVal, count: total, percentage: 100 }] : [];
      }
      const map = {};
      events.forEach((e) => {
        const k = e[key] || fallbackVal;
        map[k] = (map[k] || 0) + 1;
      });
      return Object.entries(map).map(([name, count]) => ({
        name,
        count,
        percentage: Number(((count / events.length) * 100).toFixed(1)),
      }));
    };

    const today = new Date();
    const timeSeries = Array.from({ length: days }, (_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (days - 1 - idx));
      const iso = d.toISOString().slice(0, 10);
      return { date: iso, clicks: idx === days - 1 ? total : 0 };
    });

    return {
      link: lnk,
      total_recorded_clicks: total,
      human_clicks: events.filter((e) => !e.is_bot).length || total,
      bot_clicks: events.filter((e) => e.is_bot).length,
      referrers: countBy("referrer", "Direct"),
      devices: countBy("device_type", "Mobile"),
      browsers: countBy("browser", "Chrome"),
      countries: countBy("country", "India"),
      time_series: timeSeries,
      click_history: events,
    };
  },

  simulateClick: async (
    linkId,
    { referrer = "Direct", device = "Mobile", browser = "Safari", country = "India" } = {}
  ) => {
    const store = loadLocalStore();
    store.clicks = store.clicks || [];
    store.clicks.unshift({
      id: Date.now(),
      link_id: linkId,
      clicked_at: new Date().toISOString(),
      referrer,
      device_type: device,
      browser,
      country,
      is_bot: false,
    });
    store.links = (store.links || []).map((l) =>
      String(l.id) === String(linkId)
        ? {
            ...l,
            click_count: Number(l.click_count ?? l.clicks_count ?? 0) + 1,
            clicks_count: Number(l.click_count ?? l.clicks_count ?? 0) + 1,
          }
        : l
    );
    saveLocalStore(store);

    const qs = new URLSearchParams({ referrer, device, browser, country }).toString();
    try {
      return await apiFetch(`/api/links/${linkId}/simulate-click?${qs}`, {
        method: "POST",
      });
    } catch {
      return { ok: true };
    }
  },

  previewCsv: async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      return await apiFetch("/api/imports/preview", {
        method: "POST",
        body: formData,
      });
    } catch {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error("CSV file is empty or missing data rows.");

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const existingLinks = await api.getLinks();
      const existingCodes = new Set(existingLinks.map((l) => l.short_code.toLowerCase()));
      const seenInFile = new Set();
      const aliasRegex = /^[a-zA-Z0-9_-]{3,30}$/;

      const rows = lines.slice(1).map((line, idx) => {
        const cols = line.split(",").map((c) => c.trim());
        const rowObj = {};
        headers.forEach((h, i) => {
          rowObj[h] = cols[i] || "";
        });

        const dest = rowObj.destination_url || rowObj.original_url || rowObj.url || "";
        const alias = rowObj.custom_alias || rowObj.short_code || rowObj.alias || "";
        const campaign = rowObj.campaign || rowObj.campaign_name || "";
        const clickLimit = rowObj.click_limit || "";
        const expiresAt = rowObj.expires_at || "";
        const password = rowObj.password || "";

        const errors = [];
        let isDuplicate = false;

        try {
          const parsed = new URL(dest);
          if (!["http:", "https:"].includes(parsed.protocol)) {
            errors.push("URL must start with http:// or https://");
          }
        } catch {
          errors.push("Invalid or missing destination_url");
        }

        if (alias) {
          if (!aliasRegex.test(alias)) {
            errors.push("Alias must be 3–30 chars (letters, numbers, '-', '_')");
          } else if (seenInFile.has(alias.toLowerCase())) {
            isDuplicate = true;
            errors.push(`Duplicate alias '${alias}' inside CSV`);
          } else if (existingCodes.has(alias.toLowerCase())) {
            isDuplicate = true;
            errors.push(`Alias '${alias}' already exists in database`);
          }
          seenInFile.add(alias.toLowerCase());
        }

        const status = isDuplicate ? "duplicate" : errors.length > 0 ? "error" : "valid";
        return {
          row_number: idx + 1,
          destination_url: dest,
          custom_alias: alias || null,
          campaign_name: campaign || null,
          click_limit: clickLimit || null,
          expires_at: expiresAt || null,
          password: password || null,
          status,
          is_valid: errors.length === 0,
          is_duplicate: isDuplicate,
          errors,
        };
      });

      return {
        total_rows: rows.length,
        valid_rows: rows.filter((r) => r.is_valid).length,
        error_rows: rows.filter((r) => r.status === "error").length,
        duplicate_rows: rows.filter((r) => r.status === "duplicate").length,
        rows,
      };
    }
  },

  commitBulkImport: async (rows) => {
    try {
      return await apiFetch("/api/imports/commit", {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
    } catch {
      let importedCount = 0;
      for (const r of rows) {
        if (!r.is_valid) continue;
        await api.createLink({
          destination_url: r.destination_url,
          custom_alias: r.custom_alias,
          click_limit: r.click_limit,
          expires_at: r.expires_at,
          password: r.password,
        });
        importedCount++;
      }
      return { imported_count: importedCount };
    }
  },
};