import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

type SessionTokenPayload = {
  sessionId: string;
  nonce: string;
  iat: number;
};

const TOKEN_SECRET = process.env.SESSION_TOKEN_SECRET ?? "dev-only-change-me";

const toBase64Url = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64url");

const sign = (value: string): string =>
  createHmac("sha256", TOKEN_SECRET).update(value).digest("base64url");

export const newSessionNonce = (): string => randomBytes(16).toString("hex");

export const signSessionToken = (payload: SessionTokenPayload): string => {
  const body = toBase64Url(JSON.stringify(payload));
  const signature = sign(body);
  return `${body}.${signature}`;
};

export const verifySessionToken = (
  token: string,
): SessionTokenPayload | null => {
  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expectedSignature = sign(body);

  const provided = Buffer.from(signature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionTokenPayload;

    if (!parsed.sessionId || !parsed.nonce || typeof parsed.iat !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};
