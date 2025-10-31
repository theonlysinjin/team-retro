import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getGroups = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const groups = await ctx.db
      .query("groups")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return groups;
  },
});

export const createGroup = mutation({
  args: {
    sessionId: v.id("sessions"),
    encryptedData: v.string(),
    position: v.object({ x: v.number(), y: v.number() }),
    cardIds: v.array(v.id("cards")),
  },
  handler: async (ctx, args) => {
    const groupId = await ctx.db.insert("groups", {
      sessionId: args.sessionId,
      encryptedData: args.encryptedData,
      position: args.position,
    });

    // Update all cards to belong to this group
    for (const cardId of args.cardIds) {
      await ctx.db.patch(cardId, { groupId });
    }

    return groupId;
  },
});

export const updateGroupTitle = mutation({
  args: {
    groupId: v.id("groups"),
    encryptedData: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.groupId, {
      encryptedData: args.encryptedData,
    });
  },
});

export const deleteGroup = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    // Remove cards from group
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const card of cards) {
      await ctx.db.patch(card._id, { groupId: undefined });
    }

    await ctx.db.delete(args.groupId);
  },
});

export const addCardToGroup = mutation({
  args: {
    cardId: v.id("cards"),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cardId, { groupId: args.groupId });
  },
});

export const removeCardFromGroup = mutation({
  args: {
    cardId: v.id("cards"),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card || !card.groupId) return;

    const groupId = card.groupId;

    // Remove card from group
    await ctx.db.patch(args.cardId, { groupId: undefined });

    // Check how many cards remain in the group
    const remainingCards = await ctx.db
      .query("cards")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    // If only 1 card left, remove it from group and delete the group
    if (remainingCards.length === 1) {
      await ctx.db.patch(remainingCards[0]._id, { groupId: undefined });
      await ctx.db.delete(groupId);
    }
  },
});
