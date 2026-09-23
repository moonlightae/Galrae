import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { classifiedSpecies } from "../../../db/schema";
import { getGameUser } from "../../game-auth";

export async function POST(request: Request) {
  const user = await getGameUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let payload: { speciesIds?: unknown };
  try { payload = await request.json() as typeof payload; }
  catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }

  if (!Array.isArray(payload.speciesIds) || payload.speciesIds.length > 500
    || !payload.speciesIds.every((id) => typeof id === "string" && /^[a-z0-9-]{1,80}$/.test(id))) {
    return Response.json({ error: "분류한 생물 목록이 올바르지 않습니다." }, { status: 400 });
  }

  const speciesIds = [...new Set(payload.speciesIds)].filter((id) => id !== "homo-sapiens");
  try {
    const db = getDb();
    for (let offset = 0; offset < speciesIds.length; offset += 150) {
      await db.insert(classifiedSpecies)
        .values(speciesIds.slice(offset, offset + 150).map((speciesId) => ({ userId: user.id, speciesId })))
        .onConflictDoNothing();
    }
    const rows = await db.select({ speciesId: classifiedSpecies.speciesId })
      .from(classifiedSpecies).where(eq(classifiedSpecies.userId, user.id));
    return Response.json({ uniqueSpeciesCount: rows.length });
  } catch (error) {
    console.error("Collection storage error", error);
    return Response.json({ error: "분류 기록을 저장하지 못했습니다." }, { status: 503 });
  }
}
