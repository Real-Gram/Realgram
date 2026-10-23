import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ThemeProvider } from "../theme";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { BottomNav, NavTab } from "../components/BottomNav";
import { Toast } from "../components/Toast";
import { Colors } from "../design/tokens";
import { InboxScreen } from "../screens/InboxScreen";
import {
  ConnectionScreen,
  InviteClanScreen,
  MessengerProfileScreen,
  RecentCallsScreen,
} from "../screens/MessengerScreens";
import { useAuthStore } from "../stores/authStore";
import { useIdentityStore } from "../stores/identityStore";
import { useDMStore } from "../stores/dmStore";
import { useInboxStore } from "../stores/inboxStore";
import { useServerStore, BUNDLED_CF_EDGE } from "../stores/serverStore";
import { useVpnStore } from "../stores/vpnStore";
import { useCallStore } from "../stores/callStore";
import { useSettingsStore } from "../stores/settingsStore";
import { listMessages } from "../services/entitlementService";
import { IS_DESIGN_PREVIEW } from "../config/designPreview";
import { PREVIEW_DEVICE } from "./previewData";
import { APP_VERSION } from "../utils/version";

const Tab = createBottomTabNavigator();
const routes: Record<string, NavTab> = {
  Chats: "chats",
  Calls: "calls",
  Connection: "servers",
  Clan: "clan",
  Profile: "profile",
};
const screens: Partial<Record<NavTab, string>> = {
  chats: "Chats",
  calls: "Calls",
  servers: "Connection",
  clan: "Clan",
  profile: "Profile",
};
const notice = () =>
  Alert.alert(
    "Design preview",
    "Example data only. Calling, VPN connections and live account actions are not enabled in this design APK.",
  );

async function preparePreview() {
  if (!IS_DESIGN_PREVIEW) throw new Error("Design preview is disabled");
  useAuthStore
    .getState()
    .loginWithDevice({
      device_id: PREVIEW_DEVICE,
      user_id: "RG-EXAMPLE",
      referral_code: "RG2026",
      plan: "free",
      quota_bytes_total: 5 * 1024 ** 3,
      quota_bytes_used: 0,
      valid_until: null,
      blocked: false,
      server: null,
    });
  useIdentityStore.setState({
    displayName: "Khabat",
    handle: "dinprofil",
    avatarEmoji: "👤",
    avatarColor: "#3399FF",
    customized: true,
  });
  useDMStore.setState({ messages: await listMessages(PREVIEW_DEVICE) });
  useInboxStore.setState({
    messages: [
      {
        id: 1,
        title: "Realgram",
        body: "Design preview — example data. Messages stay on this device.",
        createdAt: new Date().toISOString(),
        read: true,
      },
    ],
  });
  useServerStore.setState({
    servers: [
      {
        ...BUNDLED_CF_EDGE,
        id: "example-connection",
        country: "Finland (example)",
        city: "Design preview",
        premium: false,
      },
    ],
    selectedId: "example-connection",
    fetchServers: async () => {},
    loadBootstrapIfEmpty: async () => true,
  });
  useVpnStore.setState({
    connectionState: "idle",
    connect: notice,
    disconnect: notice,
    switchServer: notice,
  });
  useCallStore.setState({ startOutgoingCall: async () => notice() });
}
function Chats() {
  return <InboxScreen embedded />;
}
function Shell() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [languages, setLanguages] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    let current = true;
    preparePreview()
      .then(() => {
        if (current) setReady(true);
      })
      .catch(() => {
        if (current) setError(true);
      });
    return () => {
      current = false;
    };
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg.base }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: "#122744",
        }}
      >
        <Text style={{ color: "#BFDFFF", textAlign: "center", fontSize: 12 }}>
          REALGRAM DESIGN · v{APP_VERSION} · EXAMPLE DATA
        </Text>
      </View>
      {!ready ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          {error ? (
            <Text style={{ color: "#FFFFFF" }}>
              Could not open design preview. Restart the app.
            </Text>
          ) : (
            <ActivityIndicator color={Colors.blue[400]} />
          )}
        </View>
      ) : (
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName="Chats"
            tabBar={(props) => (
              <BottomNav
                active={
                  routes[props.state.routes[props.state.index].name] ?? "chats"
                }
                onPress={(tab) => {
                  const screen = screens[tab];
                  if (screen) props.navigation.navigate(screen);
                }}
              />
            )}
          >
            <Tab.Screen name="Chats" component={Chats} />
            <Tab.Screen name="Calls" component={RecentCallsScreen} />
            <Tab.Screen name="Connection" component={ConnectionScreen} />
            <Tab.Screen name="Clan" component={InviteClanScreen} />
            <Tab.Screen name="Profile">
              {({ navigation }) => (
                <MessengerProfileScreen
                  onSettings={() => setLanguages(true)}
                  onClans={() => navigation.navigate("Clan")}
                  onSignOut={notice}
                />
              )}
            </Tab.Screen>
          </Tab.Navigator>
          <Toast />
        </NavigationContainer>
      )}
      <Modal
        visible={languages}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguages(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#00000088",
          }}
        >
          <View
            style={{
              padding: 24,
              paddingBottom: insets.bottom + 24,
              backgroundColor: Colors.bg.surface,
              gap: 16,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 22 }}>
              Preview language
            </Text>
            {[
              ["en", "English"],
              ["fa", "فارسی"],
              ["ru", "Русский"],
              ["zh", "中文"],
            ].map(([code, label]) => (
              <TouchableOpacity
                accessibilityRole="button"
                key={code}
                style={{ padding: 14 }}
                onPress={() => {
                  useSettingsStore.getState().setLanguage(code);
                  setLanguages(false);
                }}
              >
                <Text style={{ color: Colors.blue[400], fontSize: 18 }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
export function DesignPreviewApp() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <StatusBar
              translucent
              barStyle="light-content"
              backgroundColor={Colors.bg.void}
            />
            <Shell />
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
