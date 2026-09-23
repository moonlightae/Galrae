import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { leaderboard, users } from "../../../../db/schema";
import { createSession, makePasswordRecord, normalizeUsername, validateCredentials } from "../../../game-auth";

export async function POST(request: Request) {
  let body: { username?: unknown; displayName?: unknown; password?: unknown; confirmPassword?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const error = validateCredentials(body.username, body.password);
  if (error) return Response.json({ error }, { status: 400 });
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (displayName.length < 1 || displayName.length > 30) {
    return Response.json({ error: "표시할 이름은 1~30자로 입력해주세요." }, { status: 400 });
  }
  if (body.password !== body.confirmPassword) {
    return Response.json({ error: "비밀번호 확인이 일치하지 않습니다." }, { status: 400 });
  }
  const username = (body.username as string).normalize("NFKC");
  const usernameNormalized = normalizeUsername(username);
  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.usernameNormalized, usernameNormalized)).limit(1);
  if (existing) return Response.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
  const passwordRecord = await makePasswordRecord(body.password as string);
  const id = crypto.randomUUID();
  try {
    await db.batch([
      db.insert(users).values({ id, username, usernameNormalized, displayName, ...passwordRecord }),
      db.insert(leaderboard).values({ userId: id, displayName, bestScore: 0, gamesPlayed: 0 }),
    ]);
    await createSession(id, new URL(request.url).protocol === "https:");
    return Response.json({ user: { id, username, displayName, chatgptLinked: false, chatgptDisplayName: null, isAdmin: false } }, { status: 201 });
  } catch (caught) {
    console.error("Registration error", caught);
    return Response.json({ error: "계정을 만들지 못했습니다. 아이디를 확인해주세요." }, { status: 409 });
  }
}
