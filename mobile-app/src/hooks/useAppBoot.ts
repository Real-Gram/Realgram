import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useVpnStore }      from '../stores/vpnStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getAdapter }       from '../services/vpnBridge';
import { Logger }           from '../utils/logger';
import { prefetchBundle }   from '../services/profileBundleService';

// Registers AppState listeners that enforce VPN policy on app lifecycle events.
// Mount this once at the root of the Main navigator shell.
export function useAppBoot(): void {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // On mount: prefetch profile bundle and sync native VPN state
    prefetchBundle();
    _syncNativeState();

    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (prev === 'active' && next === 'background') {
        const { killSwitch } = useSettingsStore.getState();
        const { connectionState, disconnect } = useVpnStore.getState();

        if (killSwitch && connectionState === 'connected') {
          Logger.info('AppBoot', 'Kill switch: disconnecting on background');
          disconnect();
        }
      }

      if (next === 'active' && prev === 'background') {
        Logger.info('AppBoot', 'App foregrounded — checking tunnel health');
        _checkTunnelOnForeground();
      }
    });

    return () => sub.remove();
  }, []);
}

// Messenger release uses banners and explicitly chosen bonus-data ads.

// On app mount, if the native service is running but JS thinks idle (app was restarted
// while VPN was active), force-sync the connected state so the user can disconnect.
async function _syncNativeState(): Promise<void> {
  try {
    const { connectionState, setConnectionState } = useVpnStore.getState();
    if (connectionState !== 'idle') return;            // already in a non-idle state
    const running = await getAdapter().isRunning();
    if (running) {
      Logger.info('AppBoot', 'Native VPN running on mount — restoring connected state');
      setConnectionState('connected');
      useVpnStore.setState({ sessionStartedAt: Date.now() });
    }
  } catch (e) {
    Logger.warn('AppBoot', `Native state sync failed: ${e}`);
  }
}

// Checks whether the native tunnel is still alive after the app was backgrounded.
// If the store says "connected" but the tunnel dropped (network switch, idle kill),
// trigger a reconnect so the user isn't left silently unprotected.
//
// Khabat, 2026-08-20: "ads kommer, klarer ikke laste den ned, lukker den, VPN
// klarer ikke fortsette tilkoblingen, må koble av og på igjen" — reported while
// CONNECTING, not disconnecting. Root cause: showing the Connect-time
// interstitial (adsService.ts's gateActionWithAd, fired in parallel with
// connect() from HomeScreen's handlePower) backgrounds the host Activity like
// any full-screen ad does, so this same active→background→active cycle fires
// mid-handshake. This function used to only handle 'connected' and 'failed' on
// the way back to foreground — a stall in 'connecting' fell through untouched.
// That state has no self-CONNECT transition (connectionMachine.ts's
// TRANSITIONS — only 'idle' and 'failed' accept CONNECT), so tapping Connect
// again silently did nothing; only disconnect() can move it out of
// 'connecting', which is exactly the manual toggle this was forcing.
async function _checkTunnelOnForeground(): Promise<void> {
  try {
    const { connectionState, connect, clearError } = useVpnStore.getState();
    const { autoConnect } = useSettingsStore.getState();

    if (connectionState === 'connected') {
      const running = await getAdapter().isRunning();
      if (!running) {
        Logger.info('AppBoot', 'Tunnel dropped in background — connecting');
        clearError();
        connect();
      }
    } else if (connectionState === 'failed' && autoConnect) {
      Logger.info('AppBoot', 'Error state on foreground + autoConnect — retrying');
      clearError();
      connect();
    } else if (connectionState === 'connecting') {
      const running = await getAdapter().isRunning();
      if (running) {
        // Handshake actually finished while backgrounded (e.g. behind the ad) —
        // sync the store the same way _syncNativeState does on cold start.
        Logger.info('AppBoot', 'Tunnel came up in background — syncing to connected');
        useVpnStore.setState({ connectionState: 'connected', sessionStartedAt: Date.now() });
      } else {
        // Orphaned attempt — unwind it via the real disconnect() action (not a
        // raw setState) so the underlying ConnectionMachine's own internal
        // state, not just the store's mirror of it, actually reaches 'idle';
        // otherwise the next CONNECT send would still be silently ignored.
        Logger.info('AppBoot', 'Connect attempt orphaned in background — resetting');
        useVpnStore.getState().disconnect();
        for (let i = 0; i < 25 && useVpnStore.getState().connectionState !== 'idle'; i++) {
          await new Promise<void>((r) => setTimeout(r, 200));
        }
        if (useVpnStore.getState().connectionState === 'idle') {
          Logger.info('AppBoot', 'Reset complete — retrying connect');
          connect();
        }
      }
    }
  } catch (e) {
    Logger.warn('AppBoot', `Tunnel health check failed: ${e}`);
  }
}
