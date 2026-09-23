import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../db";
import { sessions, users } from "../db/schema";

const SESSION_COOKIE = "galrae_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export const PASSWORD_ITERATIONS = 100_000;
const encoder = new TextEncoder();

export type GameUser = {
  id: string;
  username: string;
  displayName: string;
  chatgptLinked: boolean;
  chatgptDisplayName: string | null;
  isAdmin: boolean;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function digest(value: string) {
  const result = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64(new Uint8Array(result));
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const saltBytes = new Uint8Array(salt.byteLength);
  saltBytes.set(salt);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations }, key, 256);
  return new Uint8Array(bits);
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function normalizeUsername(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

export function validateCredentials(username: unknown, password: unknown) {
  if (typeof username !== "string" || !/^[\p{L}\p{N}_]{3,20}$/u.test(username.normalize("NFKC"))) {
    return "아이디는 문자, 숫자, 밑줄만 사용해 3~20자로 입력해주세요.";
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    return "비밀번호는 8~72자로 입력해주세요.";
  }
  return null;
}

export async function makePasswordRecord(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  return { passwordHash: bytesToBase64(hash), passwordSalt: bytesToBase64(salt), passwordIterations: PASSWORD_ITERATIONS };
}

export async function verifyPassword(password: string, hash: string, salt: string, iterations: number) {
  const candidate = await derivePassword(password, base64ToBytes(salt), iterations);
  return timingSafeEqual(candidate, base64ToBytes(hash));
}

export async function createSession(userId: string, secure = true) {
  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  const tokenHash = await digest(token);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  await getDb().insert(sessions).values({ tokenHash, userId, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, await digest(token)));
  cookieStore.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getGameUser(): Promise<GameUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  const [row] = await getDb()
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      chatgptUserId: users.chatgptUserId,
      chatgptDisplayName: users.chatgptDisplayName,
      isAdmin: users.isAdmin,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, await digest(token)), gt(sessions.expiresAt, now)))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName || row.username,
    chatgptLinked: Boolean(row.chatgptUserId),
    chatgptDisplayName: row.chatgptDisplayName,
    isAdmin: row.isAdmin,
  };
}
