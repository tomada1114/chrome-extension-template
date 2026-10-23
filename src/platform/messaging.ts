import { defineExtensionMessaging } from "@webext-core/messaging";

/**
 * Every message one extension context sends another, keyed by name: the
 * parameter is what the sender passes, the return type what the receiver
 * answers. A message absent from this map cannot be sent or handled.
 *
 * @remarks
 * Handlers live in the service worker (`src/background/`). A content script
 * runs inside a page the extension does not control, so a handler treats what
 * arrives from one as untrusted input and validates it before acting on it.
 */
export interface ProtocolMap {
  /** Count one click and answer the new total. */
  incrementCount(): number;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
