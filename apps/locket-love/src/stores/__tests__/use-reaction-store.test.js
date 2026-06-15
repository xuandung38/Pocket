import { describe, it, expect, beforeEach } from "vitest";
import { useReactionStore } from "../use-reaction-store";

const get = () => useReactionStore.getState();

beforeEach(() => {
  useReactionStore.setState({ reaction: null });
});

describe("useReactionStore", () => {
  it("triggerReaction with a string sets reaction.reactions = [emoji]", () => {
    get().triggerReaction("👍");
    const { reaction } = get();
    expect(reaction).not.toBeNull();
    expect(reaction.reactions).toEqual(["👍"]);
  });

  it("reaction has a unique string id", () => {
    get().triggerReaction("👍");
    const { id } = get().reaction;
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("calling triggerReaction twice yields different ids", () => {
    get().triggerReaction("👍");
    const id1 = get().reaction.id;
    get().triggerReaction("❤️");
    const id2 = get().reaction.id;
    expect(id1).not.toBe(id2);
  });

  it("triggerReaction with an array keeps all valid emojis", () => {
    get().triggerReaction(["🔥", "❄️"]);
    expect(get().reaction.reactions).toEqual(["🔥", "❄️"]);
  });

  it("triggerReaction with a number does not update state", () => {
    get().triggerReaction(42);
    expect(get().reaction).toBeNull();
  });

  it("triggerReaction with null does not update state", () => {
    get().triggerReaction(null);
    expect(get().reaction).toBeNull();
  });

  it("array containing non-strings filters out invalid entries", () => {
    // Mixed array: only "👍" is a string, number is dropped → still sets state
    // with filtered list; an all-invalid array → no set.
    get().triggerReaction(["👍", 42, null]);
    expect(get().reaction.reactions).toEqual(["👍"]);
  });

  it("fully-invalid array does not update state", () => {
    get().triggerReaction([42, null, false]);
    expect(get().reaction).toBeNull();
  });
});
