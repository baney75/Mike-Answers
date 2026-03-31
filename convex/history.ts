import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { requireClerkIdentity } from "./lib";

const MAX_HISTORY_ITEMS = 25;

export const listMyHistory = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const clerkId = await requireClerkIdentity(ctx);
    return await ctx.db
      .query("solveHistory")
      .withIndex("by_clerk_id_and_created_at", (query) => query.eq("clerkId", clerkId))
      .order("desc")
      .take(MAX_HISTORY_ITEMS);
  },
});

export const addHistoryItem = mutationGeneric({
  args: {
    requestText: v.optional(v.string()),
    solution: v.string(),
    subject: v.optional(v.string()),
    mode: v.optional(v.string()),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    hideAnswerByDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const clerkId = await requireClerkIdentity(ctx);
    return await ctx.db.insert("solveHistory", {
      clerkId,
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const clearMyHistory = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const clerkId = await requireClerkIdentity(ctx);
    const items = await ctx.db
      .query("solveHistory")
      .withIndex("by_clerk_id", (query) => query.eq("clerkId", clerkId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    return items.length;
  },
});
