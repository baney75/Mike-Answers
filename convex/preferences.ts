import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { requireClerkIdentity } from "./lib";

export const getMyPreferences = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const clerkId = await requireClerkIdentity(ctx);
    return await ctx.db
      .query("preferences")
      .withIndex("by_clerk_id", (query) => query.eq("clerkId", clerkId))
      .unique();
  },
});

export const saveMyPreferences = mutationGeneric({
  args: {
    selectedProviderId: v.string(),
    preferredSubject: v.optional(v.string()),
    preferredLocation: v.optional(v.string()),
    onboardingCompleted: v.optional(v.boolean()),
    providers: v.any(),
  },
  handler: async (ctx, args) => {
    const clerkId = await requireClerkIdentity(ctx);
    const existing = await ctx.db
      .query("preferences")
      .withIndex("by_clerk_id", (query) => query.eq("clerkId", clerkId))
      .unique();

    const payload = {
      clerkId,
      ...args,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("preferences", payload);
  },
});
