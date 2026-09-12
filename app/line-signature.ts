export async function verifyLineSignature(body: string, signature: string, channelSecret: string) {
  if (!body || !signature || !channelSecret) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(channelSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const decoded = Uint8Array.from(atob(signature), (character) => character.charCodeAt(0));
    return crypto.subtle.verify("HMAC", key, decoded, encoder.encode(body));
  } catch {
    return false;
  }
}
