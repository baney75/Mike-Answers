type AuthOnlyCtx = {
  auth: {
    getUserIdentity: () => Promise<{ subject?: string } | null>;
  };
};

export async function requireClerkIdentity(ctx: AuthOnlyCtx) {
  const identity = await ctx.auth.getUserIdentity();
  const clerkId = identity?.subject;

  if (!clerkId) {
    throw new Error("Unauthenticated");
  }

  return clerkId;
}
