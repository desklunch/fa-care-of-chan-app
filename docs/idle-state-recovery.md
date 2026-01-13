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

### Idle Time Measurement Bug (Fixed 2026-01-13)

A critical bug was discovered where idle time measurement was unreliable:

**Problem:** The `visibilitychange` event sometimes doesn't fire when switching tabs, and even when it does, the measured idle time could be incorrect (e.g., showing 33ms after 11 minutes of actual idle).

**Root Cause:**
1. `visibilitychange` to `visible` may not fire in all browsers/scenarios
2. The `focus` event fires but doesn't know the tab was hidden
3. The `lastUserInteractionRef` timestamp could be updated by other events racing with the wake-up handler

**Solution:**
1. Track hidden state independently using `wasHiddenRef` - set on blur AND visibility hidden
2. Pass `wasHiddenRef` value from focus handler (not just visibility handler)
3. Always sync router when `fromHiddenState` is true, regardless of measured idle time
4. Reset `wasHiddenRef` after both focus and visibility wake-ups

## Solution: Proactive Recovery

Rather than trying to detect the frozen state, we proactively recover when returning from hidden state.

### Recovery Thresholds

| Threshold | Value | Action |
|-----------|-------|--------|
| Router Sync | Any hidden→visible | Dispatch popstate event to force wouter to re-read browser URL |
| Full Recovery | 2 minutes | Clear CSRF token + router sync + invalidate queries |

### Recovery Actions

1. **Router Sync** (ANY hidden→visible transition)
   - Multi-stage recovery with escalating remediation:
     - **Attempt 1:** Dispatch `popstate` event (triggers wouter's subscription)
     - **Attempt 2:** Pathname mutation via `replaceState` (temp path + back) with `popstate` - forces pathname change detection without adding history entries
     - **Attempt 3:** Hard reload as ultimate fallback for broken subscriptions
   - Detects URL mismatch between browser state and wouter's internal state
   - Verifies sync success via `setTimeout(50ms)` after each attempt (allows React's useEffect to commit updates)
   - Preserves original `history.state` throughout all attempts
   - Triggered whenever `wasHiddenRef` is true, regardless of measured idle time
   
   **Technical Note:** The browser URL is already correct in mismatch cases. The challenge is that wouter's `useSyncExternalStore` subscription may become stale after extended tab suspension. Using `replaceState` (not `pushState`) ensures no duplicate history entries accumulate. The 50ms verification delay allows React's commit phase to complete before checking if wouter updated.

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
const STALE_THRESHOLD_MS = 2 * 60 * 1000;      // 2 minutes for full recovery

// Recovery is triggered when:
// 1. wasHiddenRef is true -> ALWAYS sync router (regardless of measured idle time)
// 2. Measured idle > 2 minutes -> Full recovery (CSRF clear + invalidate queries)
```

### Hidden State Tracking

The hook tracks whether the tab was hidden using `wasHiddenRef`:
- Set to `true` when `document.hidden` becomes true OR window loses focus (blur)
- Reset to `false` after recovery on visible transition OR focus-based wake-up
- Passed to `handleWakeUp` as `fromHiddenState` flag
- **Critical:** Focus handler now checks `wasHiddenRef` to catch cases where `visibilitychange` didn't fire

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
const DEBOUNCE_MS = 500;                        // Wake-up debounce
```

### Recommendations

- **Router sync**: Always runs on hidden→visible transition (no threshold, very cheap)
- **STALE_THRESHOLD_MS**: Balance between battery/performance and reliability (2 minutes default)
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
| 2026-01-13 | **Fixed critical bug:** Focus handler now checks `wasHiddenRef` and passes it to wake-up |
| 2026-01-13 | **Fixed critical bug:** Router sync now triggers on ANY hidden→visible transition (removed idle time requirement) |
| 2026-01-13 | **Fixed critical bug:** Blur handler now sets `wasHiddenRef=true` to catch visibility gaps |
| 2026-01-13 | Attempted fix using wouter's `setLocation()` API - didn't work because replaceState doesn't fire popstate |
| 2026-01-13 | Attempted fix with popstate dispatch only - didn't work because wouter subscription may be stale |
| 2026-01-13 | Implemented multi-stage recovery: (1) popstate, (2) pathname mutation + popstate, (3) hard reload fallback |
| 2026-01-13 | Fixed verification timing: queueMicrotask/requestAnimationFrame were too fast, switched to setTimeout(50ms) |
| 2026-01-13 | **Final fix:** Multi-stage recovery with setTimeout verification allows React to commit useEffect updates before checking sync status |
