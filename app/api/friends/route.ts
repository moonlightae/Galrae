import { and, eq, or } from "drizzle-orm";
import { getDb } from "../../../db";
import { friendships, users } from "../../../db/schema";
import { getGameUser, normalizeUsername } from "../../game-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getGameUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    const rows = await getDb().select({
      id: users.id, username: users.username, displayName: users.displayName,
      accepted: friendships.accepted, requestedBy: friendships.requestedBy,
    }).from(friendships).innerJoin(users, or(
      and(eq(friendships.userA, user.id), eq(users.id, friendships.userB)),
      and(eq(friendships.userB, user.id), eq(users.id, friendships.userA)),
    ));
    return Response.json({ friends: rows.map(({ requestedBy, ...row }) => ({ ...row, incoming: requestedBy !== user.id })) });
  } catch (error) {
    console.error("Friend list error", error);
    return Response.json({ error: "친구 목록을 불러오지 못했습니다." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getGameUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  let body: { action?: unknown; username?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  if (!body || typeof body !== "object" || typeof body.action !== "string" || !["request", "accept", "remove"].includes(body.action)
    || typeof body.username !== "string" || body.username.length > 40) {
    return Response.json({ error: "친구 아이디와 동작을 확인해 주세요." }, { status: 400 });
  }
  try {
    const db = getDb();
    const [other] = await db.select({ id: users.id }).from(users)
      .where(eq(users.usernameNormalized, normalizeUsername(body.username.trim()))).limit(1);
    if (!other) return Response.json({ error: "해당 아이디를 찾을 수 없습니다." }, { status: 404 });
    if (other.id === user.id) return Response.json({ error: "본인을 친구로 추가할 수 없습니다." }, { status: 400 });
    const [userA, userB] = [user.id, other.id].sort();
    const pair = and(eq(friendships.userA, userA), eq(friendships.userB, userB));
    if (body.action === "request") {
      await db.insert(friendships).values({ userA, userB, requestedBy: user.id }).onConflictDoNothing();
    } else if (body.action === "accept") {
      const changed = await db.update(friendships).set({ accepted: true })
        .where(and(pair, eq(friendships.requestedBy, other.id), eq(friendships.accepted, false))).returning();
      if (!changed.length) return Response.json({ error: "수락할 친구 요청이 없습니다." }, { status: 409 });
    } else await db.delete(friendships).where(pair);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Friend action error", error);
    return Response.json({ error: "친구 요청을 처리하지 못했습니다." }, { status: 503 });
  }
}
