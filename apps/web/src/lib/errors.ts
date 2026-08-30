/**
 * Surface what the API actually said.
 *
 * The server already computes a precise refusal — "Only 7.00 day(s) of Sick Leave
 * available; 50.00 requested" — and the first version of the leave screen threw that
 * away and rendered "the balance may be insufficient, or documentation may be required".
 * Guessing at a reason we were handed is worse than useless: it teaches people the app
 * does not know why it refused them.
 */

interface ValidationItem {
  loc?: (string | number)[]
  msg?: string
}

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const detail = (error as { detail?: unknown } | null)?.detail

  if (typeof detail === 'string') return detail

  // FastAPI's 422 shape: a list of per-field problems.
  if (Array.isArray(detail)) {
    const messages = (detail as ValidationItem[])
      .map((d) => {
        const field = d.loc?.filter((p) => p !== 'body').join('.')
        return field ? `${field}: ${d.msg}` : d.msg
      })
      .filter(Boolean)
    if (messages.length) return messages.join('; ')
  }

  return fallback
}
