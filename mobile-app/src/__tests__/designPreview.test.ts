jest.mock("../config/designPreview", () => ({ IS_DESIGN_PREVIEW: true }));
import {
  listMessages,
  sendMessage,
  markMessageRead,
  deleteMessage,
  searchMessages,
} from "../services/entitlementService";
import { getReferralEarnings } from "../services/referralEarningsService";
import {
  getPeerProfile,
  pushEcosystemProfile,
} from "../services/ecosystemProfileService";
import { RealCallSignalingClient } from "../services/callSignalingClient";
jest.mock("../services/callService", () => ({}));

test("design conversations, edits and lists work with the network unavailable", async () => {
  const request = jest.fn(() => {
    throw new Error("Network must not be used");
  });
  globalThis.fetch = request;
  const before = await listMessages("example");
  expect(before.some((m) => m.peerUserId === "Sara")).toBe(true);
  const sent = await sendMessage("example", "Sara", "Local design test");
  expect((await listMessages("example"))[0].body).toBe("Local design test");
  await markMessageRead("example", sent.message_id);
  expect((await listMessages("example"))[0].read).toBe(true);
  expect((await searchMessages("example", "Local design test")).length).toBe(1);
  await deleteMessage("example", sent.message_id);
  expect(
    (await listMessages("example")).some((m) => m.id === sent.message_id),
  ).toBe(false);
  expect((await getReferralEarnings("example")).count).toBe(3);
  expect((await RealCallSignalingClient.history("example")).length).toBe(2);
  expect((await getPeerProfile("example-sara"))?.display_name).toBe("sara");
  await pushEcosystemProfile("example", "name", "Name", "👤", "#3399FF", "");
  expect(request).not.toHaveBeenCalled();
});
