import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { leaderboard, sessions, users } from "../../../db/schema";
import { getGameUser, makePasswordRecord } from "../../game-auth";

async function requireAdmin() {
  const user = await getGameUser();
  return user?.isAdmin ? user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  const db = getDb();
  const [accountRows, scoreRows] = await Promise.all([
    db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      chatgptLinked: users.chatgptUserId,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    }).from(users).orderBy(asc(users.createdAt)),
    db.select({
      userId: leaderboard.userId,
      bestScore: leaderboard.bestScore,
      gamesPlayed: leaderboard.gamesPlayed,
    }).from(leaderboard),
  ]);
  const scores = new Map(scoreRows.map((row) => [row.userId, row]));
  return Response.json({
    users: accountRows.map((row) => ({
      ...row,
      chatgptLinked: Boolean(row.chatgptLinked),
      bestScore: scores.get(row.id)?.bestScore ?? 0,
      gamesPlayed: scores.get(row.id)?.gamesPlayed ?? 0,
    })),
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  let body: { action?: unknown; userId?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const db = getDb();

  if (body.action === "reset-leaderboard") {
    await db.delete(leaderboard);
    return Response.json({ ok: true });
  }

  if (typeof body.userId !== "string") {
    return Response.json({ error: "대상 계정을 선택해주세요." }, { status: 400 });
  }
  const [target] = await db.select().from(users).where(eq(users.id, body.userId)).limit(1);
  if (!target) return Response.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });

  if (body.action === "reset-password") {
    const passwordRecord = await makePasswordRecord("12345678");
    await db.update(users).set({ ...passwordRecord, updatedAt: new Date().toISOString() }).where(eq(users.id, target.id));
    const targetSessions = await db.select({ tokenHash: sessions.tokenHash }).from(sessions).where(eq(sessions.userId, target.id));
    if (targetSessions.length) await db.delete(sessions).where(inArray(sessions.tokenHash, targetSessions.map((row) => row.tokenHash)));
    return Response.json({ ok: true });
  }

  if (body.action === "delete-user") {
    if (target.isAdmin) return Response.json({ error: "관리자 계정은 삭제할 수 없습니다." }, { status: 400 });
    await db.delete(leaderboard).where(eq(leaderboard.userId, target.id));
    await db.delete(sessions).where(eq(sessions.userId, target.id));
    await db.delete(users).where(eq(users.id, target.id));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "지원하지 않는 관리자 작업입니다." }, { status: 400 });
}
