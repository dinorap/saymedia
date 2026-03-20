type SupportPeer = any;

export interface SupportBroadcastMessage {
  threadId: number;
  message: {
    id: number;
    thread_id: number;
    sender_type: "user" | "admin";
    sender_id: number;
    content: string;
    created_at: string | Date;
  };
}

interface SupportWsHubState {
  peers: Set<SupportPeer>;
  threadSubscriptions: Map<number, Set<SupportPeer>>;
}

declare global {
  // eslint-disable-next-line no-var
  var __supportWsHubState: SupportWsHubState | undefined;
}

function getState(): SupportWsHubState {
  if (!globalThis.__supportWsHubState) {
    globalThis.__supportWsHubState = {
      peers: new Set<SupportPeer>(),
      threadSubscriptions: new Map<number, Set<SupportPeer>>(),
    };
  }
  return globalThis.__supportWsHubState;
}

export function subscribePeerToThread(peer: SupportPeer, threadId: number) {
  const state = getState();
  state.peers.add(peer);

  let set = state.threadSubscriptions.get(threadId);
  if (!set) {
    set = new Set<SupportPeer>();
    state.threadSubscriptions.set(threadId, set);
  }
  set.add(peer);
}

export function unsubscribePeer(peer: SupportPeer) {
  const state = getState();
  for (const [threadId, set] of state.threadSubscriptions.entries()) {
    if (!set.has(peer)) continue;
    set.delete(peer);
    if (!set.size) {
      state.threadSubscriptions.delete(threadId);
    }
  }
  state.peers.delete(peer);
}

export function registerPeer(peer: SupportPeer) {
  const state = getState();
  state.peers.add(peer);
}

export function unregisterPeer(peer: SupportPeer) {
  const state = getState();
  state.peers.delete(peer);
}

export function broadcastSupportMessage(payload: SupportBroadcastMessage) {
  const state = getState();
  const set = state.threadSubscriptions.get(payload.threadId);
  if (!set || !set.size) return;
  const data = JSON.stringify({
    type: "support_message",
    threadId: payload.threadId,
    message: payload.message,
  });
  for (const peer of set) {
    try {
      peer.send(data);
    } catch {
      // ignore
    }
  }
}

