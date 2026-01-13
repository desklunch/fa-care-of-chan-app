# Idle State Recovery System

## Overview

This document describes the idle state recovery system implemented to handle browser tab suspension and frozen router issues in the COCA (Care of Chan App) application.

## Problem Description

### The Frozen Router Issue

When a browser tab is hidden for an extended period (typically 2-4+ minutes), browsers throttle or suspend JavaScript execution to conserve resources. This can cause the application to enter a "frozen" state where:

1. **DOM event listeners still work** - Clicks are detected and logged
2. **React's internal state becomes stale** - The router (wouter) stops responding to navigation events
3. **User clicks navigation links but nothing happens** - The app appears unresponsive

### Root Cause

The wouter router uses React's state and context system. When the browser suspends the tab:
- React's scheduler pauses work for hidden tabs
- The router's location state becomes disconnected from the browser's actual URL
- When the tab becomes visible again, event handlers fire but React state updates don't propagate

### Why Detection is Difficult

The frozen router state cannot be reliably detected because:
1. Wouter exposes no health/status API
2. When frozen, clicks trigger handlers but state doesn't mutate - there's nothing observable to detect
3. Heuristic checks (comparing expected vs actual path) are brittle and risk false positives

## Solution: Proactive Recovery

Rather than trying to detect the frozen state, we proactively recover when returning from hidden state.

### Recovery Thresholds

| Threshold | Value | Action |
|-----------|-------|--------|
| Router Sync | 10 seconds | Force router sync via popstate event |
| Full Recovery | 2 minutes | Clear CSRF token + router sync + invalidate queries |

### Recovery Actions

1. **Router Sync** (10s+ idle, from hidden state)
   - Dispatches a `popstate` event to re-sync wouter with browser URL
   - Cheap operation, safe to run frequently

2. **Full Recovery** (2m+ idle)
   - Clears cached CSRF token (forces refresh on next mutation)
   - Forces router sync
   - Invalidates all React Query cache entries
   - Schedules via `requestIdleCallback` to avoid blocking main thread

## Implementation

### Key Files

| File | Purpose |
|------|---------|
| `client/src/hooks/useTabVisibility.ts` | Wake-up handler and recovery logic |
| `client/src/lib/debug-logger.ts` | Debug logging and navigation stall detection |
| `client/src/lib/queryClient.ts` | CSRF token management and API utilities |

### useTabVisibility Hook

The `useTabVisibility` hook manages:
- Visibility change detection (`visibilitychange` event)
- Focus/blur tracking (`focus`, `blur` events)
- Page lifecycle events (`pageshow`, `pagehide`)
- Online/offline status
- User interaction tracking (clicks, keydown, scroll, mousemove)

```typescript
// Thresholds
const STALE_THRESHOLD_MS = 2 * 60 * 1000;      // 2 minutes
const ROUTER_SYNC_THRESHOLD_MS = 10 * 1000;    // 10 seconds

// Recovery is triggered when:
// 1. Visibility changes from hidden -> visible AND idle > 10s (router sync only)
// 2. Any wake-up event AND idle > 2 minutes (full recovery)
```

### Hidden State Tracking

The hook tracks whether the tab was hidden using `wasHiddenRef`:
- Set to `true` when `document.hidden` becomes true
- Reset to `false` after recovery on visible transition
- Passed to `handleWakeUp` as `fromHiddenState` flag

## Debugging

### Debug Logger

The application includes comprehensive debug logging accessible via browser console:

```javascript
// View recent log history
window.__dumpLogHistory()

// Get structured log history
window.__getLogHistory()

// Get current app state
window.__getAppState()

// Get navigation stall count
window.__getNavigationStallCount()

// Reset navigation stall counter
window.__resetNavigationStallCount()
```

### Log Categories

| Category | Icon | Purpose |
|----------|------|---------|
| LIFECYCLE | 🔄 | App lifecycle events, wake-up triggers |
| FOCUS | 🎯 | Window focus/blur events |
| VISIBILITY | 👁️ | Document visibility changes |
| QUERY | 📡 | React Query fetch operations |
| AUTH | 🔐 | Authentication state changes |
| API | 🌐 | API request/response logging |
| NAVIGATION | 🧭 | Route changes and navigation |
| INPUT | 👆 | Click and keyboard events |
| SESSION | 🎫 | Session/CSRF token operations |
| STALL | ⚠️ | Navigation stall detection |

### Navigation Stall Detection

The debug logger includes telemetry for detecting navigation stalls:

```typescript
import { trackNavigationIntent } from "@/lib/debug-logger";

// Call when navigation is expected
trackNavigationIntent("/expected/path");

// After 250ms, if location hasn't changed, a STALL log is emitted
```

This helps identify cases where navigation attempts fail, useful for monitoring app health.

## Console Log Analysis

When analyzing console logs from unresponsive sessions:

### What to Look For

1. **Last visibility change before issue**
   ```
   👁️ [VISIBILITY] Document visibility changed to: hidden
   ```

2. **Wake-up trigger when returning**
   ```
   🔄 [LIFECYCLE] Wake-up triggered from visibility {idleTimeMs: 233371, exceedsStaleThreshold: false}
   ```

3. **Clicks being detected but no navigation**
   ```
   👆 [INPUT] Click detected on SPAN {..., textContent: 'Venues', ...}
   // No subsequent NAVIGATION log = frozen router
   ```

### Key Indicators

| Log Pattern | Meaning |
|-------------|---------|
| `exceedsStaleThreshold: false` with high idleTimeMs | Recovery threshold wasn't met |
| `fromHiddenState: true` | Tab was returning from hidden state |
| Click logs without navigation logs | Router is frozen |
| `STALL` category logs | Navigation intent detected but path didn't change |

## Configuration

### Adjusting Thresholds

The thresholds can be modified in `client/src/hooks/useTabVisibility.ts`:

```typescript
const STALE_THRESHOLD_MS = 2 * 60 * 1000;      // Full recovery threshold
const ROUTER_SYNC_THRESHOLD_MS = 10 * 1000;    // Router-only sync threshold
const DEBOUNCE_MS = 500;                        // Wake-up debounce
```

### Recommendations

- **ROUTER_SYNC_THRESHOLD_MS**: Keep low (10-30s) since router sync is cheap
- **STALE_THRESHOLD_MS**: Balance between battery/performance and reliability
- **DEBOUNCE_MS**: Prevent rapid-fire wake-ups when visibility + focus fire together

## Testing

To test the recovery system:

1. Navigate to a page (e.g., /deals)
2. Switch to another tab and wait 2+ minutes
3. Return to the app
4. Check console for recovery logs:
   ```
   🔄 [LIFECYCLE] Router sync triggered (idle Xs, from hidden state)
   🔄 [LIFECYCLE] App was idle for Xs - initiating full recovery
   ```
5. Verify navigation works correctly

## History

| Date | Change |
|------|--------|
| 2026-01-13 | Initial documentation created |
| 2026-01-13 | Lowered stale threshold from 5 minutes to 2 minutes |
| 2026-01-13 | Added router sync on hidden→visible transition (10s threshold) |
| 2026-01-13 | Added navigation stall detection for telemetry |
