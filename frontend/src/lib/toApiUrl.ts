const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export function toApiUrl(pathname: string, base = apiBase): string {
  const normalizedBase = base.replace(/\/$/, '')

  if (!normalizedBase) {
    return pathname
  }

  if (normalizedBase.endsWith('/api') && pathname.startsWith('/api/')) {
    return `${normalizedBase}${pathname.slice(4)}`
  }

  return `${normalizedBase}${pathname}`
}