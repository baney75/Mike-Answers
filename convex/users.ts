import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { requireClerkIdentity } from "./lib";

export const me = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const clerkId = await requireClerkIdentity(ctx);
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (query) => query.eq("clerkId", clerkId))
      .unique();
  },
});

export const upsert = mutationGeneric({
  args: {
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkId = await requireClerkIdentity(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (query) => query.eq("clerkId", clerkId))
      .unique();

    const payload = {
      clerkId,
      email: args.email,
      displayName: args.displayName,
      imageUrl: args.imageUrl,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("users", {
      ...payload,
      createdAt: Date.now(),
    });
  },
});
