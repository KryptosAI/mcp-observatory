export function requireHttpUrl(value: string, label = "URL"): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${label} must use http: or https:.`);
  }
  return url.toString();
}

export function appendQuery(urlValue: string, params: Record<string, string>): string {
  const url = new URL(requireHttpUrl(urlValue));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
