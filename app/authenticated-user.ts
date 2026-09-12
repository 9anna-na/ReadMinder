export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

type HeaderReader = Pick<Headers, "get">;

const USER_ID_HEADER = "oai-authenticated-user-id";
const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseAuthenticatedUserHeaders(
  requestHeaders: HeaderReader,
): ChatGPTUser | null {
  const userId = requestHeaders.get(USER_ID_HEADER);
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!isSafeHeaderValue(userId, 200) || !isSafeEmail(email)) return null;

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const decodedFullName =
    encodedFullName &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;
  const fullName = isSafeHeaderValue(decodedFullName, 200) ? decodedFullName : null;

  return {
    userId,
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

function isSafeHeaderValue(value: string | null, maxLength: number): value is string {
  return Boolean(
    value &&
      value.length <= maxLength &&
      value.trim() === value &&
      !Array.from(value).some((character) => {
        const code = character.charCodeAt(0);
        return code <= 31 || code === 127;
      }),
  );
}

function isSafeEmail(value: string | null): value is string {
  return isSafeHeaderValue(value, 254) && EMAIL_PATTERN.test(value);
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
