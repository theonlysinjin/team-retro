import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getCards = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return cards;
  },
});

export const createCard = mutation({
  args: {
    sessionId: v.id("sessions"),
    encryptedData: v.string(),
    position: v.object({ x: v.number(), y: v.number() }),
    authorName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cardId = await ctx.db.insert("cards", {
      sessionId: args.sessionId,
      encryptedData: args.encryptedData,
      position: args.position,
      authorName: args.authorName,
      createdAt: now,
      updatedAt: now,
    });

    return cardId;
  },
});

export const updateCard = mutation({
  args: {
    cardId: v.id("cards"),
    encryptedData: v.optional(v.string()),
    position: v.optional(v.object({ x: v.number(), y: v.number() })),
    groupId: v.optional(v.id("groups")),
  },
  handler: async (ctx, args) => {
    const { cardId, ...updates } = args;

    const card = await ctx.db.get(cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    await ctx.db.patch(cardId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deleteCard = mutation({
  args: {
    cardId: v.id("cards"),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    // Delete associated votes
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .collect();

    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    // Delete the card
    await ctx.db.delete(args.cardId);
  },
});

export const addVote = mutation({
  args: {
    cardId: v.id("cards"),
    sessionId: v.id("sessions"),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user has already voted
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_card_and_user", (q) =>
        q.eq("cardId", args.cardId).eq("userName", args.userName)
      )
      .first();

    if (existingVote) {
      throw new Error("User has already voted on this card");
    }

    await ctx.db.insert("votes", {
      cardId: args.cardId,
      sessionId: args.sessionId,
      userName: args.userName,
      createdAt: Date.now(),
    });
  },
});

export const removeVote = mutation({
  args: {
    cardId: v.id("cards"),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const vote = await ctx.db
      .query("votes")
      .withIndex("by_card_and_user", (q) =>
        q.eq("cardId", args.cardId).eq("userName", args.userName)
      )
      .first();

    if (!vote) {
      throw new Error("Vote not found");
    }

    await ctx.db.delete(vote._id);
  },
});

export const getVotes = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return votes;
  },
});
