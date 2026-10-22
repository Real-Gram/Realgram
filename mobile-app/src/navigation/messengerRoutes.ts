// First release: only free messaging, invitations and connection tools.
const DESTINATIONS: Record<string, string> = {
  home: "Servers",
  servers: "Servers",
  chats: "Chats",
  calls: "Calls",
  profile: "Profile",
  clan: "Clan",
  settings: "Settings",
  diagnostics: "Diagnostics",
  activity: "Activity",
  ai: "AI",
  inbox: "Inbox",
  support: "Inbox",
  "trustai-link": "TrustAiLink",
};
export function messengerDestination(key: string): string | null {
  return Object.prototype.hasOwnProperty.call(DESTINATIONS, key)
    ? DESTINATIONS[key]
    : null;
}
