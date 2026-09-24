const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export function sitePath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/") return `${basePath}/`;

  const isPageRoute = !normalizedPath.split("/").at(-1)?.includes(".");
  const trailingSlash = basePath && isPageRoute ? "/" : "";
  return `${basePath}${normalizedPath}${trailingSlash}`;
}
