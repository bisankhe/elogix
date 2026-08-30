import { getAccessToken } from './auth'

/**
 * Fetch an authenticated file and hand it to the browser as a save.
 *
 * A plain `<a href="/api/...">` cannot work here: the access token lives in memory,
 * not in a cookie the browser would attach, so the link would arrive unauthenticated
 * and download a 401 body as a file. Fetching it with the header and saving the blob is
 * the only honest way to do it.
 *
 * The object URL is revoked afterwards — without that, every export the user takes
 * pins its whole blob in memory for the life of the tab.
 */
export async function downloadFile(url: string, fallbackName: string): Promise<void> {
  const token = getAccessToken()
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error(`The export failed (${response.status}). Try again, or reload to sign in.`)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filenameFrom(response.headers.get('content-disposition'), fallbackName)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** The server already named the file after the report and its period; use that name. */
function filenameFrom(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename="([^"]+)"/)
  return match?.[1] ?? fallback
}
