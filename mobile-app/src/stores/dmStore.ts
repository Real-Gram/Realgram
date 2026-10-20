import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '../storage/storage';
import type { DirectMessage } from '../services/entitlementService';
import { Logger } from '../utils/logger';

/**
 * User-to-user direct messages (v0.9.33 MVP).
 *
 * Like the admin announcement inbox, transport is poll-based (no FCM):
 * `refresh()` pulls the device's full thread (inbox + sent) from list-messages.
 * The server is the source of truth, so we replace the local cache on each
 * fetch rather than merging. Bodies are decrypted server-side. Recipients are
 * addressed by RealGram ID only — no phone/email/IP is ever involved.
 */

interface DMState {
  messages:    DirectMessage[];
  lastFetchAt: number;
  sending:     boolean;
  // Retain uncertain requests so a manual retry reuses the SAME server key.
  // No automatic background send: the draft stays visible on failure.
  pendingSends: Array<{ deviceId: string; recipient: string; body: string; expireSecs: number; id: string }>;

  unreadCount: () => number;
  refresh:     (deviceId: string) => Promise<number>;            // returns # unread
  send:        (deviceId: string, recipient: string, body: string, expireSecs?: number) => Promise<void>;
  markRead:    (deviceId: string, messageId: number) => void;
  deleteMessage: (deviceId: string, messageId: number) => void;
  deleteThread:  (deviceId: string, peer: string) => void;
  react:         (deviceId: string, messageId: number, emoji: string) => Promise<void>;
}

const MAX_STORED = 200;
let refreshVersion = 0;

export const useDMStore = create<DMState>()(
  persist(
    (set, get) => ({
      messages:    [],
      lastFetchAt: 0,
      sending:     false,
      pendingSends: [],

      unreadCount: () => get().messages.filter(m => m.direction === 'in' && !m.read).length,

      refresh: async (deviceId: string) => {
        const version = ++refreshVersion;
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { listMessages } = require('../services/entitlementService');
          const fetched = await listMessages(deviceId) as DirectMessage[];
          // A slow earlier poll cannot overwrite a newer send/read refresh.
          if (version !== refreshVersion) return get().unreadCount();
          const prevUnread = get().messages.filter(m => m.direction === 'in' && !m.read).length;
          const unread = fetched.filter(m => m.direction === 'in' && !m.read).length;
          set({ messages: fetched.slice(0, MAX_STORED), lastFetchAt: Date.now() });
          if (unread > prevUnread) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const { useToastStore } = require('./toastStore');
              const n = unread - prevUnread;
              useToastStore.getState().show(
                n === 1 ? '💬 New message' : `💬 ${n} new messages`, 'info');
            } catch {}
            // OS notification for newly received messages (Issue 2). Gated by the
            // user's push-notifications setting; title-only, never the body.
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const { notifyNewIncoming } = require('../services/dmNotifications');
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const { useSettingsStore } = require('./settingsStore');
              const enabled = !!useSettingsStore.getState().pushNotifications;
              notifyNewIncoming(fetched, enabled).catch(() => {});
            } catch {}
          }
          return unread;
        } catch (e) {
          // Was fully silent — a failed refresh left whatever unread count was
          // last persisted locally standing indefinitely (until the next
          // foreground event happens to succeed), with no way to tell that's
          // what happened (Khabat, 2026-07-22: badge showed 4 with an empty
          // Inbox). Logging so a stuck badge is diagnosable next time.
          Logger.warn('DMStore', `refresh failed, keeping stale local state: ${e}`);
          return get().messages.filter(m => m.direction === 'in' && !m.read).length;
        }
      },

      send: async (deviceId, recipient, body, expireSecs = 0) => {
        if (get().sending) throw new Error('A message is already being sent');
        recipient = recipient.trim(); body = body.trim();
        if (!deviceId || !recipient || !body) throw new Error('Message and recipient are required');
        const previous = get().pendingSends.find(item => item.deviceId === deviceId && item.recipient === recipient && item.body === body && item.expireSecs === expireSecs);
        if (!previous && get().pendingSends.length >= 100) throw new Error('Please retry your unsent messages before sending more');
        const pending = previous ?? { deviceId, recipient, body, expireSecs,
          id: `rg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}` };
        set(s => ({ sending: true, pendingSends: previous ? s.pendingSends : [...s.pendingSends, pending] }));
        // Do not accept a response from a pre-send snapshot as the latest inbox.
        ++refreshVersion;
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { sendMessage } = require('../services/entitlementService');
          await sendMessage(deviceId, recipient, body, expireSecs, pending.id);
          set(s => ({ pendingSends: s.pendingSends.filter(item => item.id !== pending.id) }));
          await get().refresh(deviceId);
        } finally {
          set({ sending: false });
        }
      },

      markRead: (deviceId, messageId) => {
        ++refreshVersion;
        set(s => ({
          messages: s.messages.map(m => m.id === messageId ? { ...m, read: true } : m),
        }));
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { markMessageRead } = require('../services/entitlementService');
          markMessageRead(deviceId, messageId).catch(() => {});
        } catch {}
      },

      deleteMessage: (deviceId, messageId) => {
        ++refreshVersion;
        set(s => ({ messages: s.messages.filter(m => m.id !== messageId) }));
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { deleteMessage } = require('../services/entitlementService');
          deleteMessage(deviceId, messageId).catch(() => {});
        } catch {}
      },

      deleteThread: (deviceId, peer) => {
        ++refreshVersion;
        // Optimistically drop every message with this peer (by device or user id).
        set(s => ({ messages: s.messages.filter(m => m.peerDevice !== peer && m.peerUserId !== peer) }));
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { deleteThread } = require('../services/entitlementService');
          deleteThread(deviceId, peer).catch(() => {});
        } catch {}
      },

      react: async (deviceId, messageId, emoji) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { reactToMessage } = require('../services/entitlementService');
        try {
          const { counts, mine } = await reactToMessage(deviceId, messageId, emoji);
          set(s => ({
            messages: s.messages.map(m =>
              m.id === messageId ? { ...m, reactions: counts, myReaction: mine } : m),
          }));
        } catch (e) {
          Logger.warn('DMStore', `react failed: ${e}`);
        }
      },
    }),
    {
      name:    'realgram-dm-v1',
      storage: createJSONStorage(() => storage),
      partialize: (s) => ({ messages: s.messages, lastFetchAt: s.lastFetchAt, pendingSends: s.pendingSends }) as any,
    }
  )
);
