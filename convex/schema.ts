import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Sessions - now with encryption info
  sessions: defineTable({
    code: v.string(),
    hostName: v.string(),
    hostToken: v.string(), // Secret token for host to reconnect
    // Encrypted session key (encrypted with password)
    encryptedKey: v.optional(v.string()),
    createdAt: v.number(),
    status: v.union(v.literal("active"), v.literal("archived")),
  })
    .index("by_code", ["code"])
    .index("by_host_token", ["hostToken"]),

  // Cards - content is encrypted on client before sending
  cards: defineTable({
    sessionId: v.id("sessions"),
    // Encrypted card data (JSON stringified and encrypted)
    encryptedData: v.string(),
    // Metadata (not encrypted - for ordering, etc)
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
    authorName: v.string(), // Not encrypted - shown in UI
    createdAt: v.number(),
    updatedAt: v.number(),
    groupId: v.optional(v.id("groups")),
  })
    .index("by_session", ["sessionId"])
    .index("by_group", ["groupId"]),

  // Votes - encrypted
  votes: defineTable({
    cardId: v.id("cards"),
    sessionId: v.id("sessions"),
    userName: v.string(),
    createdAt: v.number(),
  })
    .index("by_card", ["cardId"])
    .index("by_session", ["sessionId"])
    .index("by_card_and_user", ["cardId", "userName"]),

  // Groups - encrypted
  groups: defineTable({
    sessionId: v.id("sessions"),
    encryptedData: v.string(), // Contains name, color, etc
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
  }).index("by_session", ["sessionId"]),

  // Presence tracking - who's online
  presence: defineTable({
    sessionId: v.id("sessions"),
    userName: v.string(),
    lastSeen: v.number(),
    // Connection metadata
    userAgent: v.optional(v.string()),
    color: v.string(), // Assign each user a color for cursor/indicators
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_user", ["sessionId", "userName"]),

  // Connection events for logging/debugging
  connections: defineTable({
    sessionId: v.id("sessions"),
    userName: v.string(),
    event: v.union(v.literal("joined"), v.literal("left")),
    timestamp: v.number(),
  }).index("by_session", ["sessionId"]),
});
