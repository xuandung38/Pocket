import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the socket service so the store's listeners + emits are observable
// without a real socket.io connection. onMessage/onListMessage return an
// unsubscribe fn (default no-op) that the store stores + calls on reset.
const { connectSocket, emitGetMessagesWith, onMessage, onListMessage } =
  vi.hoisted(() => ({
    connectSocket: vi.fn(),
    emitGetMessagesWith: vi.fn(),
    onMessage: vi.fn(() => () => {}),
    onListMessage: vi.fn(() => () => {}),
  }));
vi.mock("@/services/socket-service", () => ({
  connectSocket,
  emitGetMessagesWith,
  onMessage,
  onListMessage,
}));
vi.mock("@/utils", () => ({ getToken: () => ({ localId: "me" }) }));

import { useChatStore, selectMessages, selectConvMeta } from "../use-chat-store";

const get = () => useChatStore.getState();
const listOf = (uid) => selectMessages(uid)(get());
const nowSecs = () => Math.floor(Date.now() / 1000);

beforeEach(() => {
  connectSocket.mockReset();
  emitGetMessagesWith.mockReset();
  onMessage.mockReset();
  onMessage.mockReturnValue(() => {});
  onListMessage.mockReset();
  onListMessage.mockReturnValue(() => {});
  useChatStore.setState({
    messagesByConv: {},
    convMeta: {},
    activeConv: null,
    myUid: "me",
    _attachedSocket: null,
    _offMessage: null,
    _offList: null,
  });
});

describe("ingestMessages", () => {
  it("adds messages newest-first and updates convMeta preview", () => {
    get().ingestMessages([
      { id: "a", sender: "friend1", body: "hi", createdAt: 100 },
      { id: "b", sender: "friend1", body: "yo", createdAt: 200 },
    ]);
    expect(listOf("friend1").map((m) => m.id)).toEqual(["b", "a"]);
    expect(selectConvMeta(get()).friend1.lastMessage).toBe("yo");
    expect(selectConvMeta(get()).friend1.lastTime).toBe(200);
  });

  it("dedupes by id (same message twice → one entry)", () => {
    const msg = { id: "a", sender: "friend1", body: "hi", createdAt: 100 };
    get().ingestMessages([msg]);
    get().ingestMessages([msg]);
    expect(listOf("friend1").length).toBe(1);
  });

  it("updates an existing message in place (reaction edit)", () => {
    get().ingestMessages([{ id: "a", sender: "friend1", body: "hi", createdAt: 100 }]);
    get().ingestMessages([
      { id: "a", sender: "friend1", body: "hi", createdAt: 100, rating: "❤️" },
    ]);
    const list = listOf("friend1");
    expect(list.length).toBe(1);
    expect(list[0].rating).toBe("❤️");
  });

  it("caps each conversation at 200 newest messages", () => {
    const many = Array.from({ length: 250 }, (_, i) => ({
      id: `m${i}`,
      sender: "friend1",
      body: "x",
      createdAt: i,
    }));
    get().ingestMessages(many);
    const list = listOf("friend1");
    expect(list.length).toBe(200);
    expect(list[0].id).toBe("m249"); // newest kept
  });

  it("attributes own-message echo (no receiver field) to activeConv", () => {
    useChatStore.setState({ activeConv: "friend1" });
    get().ingestMessages([
      { id: "r1", sender: "me", body: "mine", createdAt: nowSecs() },
    ]);
    expect(listOf("friend1").map((m) => m.id)).toEqual(["r1"]);
  });

  it("buckets by backend conversation_uid even when activeConv differs", () => {
    // C1 guard: an own-message echo tagged for friendA must land in A, not in
    // whatever conversation happens to be active (fast-navigation case).
    useChatStore.setState({ activeConv: "friendB" });
    get().ingestMessages([
      {
        id: "x",
        sender: "me",
        body: "to A",
        createdAt: nowSecs(),
        conversation_uid: "friendA",
      },
    ]);
    expect(listOf("friendA").map((m) => m.id)).toEqual(["x"]);
    expect(listOf("friendB").length).toBe(0);
  });
});

describe("optimistic send", () => {
  it("adds a pending stub then replaces it with the real echo (no dup)", () => {
    useChatStore.setState({ activeConv: "friend1" });
    const tmpId = get().addOptimistic("friend1", { body: "hello" });
    let list = listOf("friend1");
    expect(list.length).toBe(1);
    expect(list[0]._pending).toBe(true);

    get().ingestMessages([
      { id: "real1", sender: "me", body: "hello", createdAt: nowSecs() },
    ]);
    list = listOf("friend1");
    expect(list.length).toBe(1); // stub replaced, not duplicated
    expect(list[0].id).toBe("real1");
    expect(list[0]._pending).toBeUndefined();
    expect(tmpId).toMatch(/^tmp-/);
  });

  it("rollback (ok:false) removes the stub", () => {
    const tmpId = get().addOptimistic("friend1", { body: "oops" });
    expect(listOf("friend1").length).toBe(1);
    get().reconcileOptimistic("friend1", tmpId, { ok: false });
    expect(listOf("friend1").length).toBe(0);
  });

  it("ok:true clears the pending flag", () => {
    const tmpId = get().addOptimistic("friend1", { body: "sent" });
    get().reconcileOptimistic("friend1", tmpId, { ok: true });
    expect(listOf("friend1")[0]._pending).toBe(false);
  });
});

describe("ingestConvList", () => {
  it("merges conv summaries and preserves prior values when fields missing", () => {
    get().ingestConvList([
      {
        with_user: "friend1",
        latestMessage: { body: "first", createdAt: 50 },
        unread: 2,
      },
    ]);
    expect(selectConvMeta(get()).friend1).toMatchObject({
      lastMessage: "first",
      lastTime: 50,
      unread: 2,
    });

    // A later snapshot missing latestMessage keeps the old preview.
    get().ingestConvList([{ with_user: "friend1", update_time: 60 }]);
    expect(selectConvMeta(get()).friend1.lastMessage).toBe("first");
    expect(selectConvMeta(get()).friend1.lastTime).toBe(60);
  });
});

describe("initSocket", () => {
  it("attaches listeners only once for the same socket", () => {
    connectSocket.mockReturnValue({ id: "s1" });
    get().initSocket("tok");
    get().initSocket("tok");
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onListMessage).toHaveBeenCalledTimes(1);
  });

  it("re-attaches after a reconnect (new socket instance)", () => {
    connectSocket.mockReturnValueOnce({ id: "s1" }).mockReturnValueOnce({ id: "s2" });
    get().initSocket("tok");
    get().initSocket("tok2");
    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(onListMessage).toHaveBeenCalledTimes(2);
  });

  it("no-ops without an idToken", () => {
    get().initSocket("");
    expect(connectSocket).not.toHaveBeenCalled();
  });
});

describe("openConversation", () => {
  it("sets activeConv and emits without clearing the cache", () => {
    get().ingestMessages([{ id: "a", sender: "friend1", body: "hi", createdAt: 1 }]);
    get().openConversation("friend1");
    expect(get().activeConv).toBe("friend1");
    expect(emitGetMessagesWith).toHaveBeenCalledWith("friend1");
    expect(listOf("friend1").length).toBe(1); // cache untouched
  });
});

describe("reset", () => {
  it("clears all state and calls the unsubscribers", () => {
    const offMsg = vi.fn();
    const offList = vi.fn();
    onMessage.mockReturnValue(offMsg);
    onListMessage.mockReturnValue(offList);
    connectSocket.mockReturnValue({ id: "s1" });
    get().initSocket("tok");
    get().ingestMessages([{ id: "a", sender: "friend1", body: "hi", createdAt: 1 }]);

    get().reset();

    expect(offMsg).toHaveBeenCalledTimes(1);
    expect(offList).toHaveBeenCalledTimes(1);
    expect(get().messagesByConv).toEqual({});
    expect(get().convMeta).toEqual({});
    expect(get().myUid).toBeNull();
  });
});
