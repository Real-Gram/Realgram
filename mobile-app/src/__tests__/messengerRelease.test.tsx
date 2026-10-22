import React from "react";
import renderer, { act } from "react-test-renderer";
import { Share } from "react-native";

jest.mock("../i18n", () => ({
  useT: () => ({ t: (k: string) => k, isRTL: false }),
}));
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: any) => require("react").useEffect(effect, [effect]),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
jest.mock("../components/AdBanner", () => ({ AdBanner: () => null }));
jest.mock("../components/WatchAdCard", () => ({ WatchAdCard: () => null }));
let mockUser: any = {
  deviceId: "dev-me",
  userId: "RG-ME",
  referralCode: "JOIN42",
  plan: "free",
  quotaBytesTotal: 1024,
  quotaBytesUsed: 0,
};
const mockSetName = jest.fn();
const mockProfile = {
  displayName: "Alice",
  handle: "alice",
  avatarEmoji: "🦊",
  avatarColor: "#3399FF",
  persona: null,
  seedFromId: jest.fn(),
  setDisplayName: mockSetName,
};
jest.mock("../stores/authStore", () => ({
  useAuthStore: (sel: any) => sel({ user: mockUser }),
}));
jest.mock("../stores/identityStore", () => ({
  useIdentityStore: () => mockProfile,
}));
jest.mock("../stores/profilePicStore", () => ({
  useProfilePicStore: (sel: any) => sel({ url: "" }),
}));
jest.mock("../stores/toastStore", () => ({
  useToastStore: { getState: () => ({ show: jest.fn() }) },
}));
const mockPushProfile = jest.fn();
jest.mock("../services/ecosystemProfileService", () => ({
  pushEcosystemProfile: (...args: any[]) => mockPushProfile(...args),
}));
const mockReferrals = jest.fn();
jest.mock("../services/referralEarningsService", () => ({
  getReferralEarnings: (...args: any[]) => mockReferrals(...args),
}));
const mockHistory = jest.fn();
jest.mock("../services/callSignalingClient", () => ({
  RealCallSignalingClient: {
    history: (...args: any[]) => mockHistory(...args),
  },
}));
const mockCall = jest.fn();
jest.mock("../stores/callStore", () => ({
  useCallStore: Object.assign((sel: any) => sel({ activeCall: null }), {
    getState: () => ({ startOutgoingCall: mockCall }),
  }),
}));
const mockConnect = jest.fn();
jest.mock("../stores/vpnStore", () => ({
  useVpnStore: (sel?: any) => {
    const state = {
      connectionState: "idle",
      connect: mockConnect,
      disconnect: jest.fn(),
      switchServer: jest.fn(),
      sessionBytes: { sent: 0, received: 0 },
    };
    return sel ? sel(state) : state;
  },
}));
jest.mock("../stores/serverStore", () => ({
  useServerStore: () => ({
    servers: [{ id: "free-node", country: "Finland" }],
    selectedId: "free-node",
    selectServer: jest.fn(),
  }),
}));
import {
  ConnectionScreen,
  InviteClanScreen,
  MessengerProfileScreen,
  RecentCallsScreen,
} from "../screens/MessengerScreens";
import { messengerDestination } from "../navigation/messengerRoutes";

let tree: renderer.ReactTestRenderer;
async function mount(element: React.ReactElement) {
  await act(async () => {
    tree = renderer.create(element);
  });
}
function press(label: string) {
  const text = tree.root
    .findAllByType("Text" as any)
    .find((n) => n.props.children === label);
  if (!text) throw new Error(`Missing button: ${label}`);
  let button = text.parent;
  while (button && typeof button.props.onPress !== "function")
    button = button.parent;
  if (!button) throw new Error(`Missing action: ${label}`);
  button.props.onPress();
}
beforeEach(() => {
  jest.clearAllMocks();
  mockUser.plan = "free";
  mockUser.quotaBytesUsed = 0;
  mockReferrals.mockResolvedValue({ count: 1, invitees: [{ label: "Bob" }] });
  mockHistory.mockResolvedValue([]);
  mockCall.mockResolvedValue(undefined);
  mockPushProfile.mockResolvedValue(undefined);
  jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction });
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  jest.restoreAllMocks();
});

it("opens messenger destinations but rejects old game and payment entry points", () => {
  for (const key of [
    "game",
    "heroes",
    "dailyluck",
    "wallet",
    "transfer",
    "upgrade",
    "__proto__",
  ])
    expect(messengerDestination(key)).toBeNull();
  expect(messengerDestination("clan")).toBe("Clan");
  expect(messengerDestination("chats")).toBe("Chats");
});
it("keeps the local profile usable without fetching a game summary and saves the same identity", async () => {
  await mount(
    <MessengerProfileScreen
      onSettings={jest.fn()}
      onClans={jest.fn()}
      onSignOut={jest.fn()}
    />,
  );
  expect(
    tree.root
      .findAllByType("Text" as any)
      .map((n) => n.props.children)
      .flat()
      .join(" "),
  ).toContain("Alice");
  act(() => press("ms.editName"));
  act(() =>
    tree.root.findByType("TextInput" as any).props.onChangeText("New name"),
  );
  await act(async () => press("ms.save"));
  expect(mockSetName).toHaveBeenCalledWith("New name");
  expect(mockPushProfile).toHaveBeenCalledWith(
    "dev-me",
    "alice",
    "New name",
    "🦊",
    "#3399FF",
    "",
  );
  expect(mockReferrals).not.toHaveBeenCalled();
  expect(mockHistory).not.toHaveBeenCalled();
});
it("keeps invitations usable when the clan list fails, then retries with real data", async () => {
  mockReferrals.mockRejectedValueOnce(new Error("offline"));
  await mount(<InviteClanScreen />);
  expect(
    tree.root
      .findAllByType("Text" as any)
      .map((n) => n.props.children)
      .flat()
      .join(" "),
  ).toContain("ms.loadFailed");
  await act(async () => press("ms.invite"));
  expect(Share.share).toHaveBeenCalledWith({
    message: expect.stringContaining("https://realgram.no/?ref=JOIN42"),
  });
  await act(async () => press("ms.retry"));
  expect(
    tree.root
      .findAllByType("Text" as any)
      .map((n) => n.props.children)
      .flat()
      .join(" "),
  ).toContain("Bob");
});
it("lets a free-plan account call back from call history", async () => {
  mockHistory.mockResolvedValue([
    {
      call_id: "call-1",
      peer_device: "dev-b",
      peer_user_id: "RG-BOB",
      direction: "in",
      started_at: "2026-10-22 10:00:00",
      duration_secs: 12,
    },
  ]);
  await mount(<RecentCallsScreen />);
  await act(async () => press("ms.audioCall"));
  expect(mockCall).toHaveBeenCalledWith("dev-b", "RG-BOB", false);
});
it("offers bonus data without a purchase when connection quota is exhausted", async () => {
  mockUser.quotaBytesUsed = 1024;
  await mount(<ConnectionScreen />);
  expect(
    tree.root
      .findAllByType("Text" as any)
      .map((n) => n.props.children)
      .flat()
      .join(" "),
  ).toContain("ms.quotaReached");
  expect(mockConnect).not.toHaveBeenCalled();
  const buttons = tree.root.findAll(
    (n) => n.props.accessibilityRole === "button" && n.props.disabled === true,
  );
  expect(buttons.length).toBeGreaterThan(0);
});
