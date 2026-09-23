import { getDb } from "../../../db";
import { classifiedSpecies } from "../../../db/schema";
import { getGameUser } from "../../game-auth";

// D1 allows at most 100 bound parameters per query. Each row binds two values.
const INSERT_BATCH_SIZE = 40;
const REQUEST_BATCH_SIZE = 400;

export async function POST(request: Request) {
  const user = await getGameUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let payload: { speciesIds?: unknown };
  try { payload = await request.json() as typeof payload; }
  catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }

  if (!Array.isArray(payload.speciesIds) || payload.speciesIds.length > REQUEST_BATCH_SIZE
    || !payload.speciesIds.every((id) => typeof id === "string" && /^[a-z0-9-]{1,80}$/.test(id))) {
    return Response.json({ error: "분류한 생물 목록이 올바르지 않습니다." }, { status: 400 });
  }

  const speciesIds = [...new Set(payload.speciesIds)].filter((id) => id !== "homo-sapiens");
  try {
    const db = getDb();
    for (let offset = 0; offset < speciesIds.length; offset += INSERT_BATCH_SIZE) {
      await db.insert(classifiedSpecies)
        .values(speciesIds.slice(offset, offset + INSERT_BATCH_SIZE).map((speciesId) => ({ userId: user.id, speciesId })))
        .onConflictDoNothing();
    }
    return Response.json({ synced: speciesIds.length });
  } catch (error) {
    console.error("Collection storage error", error);
    return Response.json({ error: "분류 기록을 저장하지 못했습니다." }, { status: 503 });
  }
}
