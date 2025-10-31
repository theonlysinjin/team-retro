import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate a random 6-character alphanumeric code
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a secure host token
function generateHostToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export const createSession = mutation({
  args: {
    hostName: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate a unique code
    let code = generateCode();
    let existing = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    while (existing) {
      code = generateCode();
      existing = await ctx.db
        .query("sessions")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
    }

    const hostToken = generateHostToken();

    const sessionId = await ctx.db.insert("sessions", {
      code,
      hostName: args.hostName,
      hostToken,
      createdAt: Date.now(),
      status: "active",
    });

    // Add host to presence
    await ctx.db.insert("presence", {
      sessionId,
      userName: args.hostName,
      lastSeen: Date.now(),
      color: generateUserColor(args.hostName),
    });

    // Log connection event
    await ctx.db.insert("connections", {
      sessionId,
      userName: args.hostName,
      event: "joined",
      timestamp: Date.now(),
    });

    return { sessionId, code, hostToken };
  },
});

export const getSessionByCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    return session;
  },
});

export const getSession = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const getSessionByHostToken = query({
  args: {
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Can't use index on optional field, so collect all and filter
    const sessions = await ctx.db.query("sessions").collect();
    return sessions.find((s) => s.hostToken === args.hostToken);
  },
});

export const joinSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already in presence
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_session_and_user", (q) =>
        q.eq("sessionId", args.sessionId).eq("userName", args.userName)
      )
      .first();

    if (!existing) {
      // Add to presence
      await ctx.db.insert("presence", {
        sessionId: args.sessionId,
        userName: args.userName,
        lastSeen: Date.now(),
        color: generateUserColor(args.userName),
      });

      // Log connection event
      await ctx.db.insert("connections", {
        sessionId: args.sessionId,
        userName: args.userName,
        event: "joined",
        timestamp: Date.now(),
      });
    } else {
      // Update last seen
      await ctx.db.patch(existing._id, {
        lastSeen: Date.now(),
      });
    }
  },
});

export const updatePresence = mutation({
  args: {
    sessionId: v.id("sessions"),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query("presence")
      .withIndex("by_session_and_user", (q) =>
        q.eq("sessionId", args.sessionId).eq("userName", args.userName)
      )
      .first();

    if (presence) {
      await ctx.db.patch(presence._id, {
        lastSeen: Date.now(),
      });
    }
  },
});

export const leaveSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query("presence")
      .withIndex("by_session_and_user", (q) =>
        q.eq("sessionId", args.sessionId).eq("userName", args.userName)
      )
      .first();

    if (presence) {
      await ctx.db.delete(presence._id);
    }

    // Log connection event
    await ctx.db.insert("connections", {
      sessionId: args.sessionId,
      userName: args.userName,
      event: "left",
      timestamp: Date.now(),
    });
  },
});

export const getPresence = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const timeout = 30000; // 30 seconds

    const allPresence = await ctx.db
      .query("presence")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Filter out stale presence (haven't been seen in 30s)
    return allPresence.filter((p) => now - p.lastSeen < timeout);
  },
});

// Helper function to generate consistent user colors
function generateUserColor(userName: string): string {
  const colors = [
    "#ef4444", // red
    "#f59e0b", // orange
    "#10b981", // green
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
  ];

  let hash = 0;
  for (let i = 0; i < userName.length; i++) {
    hash = userName.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
