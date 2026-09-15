import { ORPCError } from "@orpc/server";

import { AppErrorCode } from "@sofa/api/errors";
import { getOrFetchTitle } from "@sofa/core/metadata";
import { getDisplayStatusesByTitleIds } from "@sofa/core/tracking";

import { os } from "../context";
import { authed } from "../middleware";

export const get = os.titles.get.use(authed).handler(async ({ input, context }) => {
  const result = await getOrFetchTitle(input.id, context.user.id);
  if (!result)
    throw new ORPCError("NOT_FOUND", {
      message: "Title not found",
      data: { code: AppErrorCode.TITLE_NOT_FOUND },
    });
  return result;
});