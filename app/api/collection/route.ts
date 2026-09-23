import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { classifiedSpecies } from "../../../db/schema";
import { getGameUser } from "../../game-auth";

// Four bound values per row; keep each batch below D1's 100-parameter limit.
const INSERT_BATCH_SIZE = 20;
const REQUEST_BATCH_SIZE = 400;
const validId = (id: unknown): id is string => typeof id === "string" && /^[a-z0-9-]{1,80}$/.test(id) && id !== "homo-sapiens";

type CollectionRecord = { speciesId: string; count: number; minimum: boolean };

export async function GET() {
  const user = await getGameUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const records = await getDb().select({
      speciesId: classifiedSpecies.speciesId,
      count: classifiedSpecies.successCount,
      minimum: classifiedSpecies.minimum,
    }).from(classifiedSpecies).where(eq(classifiedSpecies.userId, user.id));
    return Response.json({ records });
  } catch (error) {
    console.error("Collection read error", error);
    return Response.json({ error: "분류 기록을 불러오지 못했습니다." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getGameUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let payload: { action?: unknown; speciesId?: unknown; records?: unknown; speciesIds?: unknown };
  try { payload = await request.json() as typeof payload; }
  catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }

  try {
    const db = getDb();
    if (payload.action === "record") {
      if (!validId(payload.speciesId)) return Response.json({ error: "생물 ID가 올바르지 않습니다." }, { status: 400 });
      await db.insert(classifiedSpecies)
        .values({ userId: user.id, speciesId: payload.speciesId, successCount: 1, minimum: false })
        .onConflictDoUpdate({
          target: [classifiedSpecies.userId, classifiedSpecies.speciesId],
          set: { successCount: sql`${classifiedSpecies.successCount} + 1` },
        });
      const [record] = await db.select({
        speciesId: classifiedSpecies.speciesId,
        count: classifiedSpecies.successCount,
        minimum: classifiedSpecies.minimum,
      }).from(classifiedSpecies)
        .where(sql`${classifiedSpecies.userId} = ${user.id} AND ${classifiedSpecies.speciesId} = ${payload.speciesId}`)
        .limit(1);
      return Response.json({ record });
    }

    const rawRecords = Array.isArray(payload.records)
      ? payload.records
      : Array.isArray(payload.speciesIds) ? payload.speciesIds.map((speciesId) => ({ speciesId, count: 1, minimum: true })) : null;
    if (!rawRecords || rawRecords.length > REQUEST_BATCH_SIZE || !rawRecords.every((item) => {
      const record = item as Partial<CollectionRecord> | null;
      return record && validId(record.speciesId) && Number.isSafeInteger(record.count)
        && Number(record.count) >= 1 && Number(record.count) <= 1_000_000 && typeof record.minimum === "boolean";
    })) return Response.json({ error: "분류한 생물 목록이 올바르지 않습니다." }, { status: 400 });

    const records = new Map<string, CollectionRecord>();
    for (const item of rawRecords as CollectionRecord[]) {
      const previous = records.get(item.speciesId);
      if (!previous || item.count > previous.count || (item.count === previous.count && !item.minimum)) records.set(item.speciesId, item);
    }
    const unique = [...records.values()];
    for (let offset = 0; offset < unique.length; offset += INSERT_BATCH_SIZE) {
      await db.insert(classifiedSpecies)
        .values(unique.slice(offset, offset + INSERT_BATCH_SIZE).map((record) => ({
          userId: user.id, speciesId: record.speciesId, successCount: record.count, minimum: record.minimum,
        })))
        .onConflictDoUpdate({
          target: [classifiedSpecies.userId, classifiedSpecies.speciesId],
          set: {
            successCount: sql`MAX(${classifiedSpecies.successCount}, excluded.success_count)`,
            minimum: sql`CASE WHEN excluded.success_count >= ${classifiedSpecies.successCount} AND excluded.minimum = 0 THEN 0 ELSE ${classifiedSpecies.minimum} END`,
          },
        });
    }
    return Response.json({ synced: unique.length });
  } catch (error) {
    console.error("Collection storage error", error);
    return Response.json({ error: "분류 기록을 저장하지 못했습니다." }, { status: 503 });
  }
}
