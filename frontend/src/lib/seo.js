import { useEffect } from "react";

const SITE_URL = "https://www.mietgate.de";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

function setMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(path) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", `${SITE_URL}${path}`);
}

/**
 * Sets per-page title, meta description and OG/Twitter tags, and canonical URL.
 * `path` should be the route path (e.g. "/preise") used to build the canonical URL.
 */
export function useSEO({ title, description, path, image }) {
  useEffect(() => {
    const fullTitle = title ? `${title} · MietGate` : "MietGate – Digitales Vermietungsmanagement";
    document.title = fullTitle;
    setMeta("name", "description", description);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", `${SITE_URL}${path || ""}`);
    setMeta("property", "og:image", image || DEFAULT_OG_IMAGE);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image || DEFAULT_OG_IMAGE);
    if (path) setCanonical(path);
  }, [title, description, path, image]);
}
