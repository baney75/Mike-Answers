import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  preferences: defineTable({
    clerkId: v.string(),
    selectedProviderId: v.string(),
    preferredSubject: v.optional(v.string()),
    preferredLocation: v.optional(v.string()),
    onboardingCompleted: v.optional(v.boolean()),
    providers: v.any(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  providerKeys: defineTable({
    clerkId: v.string(),
    provider: v.string(),
    encryptedKey: v.string(),
    iv: v.string(),
    algorithm: v.string(),
    keyVersion: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_clerk_id_and_provider", ["clerkId", "provider"]),

  solveHistory: defineTable({
    clerkId: v.string(),
    requestText: v.optional(v.string()),
    solution: v.string(),
    subject: v.optional(v.string()),
    mode: v.optional(v.string()),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    hideAnswerByDefault: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_clerk_id_and_created_at", ["clerkId", "createdAt"]),
});
