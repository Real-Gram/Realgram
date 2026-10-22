// Account recovery is independent of the optional game client.
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, WebViewNavigation } from "react-native-webview";
import { Colors, Radius, Spacing, Typography } from "../design/tokens";
import { useT } from "../i18n";
import { useIdentityStore } from "../stores/identityStore";
import { useAuthStore } from "../stores/authStore";
import { linkRealAccount } from "../services/realWalletService";
import { parseDeepLink } from "../services/deepLinkService";
import { pushEcosystemProfile } from "../services/ecosystemProfileService";
const PANEL_API = "https://api.realgram.no/api.php";

export function RealGramLinkWebView({
  deviceId,
  onLinked,
  onClose,
}: {
  deviceId: string;
  onLinked: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const { t } = useT();
  const identity = useIdentityStore();

  const url = `${PANEL_API}?mobile=1&action=realgram-link-gate&_token=realgram-mobile-diag-v1&device_id=${encodeURIComponent(deviceId)}`;

  // After linking: update authStore and push profile to the ecosystem so all
  // REAL apps immediately see the correct avatar/handle without re-asking.
  const afterLink = useCallback(
    (account: string) => {
      useAuthStore.getState().setRealId(account);
      pushEcosystemProfile(
        deviceId,
        identity.handle ?? "",
        identity.displayName,
        identity.avatarEmoji,
        identity.avatarColor,
        identity.persona ?? "",
      );
      onLinked();
    },
    [deviceId, identity, onLinked],
  );

  // Handle realgram:// deep-links that the linking page redirects to.
  const handleNavChange = useCallback(
    (state: WebViewNavigation) => {
      if (!state.url.startsWith("realgram://")) return;
      const action = parseDeepLink(state.url);
      if (action?.type !== "LINK_REAL") return;
      if (action.deviceId && action.deviceId !== deviceId) return;

      setBusy(true);
      linkRealAccount(deviceId, action.account, action.ts, action.sig)
        .then(() => afterLink(action.account))
        .catch(() => setBusy(false));
    },
    [deviceId, afterLink],
  );

  // Handle postMessage from pages that prefer JS messaging over deep-link.
  const handleMessage = useCallback(
    (e: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data) as Record<string, unknown>;
        if (msg.type !== "realid-linked") return;
        const { account, ts, sig } = msg as {
          account: string;
          ts: number;
          sig: string;
        };
        if (!account || !ts || !sig) return;
        setBusy(true);
        linkRealAccount(deviceId, account, ts, sig)
          .then(() => afterLink(account))
          .catch(() => setBusy(false));
      } catch {
        /* ignore non-JSON messages */
      }
    },
    [deviceId, afterLink],
  );

  return (
    <View style={[wvStyles.container, { paddingTop: insets.top }]}>
      <View style={wvStyles.bar}>
        <TouchableOpacity
          onPress={onClose}
          style={wvStyles.backBtn}
          hitSlop={12}
        >
          <Text style={wvStyles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={wvStyles.barTitle}>RealGram</Text>
        <View style={wvStyles.backBtn} />
      </View>
      {busy ? (
        <View style={wvStyles.loader}>
          <ActivityIndicator color={Colors.gold[400]} size="large" />
          <Text style={wvStyles.linkingText}>{t("realId.retrying")}</Text>
        </View>
      ) : (
        <WebView
          source={{ uri: url }}
          style={wvStyles.web}
          startInLoadingState
          renderLoading={() => (
            <View style={wvStyles.loader}>
              <ActivityIndicator color={Colors.gold[400]} size="large" />
            </View>
          )}
          originWhitelist={["https://*", "realgram://*"]}
          onNavigationStateChange={handleNavChange}
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={`
            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1, maximum-scale=1';
            document.head.appendChild(meta);
            true;
          `}
        />
      )}
    </View>
  );
}

const wvStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.void },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  barTitle: {
    fontSize: 16,
    fontFamily: Typography.family.heading,
    color: Colors.text.primary,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bg.surface,
    borderRadius: 18,
  },
  backText: { fontSize: 22, color: Colors.text.secondary, marginTop: -2 },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[3],
    paddingHorizontal: Spacing[6],
  },
  linkingText: {
    fontSize: 14,
    color: Colors.text.muted,
    fontFamily: Typography.family.body,
  },
  web: { flex: 1, backgroundColor: Colors.bg.void },
});
