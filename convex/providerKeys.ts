import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { requireClerkIdentity } from "./lib";

const providerValidator = v.union(
  v.literal("gemini"),
  v.literal("openrouter"),
  v.literal("minimax"),
  v.literal("custom_openai"),
);

export const getMyProviderKeyStatus = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const clerkId = await requireClerkIdentity(ctx);
    const keys = await ctx.db
      .query("providerKeys")
      .withIndex("by_clerk_id", (query) => query.eq("clerkId", clerkId))
      .collect();

    return {
      gemini: keys.some((entry) => entry.provider === "gemini"),
      openrouter: keys.some((entry) => entry.provider === "openrouter"),
      minimax: keys.some((entry) => entry.provider === "minimax"),
      custom_openai: keys.some((entry) => entry.provider === "custom_openai"),
    };
  },
});

export const getMyProviderKeyMaterial = queryGeneric({
  args: {
    provider: providerValidator,
  },
  handler: async (ctx, args) => {
    const clerkId = await requireClerkIdentity(ctx);
    const keys = await ctx.db
      .query("providerKeys")
      .withIndex("by_clerk_id", (query) => query.eq("clerkId", clerkId))
      .collect();

    return keys.find((entry) => entry.provider === args.provider) ?? null;
  },
});

export const storeEncryptedProviderKey = mutationGeneric({
  args: {
    provider: providerValidator,
    encryptedKey: v.string(),
    iv: v.string(),
    algorithm: v.string(),
    keyVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkId = await requireClerkIdentity(ctx);
    const now = Date.now();
    const existing = (
      await ctx.db
      .query("providerKeys")
      .withIndex("by_clerk_id", (query) => query.eq("clerkId", clerkId))
      .collect()
    ).find((entry) => entry.provider === args.provider);

    const payload = {
      clerkId,
      provider: args.provider,
      encryptedKey: args.encryptedKey,
      iv: args.iv,
      algorithm: args.algorithm,
      keyVersion: args.keyVersion,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("providerKeys", {
      ...payload,
      createdAt: now,
    });
  },
});

export const deleteMyProviderKey = mutationGeneric({
  args: {
    provider: providerValidator,
  },
  handler: async (ctx, args) => {
    const clerkId = await requireClerkIdentity(ctx);
    const existing = (
      await ctx.db
      .query("providerKeys")
      .withIndex("by_clerk_id", (query) => query.eq("clerkId", clerkId))
      .collect()
    ).find((entry) => entry.provider === args.provider);

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return null;
  },
});
