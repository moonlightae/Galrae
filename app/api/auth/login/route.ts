import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { leaderboard, users } from "../../../../db/schema";
import { createSession, normalizeUsername, verifyPassword } from "../../../game-auth";

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  if (typeof body.username !== "string" || typeof body.password !== "string") {
    return Response.json({ error: "아이디와 비밀번호를 입력해주세요." }, { status: 400 });
  }
  const [user] = await getDb().select().from(users).where(eq(users.usernameNormalized, normalizeUsername(body.username))).limit(1);
  if (!user || !(await verifyPassword(body.password, user.passwordHash, user.passwordSalt, user.passwordIterations))) {
    return Response.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  await getDb().insert(leaderboard).values({
    userId: user.id, displayName: user.displayName || user.username, bestScore: 0, gamesPlayed: 0,
  }).onConflictDoNothing();
  await createSession(user.id, new URL(request.url).protocol === "https:");
  return Response.json({ user: { id: user.id, username: user.username, displayName: user.displayName || user.username, chatgptLinked: Boolean(user.chatgptUserId), chatgptDisplayName: user.chatgptDisplayName, isAdmin: user.isAdmin } });
}
