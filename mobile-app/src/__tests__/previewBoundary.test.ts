import { IS_DESIGN_PREVIEW } from "../config/designPreview";
import { previewRequest } from "../preview/previewData";
test("normal app builds cannot use design fixtures", () => {
  expect(IS_DESIGN_PREVIEW).toBe(false);
  expect(() => previewRequest("list-messages")).toThrow(
    "disabled in normal builds",
  );
});
