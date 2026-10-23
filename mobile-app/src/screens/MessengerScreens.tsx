import { IS_DESIGN_PREVIEW } from '../config/designPreview';
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav } from "../components/BottomNav";
import { AdBanner } from "../components/AdBanner";
import { WatchAdCard } from "../components/WatchAdCard";
import { Colors } from "../design/tokens";
import { useT } from "../i18n";
import { useAuthStore } from "../stores/authStore";
import { useIdentityStore } from "../stores/identityStore";
import { useProfilePicStore } from "../stores/profilePicStore";
import { useServerStore } from "../stores/serverStore";
import { useVpnStore } from "../stores/vpnStore";
import { useCallStore } from "../stores/callStore";
import { useToastStore } from "../stores/toastStore";
import {
  getReferralEarnings,
  ReferralEarnings,
} from "../services/referralEarningsService";
import {
  RealCallSignalingClient,
  CallHistoryEntry,
} from "../services/callSignalingClient";
import { pushEcosystemProfile } from "../services/ecosystemProfileService";
import { CALLING_ENABLED } from "../config/featureFlags";
import { formatBytes } from "../utils/formatters";

function Page({
  title,
  children,
  refresh,
}: {
  title: string;
  children: React.ReactNode;
  refresh?: { busy: boolean; run: () => void };
}) {
  const insets = useSafeAreaInsets();
  const { isRTL } = useT();
  return (
    <View style={[s.page, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: BottomNav.CONTENT_HEIGHT + insets.bottom + 24 },
        ]}
        refreshControl={
          refresh && (
            <RefreshControl
              refreshing={refresh.busy}
              onRefresh={refresh.run}
              tintColor={Colors.blue[400]}
            />
          )
        }
      >
        <Text accessibilityRole="header" style={[s.title, isRTL && s.rtl]}>
          {title}
        </Text>
        {children}
      </ScrollView>
    </View>
  );
}
function Action({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[s.action, disabled && s.disabled]}
    >
      <Text style={s.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}
function Note({ label }: { label: string }) {
  const { isRTL } = useT();
  return <Text style={[s.note, isRTL && s.rtl]}>{label}</Text>;
}
function useInvite() {
  const { t } = useT();
  const code = useAuthStore((s) => s.user?.referralCode ?? "");
  return {
    code,
    share: () => {
      if (!code) return;
      if (IS_DESIGN_PREVIEW) { useToastStore.getState().show('Example invitation code — design preview only', 'info'); return; }
      Share.share({
        message: `${t("ms.inviteMessage")}\nhttps://realgram.no/?ref=${encodeURIComponent(code)}\n${code}`,
      }).catch(() =>
        useToastStore.getState().show(t("ms.shareFailed"), "error"),
      );
    },
  };
}

// Profile renders from the existing messenger identity without a game-server request.
export function MessengerProfileScreen({
  onSettings,
  onClans,
  onSignOut,
}: {
  onSettings: () => void;
  onClans: () => void;
  onSignOut: () => void;
}) {
  const { t, isRTL } = useT();
  const user = useAuthStore((s) => s.user);
  const identity = useIdentityStore();
  const photo = useProfilePicStore((s) => s.url);
  const { code, share } = useInvite();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(identity.displayName);
  useEffect(() => {
    if (user?.deviceId) identity.seedFromId(user.deviceId);
  }, [user?.deviceId]);
  return (
    <Page title={t("nav.profile")}>
      <View style={s.identity}>
        {photo ? (
          <Image source={{ uri: photo }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.emoji}>{identity.avatarEmoji}</Text>
          </View>
        )}
        <Text style={s.name}>
          {identity.displayName ||
            (identity.handle ? `@${identity.handle}` : "Realgram")}
        </Text>
        {!!identity.handle && <Text style={s.handle}>@{identity.handle}</Text>}
        {!!user?.userId && (
          <Text selectable style={s.note}>
            {user.userId}
          </Text>
        )}
      </View>
      <View style={s.card}>
        {editing ? (
          <>
            <TextInput
              accessibilityLabel={t("id.nickname")}
              value={name}
              onChangeText={setName}
              maxLength={40}
              style={[s.input, isRTL && s.rtl]}
            />
            <Action
              label={t("ms.save")}
              onPress={() => {
                identity.setDisplayName(name);
                if (user?.deviceId)
                  void pushEcosystemProfile(
                    user.deviceId,
                    identity.handle ?? "",
                    name.trim().slice(0, 40),
                    identity.avatarEmoji,
                    identity.avatarColor,
                    identity.persona ?? "",
                  );
                setEditing(false);
              }}
            />
          </>
        ) : (
          <Action
            label={t("ms.editName")}
            onPress={() => {
              setName(identity.displayName);
              setEditing(true);
            }}
          />
        )}
        <Action label={t("nav.clan")} onPress={onClans} />
        <Action label={t("ms.invite")} onPress={share} disabled={!code} />
        <Action label={t("st.title")} onPress={onSettings} />
      </View>
      <View style={s.card}>
        <Text style={s.heading}>{t("ms.free")}</Text>
        <Note label={t("ms.adModel")} />
      </View>
      <AdBanner show slot="home_banner" />
      <Action label={t("ms.signOut")} onPress={onSignOut} />
    </Page>
  );
}

// Clan is the invite network. No game guild, contest or wallet is needed.
export function InviteClanScreen() {
  const { t } = useT();
  const deviceId = useAuthStore((s) => s.user?.deviceId ?? "");
  const { code, share } = useInvite();
  const [data, setData] = useState<ReferralEarnings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let current = true;
      setData(null);
      setError(false);
      if (!deviceId) {
        setBusy(false);
        return;
      }
      setBusy(true);
      getReferralEarnings(deviceId)
        .then((d) => {
          if (current) setData(d);
        })
        .catch(() => {
          if (current) setError(true);
        })
        .finally(() => {
          if (current) setBusy(false);
        });
      return () => {
        current = false;
      };
    }, [deviceId, refresh]),
  );
  return (
    <Page
      title={t("nav.clan")}
      refresh={{ busy, run: () => setRefresh((n) => n + 1) }}
    >
      <Note label={t("ms.clanAbout")} />
      <View style={s.card}>
        <Text style={s.heading}>{t("ms.inviteCode")}</Text>
        <Text selectable style={s.code}>
          {code || "—"}
        </Text>
        <Action label={t("ms.invite")} onPress={share} disabled={!code} />
      </View>
      <View style={s.card}>
        <Text style={s.heading}>
          {t("ms.invitedFriends")}
          {data ? ` · ${data.count}` : ""}
        </Text>
        {busy && <ActivityIndicator color={Colors.blue[400]} />}
        {error && (
          <>
            <Note label={t("ms.loadFailed")} />
            <Action
              label={t("ms.retry")}
              onPress={() => setRefresh((n) => n + 1)}
            />
          </>
        )}
        {data?.invitees.length === 0 && <Note label={t("ms.noInvites")} />}
        {data?.invitees.map((friend, i) => (
          <View key={`${friend.label}-${i}`} style={s.row}>
            <Note label={friend.label} />
          </View>
        ))}
      </View>
    </Page>
  );
}

export function ConnectionScreen() {
  const { t } = useT();
  const {
    servers,
    selectedId,
    selectServer,
    isLoading,
    fetchServers,
    loadBootstrapIfEmpty,
  } = useServerStore();
  const token = useAuthStore((s) => s.token);
  const refreshNodes = () => {
    void Promise.allSettled([
      loadBootstrapIfEmpty(),
      ...(token ? [fetchServers(token)] : []),
    ]);
  };
  const { connectionState, connect, disconnect, switchServer } = useVpnStore();
  const user = useAuthStore((s) => s.user);
  const activeCall = useCallStore((s) => s.activeCall);
  const connected = connectionState === "connected";
  const busy =
    connectionState === "connecting" || connectionState === "disconnecting";
  const sessionBytes = useVpnStore((s) => s.sessionBytes);
  const used =
    (user?.quotaBytesUsed ?? 0) +
    (connected ? sessionBytes.sent + sessionBytes.received : 0);
  const remaining = Math.max(0, (user?.quotaBytesTotal ?? 0) - used);
  const quotaReached = user?.plan === "free" && remaining === 0;
  const selected = servers.find((n) => n.id === selectedId);
  const available = servers.filter(
    (n) =>
      !n.comingSoon &&
      n.available !== false &&
      (!n.premium || user?.plan !== "free"),
  );
  useEffect(() => {
    if (
      !busy &&
      !connected &&
      !activeCall &&
      available.length &&
      !available.some((n) => n.id === selectedId)
    )
      selectServer(available[0].id);
  }, [busy, connected, activeCall, available, selectedId, selectServer]);
  return (
    <Page
      title={t("ms.connection")}
      refresh={{ busy: !!isLoading, run: refreshNodes }}
    >
      <Note label={t("ms.connectionAbout")} />
      <View style={s.card}>
        <Text style={s.heading}>
          {t(
            connected
              ? "ms.connected"
              : busy
                ? "ms.connecting"
                : "ms.disconnected",
          )}
        </Text>
        {selected && <Note label={selected.country} />}
        <Action
          disabled={
            busy ||
            !!activeCall ||
            (!connected && (quotaReached || !available.length))
          }
          label={t(connected ? "ms.disconnect" : "ms.connect")}
          onPress={() => {
            if (connected) disconnect();
            else connect();
          }}
        />
        {!!activeCall && <Note label={t("ms.callInProgress")} />}
        {quotaReached && <Note label={t("ms.quotaReached")} />}
        {user && (
          <Note label={`${t("ms.dataLeft")}: ${formatBytes(remaining)}`} />
        )}
      </View>
      <WatchAdCard />
      <View style={s.card}>
        <Text style={s.heading}>{t("ms.chooseConnection")}</Text>
        {available.length === 0 && (
          <>
            <Note label={t("ms.noConnections")} />
            <Action
              label={t("ms.retry")}
              onPress={refreshNodes}
              disabled={!!isLoading}
            />
          </>
        )}
        {available.map((node) => (
          <Action
            key={node.id}
            disabled={busy || !!activeCall}
            label={`${node.id === selectedId ? "● " : ""}${node.country}`}
            onPress={() => {
              if (node.id !== selectedId) {
                selectServer(node.id);
                if (connected) switchServer();
              }
            }}
          />
        ))}
      </View>
      <AdBanner show />
    </Page>
  );
}

export function RecentCallsScreen() {
  const { t } = useT();
  const deviceId = useAuthStore((s) => s.user?.deviceId ?? "");
  const activeCall = useCallStore((s) => s.activeCall);
  const [calls, setCalls] = useState<CallHistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let current = true;
      setCalls([]);
      setFailed(false);
      if (!deviceId) {
        setBusy(false);
        return;
      }
      setBusy(true);
      RealCallSignalingClient.history(deviceId)
        .then((rows) => {
          if (current) setCalls(rows);
        })
        .catch(() => {
          if (current) setFailed(true);
        })
        .finally(() => {
          if (current) setBusy(false);
        });
      return () => {
        current = false;
      };
    }, [deviceId, refresh, activeCall]),
  );
  return (
    <Page
      title={t("nav.calls")}
      refresh={{ busy, run: () => setRefresh((n) => n + 1) }}
    >
      <Note label={t("ms.callAbout")} />
      {busy && <ActivityIndicator color={Colors.blue[400]} />}
      {failed && (
        <>
          <Note label={t("ms.loadFailed")} />
          <Action
            label={t("ms.retry")}
            onPress={() => setRefresh((n) => n + 1)}
          />
        </>
      )}
      {!busy && !failed && calls.length === 0 && (
        <Note label={t("ms.noCalls")} />
      )}
      {calls.map((call) => (
        <View style={s.card} key={call.call_id}>
          <Text style={s.heading}>{call.peer_user_id || t("ms.contact")}</Text>
          <Note
            label={`${t(call.direction === "out" ? "ms.outgoing" : "ms.incoming")} · ${call.started_at} UTC`}
          />
          <Note
            label={
              call.duration_secs > 0
                ? `${call.duration_secs}s`
                : t("ms.notConnected")
            }
          />
          {CALLING_ENABLED && (
            <Action
              label={t("ms.audioCall")}
              disabled={!!activeCall}
              onPress={() => {
                void useCallStore
                  .getState()
                  .startOutgoingCall(
                    call.peer_device,
                    call.peer_user_id || t("ms.contact"),
                    false,
                  );
              }}
            />
          )}
        </View>
      ))}
    </Page>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.bg.base },
  content: { padding: 20, gap: 16 },
  title: {
    color: Colors.text.primary,
    fontSize: 30,
    fontWeight: "700",
    marginVertical: 12,
  },
  card: {
    backgroundColor: Colors.bg.glass,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  identity: { alignItems: "center", gap: 10, paddingVertical: 16 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: {
    backgroundColor: Colors.bg.elevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.blue[400],
  },
  emoji: { fontSize: 40 },
  name: { fontSize: 24, fontWeight: "700", color: Colors.text.primary },
  handle: { color: Colors.blue[400], fontSize: 15 },
  heading: { color: Colors.text.primary, fontSize: 17, fontWeight: "600" },
  note: { color: Colors.text.secondary, fontSize: 14, lineHeight: 22 },
  action: {
    minHeight: 48,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(51,153,255,0.12)",
  },
  actionText: {
    color: Colors.blue[400],
    fontSize: 15,
    textAlign: "center",
    fontWeight: "600",
  },
  disabled: { opacity: 0.45 },
  code: {
    fontSize: 27,
    color: Colors.gold[400],
    fontWeight: "700",
    textAlign: "center",
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  input: {
    color: Colors.text.primary,
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 12,
    padding: 12,
  },
  rtl: { textAlign: "right", writingDirection: "rtl" },
});
