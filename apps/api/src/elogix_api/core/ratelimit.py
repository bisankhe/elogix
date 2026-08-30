"""A small rate limiter, for the endpoints that have no login to throttle instead.

**In-process, and therefore per-worker.** Run four workers and the effective limit is
four times what it says. That is a real weakness and it is stated here rather than
buried, because the alternative — pretending a memory dict is a rate limit — is how a
system ends up with a control nobody checks. In front of the app is where this belongs:
a reverse proxy, an API gateway, or Redis if the limit has to be exact.

It is still worth having. Signup and offer-response are the only unauthenticated writes
in the system, and the attack they invite is a script in a loop. A per-worker limit
turns "thousands of tenants a minute" into "a few dozen", which is the difference
between a cleanup job and an incident.

Nothing here is a substitute for the checks around it: the signup endpoint validates,
reserves slugs, refuses anything but a trial plan and answers identically whether an
email was already taken.
"""

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class SlidingWindow:
    """Allow `limit` events per `window` seconds, per key.

    A deque of timestamps rather than a counter with a reset, so a caller cannot get
    twice the allowance by straddling a window boundary.
    """

    def __init__(self, *, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        # Requests arrive on a threadpool — `def` endpoints, deliberately — so the
        # bookkeeping needs a lock or two callers can both see room for the last slot.
        self._lock = threading.Lock()

    def check(self, key: str) -> int | None:
        """Record a hit. Returns seconds to wait if the caller is over the limit."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > self.window:
                hits.popleft()

            if len(hits) >= self.limit:
                return max(1, int(self.window - (now - hits[0])))

            hits.append(now)
            # Keys are unbounded otherwise: one entry per IP, kept forever. Sweeping
            # on write is cheap and needs no background task.
            if len(self._hits) > 10_000:
                self._sweep(now)
            return None

    def _sweep(self, now: float) -> None:
        stale = [k for k, v in self._hits.items() if not v or now - v[-1] > self.window]
        for k in stale:
            del self._hits[k]

    def reset(self) -> None:
        """For tests, and for a shell that needs to undo a lockout."""
        with self._lock:
            self._hits.clear()


def client_key(request: Request) -> str:
    """Who is calling, for limiting purposes.

    `X-Forwarded-For` is trusted only for its first entry and only because this runs
    behind a proxy that sets it. Absent a proxy the header is client-controlled and
    therefore forgeable — which is another reason the real limit belongs in front of
    the app rather than here.
    """
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce(window: SlidingWindow, request: Request, *, what: str) -> None:
    retry_after = window.check(client_key(request))
    if retry_after is None:
        return
    raise HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        f"Too many {what} from this address. Try again in {retry_after} second(s).",
        headers={"Retry-After": str(retry_after)},
    )
