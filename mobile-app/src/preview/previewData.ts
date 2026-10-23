import { IS_DESIGN_PREVIEW } from "../config/designPreview";

const stamp = () => new Date().toISOString().slice(0, 19).replace("T", " ");
type Message = {
  id: number;
  direction: "in" | "out";
  peer_user_id: string;
  peer_device: string;
  body: string;
  read: boolean;
  created_at: string;
  reactions?: Record<string, number>;
  my_reaction?: string | null;
};
let messages: Message[] = [
  {
    id: 6,
    direction: "in",
    peer_user_id: "Sara",
    peer_device: "example-sara",
    body: "Vi snakkes i kveld! 👋",
    read: false,
    created_at: stamp(),
  },
  {
    id: 5,
    direction: "out",
    peer_user_id: "Sara",
    peer_device: "example-sara",
    body: "Hei! Her prøver jeg det nye Realgram-designet.",
    read: true,
    created_at: stamp(),
  },
  {
    id: 4,
    direction: "in",
    peer_user_id: "Amir",
    peer_device: "example-amir",
    body: "Takk, meldingen kom frem!",
    read: true,
    created_at: stamp(),
  },
  {
    id: 3,
    direction: "out",
    peer_user_id: "Amir",
    peer_device: "example-amir",
    body: "Dette er en lokal designsamtale.",
    read: true,
    created_at: stamp(),
  },
  {
    id: 2,
    direction: "in",
    peer_user_id: "Mina",
    peer_device: "example-mina",
    body: "Hei! Hvordan går det?",
    read: false,
    created_at: stamp(),
  },
];
export const PREVIEW_DEVICE = "realgram-design-example";
export function previewRequest(
  action: string,
  params: Record<string, string | number> = {},
): any {
  if (!IS_DESIGN_PREVIEW)
    throw new Error("Design fixtures are disabled in normal builds");
  switch (action) {
    case "list-messages":
      return { messages: messages.map((m) => ({ ...m })), peers: {} };
    case "get-messages":
      return {
        messages: [
          {
            id: 1,
            title: "Realgram",
            body: "Design preview — example data. Messages stay on this device.",
            created_at: stamp(),
          },
        ],
      };
    case "list-thread-messages":
      return { messages: [] };
    case "search-messages":
      return {
        results: messages.filter((m) =>
          m.body
            .toLowerCase()
            .includes(String(params.q ?? params.query ?? "").toLowerCase()),
        ),
      };
    case "get-typing":
      return { typing: false };
    case "set-typing":
    case "ack-message":
    case "report-message":
    case "save-real-profile":
      return {};
    case "send-message": {
      const recipient = String(params.recipient);
      const existing = messages.find(
        (m) => m.peer_user_id === recipient || m.peer_device === recipient,
      );
      const id = Math.max(0, ...messages.map((m) => m.id)) + 1;
      messages.unshift({
        id,
        direction: "out",
        peer_user_id: existing?.peer_user_id ?? recipient,
        peer_device: existing?.peer_device ?? `example-${recipient}`,
        body: String(params.body),
        read: false,
        created_at: stamp(),
      });
      return {
        message_id: id,
        recipient_user_id: existing?.peer_user_id ?? recipient,
        created_at: stamp(),
      };
    }
    case "mark-message-read":
    case "read-message": {
      messages = messages.map((m) =>
        m.id === Number(params.message_id) ? { ...m, read: true } : m,
      );
      return {};
    }
    case "delete-message":
      messages = messages.filter((m) => m.id !== Number(params.message_id));
      return {};
    case "delete-thread":
    case "block-user":
      messages = messages.filter(
        (m) => m.peer_device !== params.peer && m.peer_user_id !== params.peer,
      );
      return {};
    case "react-message": {
      const emoji = String(params.emoji);
      const counts = { [emoji]: 1 };
      messages = messages.map((m) =>
        m.id === Number(params.message_id)
          ? { ...m, reactions: counts, my_reaction: emoji }
          : m,
      );
      return { counts, mine: emoji };
    }
    case "referral-earnings":
      return {
        pct: 0,
        count: 3,
        total_earned_bytes: 0,
        invitees: ["Sara", "Amir", "Mina"].map((label) => ({
          label,
          used_bytes: 0,
          earned_bytes: 0,
        })),
      };
    case "get-peer-profile":
      return {
        account: "example",
        user_id: String(params.device_id),
        handle: "example",
        display_name: String(params.device_id).replace("example-", ""),
        avatar_emoji: "👤",
        avatar_color: "#3399FF",
        persona: "",
      };
    case "call-history":
      return {
        calls: ["Sara", "Amir"].map((name, index) => ({
          call_id: `example-call-${index}`,
          direction: index ? "out" : "in",
          peer_device: `example-${name.toLowerCase()}`,
          peer_user_id: name,
          kind: "audio",
          status: "ended",
          end_reason: "caller_hangup",
          duration_secs: index ? 0 : 125,
          started_at: stamp(),
        })),
      };
    default:
      throw new Error(
        "Design preview: this action is not connected to a live service",
      );
  }
}
