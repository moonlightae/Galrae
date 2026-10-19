# 갈래 — 계통수 분류 게임

**갈래**는 동물 카드를 계통수의 알맞은 위치에 놓으며 생물 사이의 진화적 관계를 익히는 웹 게임입니다. 인간에서 시작해 새로운 동물이 기존 동물들과 어떤 공통 조상을 공유하는지 찾아갑니다.

겉모습이 비슷한 동물끼리 묶는 것을 넘어, 서로 다른 동물들이 어디에서 갈라졌는지 생각해 보는 것이 목표입니다.

## 플레이 방법

1. 로비에서 게임을 시작하고 **쉬움·보통·어려움**을 선택합니다. 쉬움은 같은 강에서 한 종씩, 보통은 같은 목에서 한 종씩 출제하며 인간도 포함해 중복을 제한합니다. 어려움은 전체 동물을 출제합니다. 처음이라면 **튜토리얼**에서 네 장의 카드로 배치 방법을 익힐 수 있습니다.
2. 새 동물 카드의 사진과 설명을 읽고, 계통수에 이미 있는 동물들과의 관계를 생각합니다.
3. 카드를 선택한 뒤 계통수에서 넣을 위치를 고릅니다.
4. 올바르게 배치하면 다음 카드로 진행합니다. 틀리면 게임이 종료되고 정답 위치가 연두색으로 표시됩니다.

### 네 가지 배치 방법

| 놓는 위치 | 의미 |
| --- | --- |
| 전체 계통수로 이어지는 가지 | 지금 있는 동물들 전체와 새 공통 조상을 만듭니다. |
| 생물 노드 | 해당 생물과 새로운 공통 조상을 공유하는 갈래를 만듭니다. |
| 공통 조상의 원형 분기점 | 같은 공통 조상 아래에 별도 가지를 추가합니다. |
| 기존 갈래로 이어지는 가지 | 그 갈래의 공통 조상보다 먼저 분기한 위치에 추가합니다. |

계통수의 **위·아래·원형**은 표시 방향을 바꾸는 기능입니다. 방향을 바꿔도 정답이 되는 진화적 관계는 같습니다.

## 주요 기능

- **식물계 쉬움·연습·튜토리얼**: 무궁화에서 시작해 현생 식물 46개 강의 대표종을 분류합니다. 녹조류·홍조류·회색조류를 포함하며, 채택한 강 목록과 분류 기준은 데이터 README에서 확인할 수 있습니다. 튜토리얼은 네 장의 식물 카드로 배치 방법을 연습하며, 연습 모드는 오답을 자동 배치한 뒤 계속 진행합니다. 보통·어려움은 구현 중입니다. 식물 수집은 도감에 저장되며, 현재 리더보드·발전과제는 동물계 기록을 사용합니다.
- **계별 테마**: 동물계는 갈색·흰색, 식물계는 청록색·흰색입니다. 계 전환 시 화면 색상과 입체 계통도의 색이 애니메이션으로 바뀝니다.
- **동물 카드 314종**: 사진, 일반명, 학명과 짧은 설명을 제공합니다.
- **튜토리얼**: 네 가지 배치를 직접 연습합니다. 튜토리얼은 도전 횟수와 수집 기록에 포함되지 않습니다.
- **영어·한글 전환**: 카드의 일반명·설명·상위 분류군을 바꿔 읽을 수 있습니다. 생물의 학명은 원문을 유지합니다.
- **계통수 탐색**: 표시 방향 변경과 확대·이동을 지원합니다.
- **정답 복습**: 실패 후 정답 위치에 추가된 카드를 누르면 설명과 분류군을 확인할 수 있습니다.
- **수집함과 리더보드**: 올바르게 분류한 동물을 모으고 게임 기록을 확인합니다.
- **완주 업적**: 쉬움은 갈래 입문자(은), 보통은 갈래 초심자(금), 어려움은 갈래 전문가(다이아)를 획득합니다. 어려움 완주 시 죽음 난이도가 해금되며, 죽음 난이도 플레이는 준비 중입니다. 연습·튜토리얼은 이 완주 업적에 포함되지 않습니다.

## 데이터와 분류 기준

동물 설명은 영어 위키피디아, 분류 정보는 위키데이터, 사진은 위키미디어 공용을 기반으로 합니다. 한글 설명은 카드에 맞게 별도로 정리했습니다. 각 사진의 출처와 라이선스는 카드에서 확인할 수 있습니다.

계통수는 게임에서 사용하는 분류 기준에 따라 표시합니다. 연구에 따라 관계가 달라질 수 있는 분류군은 로비의 분류 기준 안내를 참고해 주세요. 자세한 데이터 구성과 라이선스는 [데이터 README](data/README.md)에 정리되어 있습니다.

## 로컬 실행

Node.js **22.13.0 이상**이 필요합니다. 저장소 루트에서 실행합니다.

```sh
npm run install:ci
npm run dev
```

터미널에 출력된 주소로 접속합니다. 로컬 DB 초기화와 빌드 안내는 아래의 배포 기반 안내를 참고해 주세요.

## GitHub 공개와 서비스 배포

이 저장소는 Vinext·Cloudflare Workers·D1을 사용하며, 현재 서비스 배포는 Sites를 통해 진행합니다. GitHub에 소스를 올리는 것과 실행 중인 서비스를 배포하는 것은 별도 과정입니다. 계정·수집 기록·리더보드에 서버와 DB가 필요하므로 GitHub Pages에 정적 파일만 올리는 방식으로는 전체 기능을 제공할 수 없습니다.

사진과 설명은 각 원본의 라이선스를 따릅니다. 소스 코드를 공개할 때에도 출처와 라이선스 정보를 함께 유지해 주세요.

## 코드 구조

- `app/game-markup.ts`: 로비, 게임 화면, 대화상자의 정적 마크업
- `app/game-client.tsx`: 화면 마운트와 브라우저 스크립트 로딩
- `public/app.js`: 게임 진행, 계정, 수집함, 입력 이벤트
- `public/tree-view.js`: 계통수 표시, 배치 미리보기, 확대·이동
- `public/game-logic.js`: 계통수 생성과 정답 판정
- `app/api/`, `db/`: 계정, 수집 기록, 리더보드 저장
- `data/animals.json`: 원본 동물 데이터. `public/data/animals.json`과 함께 유지

개발 서버는 `npm run dev`로 실행합니다. 데이터와 게임 로직은
`node scripts/validate-animal-dataset.mjs`,
`node scripts/validate-game-logic.mjs`,
`node scripts/validate-tree-render.mjs`,
`node scripts/validate-collection-sync.mjs`로 확인할 수 있습니다.

## 배포 기반 안내

아래는 이 사이트의 Vinext·Cloudflare D1 기반 실행 및 배포 안내입니다.

## Prerequisites

- Node.js `>=22.13.0`
- Portable: Windows, macOS, or Linux; no Bash required
- Managed Linux: managed Linux runtime with Bash, `flock`, `curl`, `sha256sum`, and GNU `timeout`
- Git is required only for publishing

## Sites Lifecycle

The Sites initializer copies the shared starter and selects managed-linux only when `SITES_MANAGED_LINUX_CONTAINER=1`; otherwise it selects portable. It saves the selection only in ignored `.sites-runtime/execution-profile.json`. Both profiles copy/configure first, then use the plugin's separate `install-dependencies.mjs` step to measure installation independently. Edit source under `app/` and follow the Sites skill for installation, preview, builds, and publishing.

Run `node <plugin-root>/scripts/configure-execution-profile.mjs` only when the profile is unknown for the current checkout and environment. Profile changes do not alter tracked source or require reinstalling otherwise-valid dependencies; restart an existing preview to use the new selection. Do not commit or upload `.sites-runtime/`.

This starter does not use `wrangler.jsonc`.

`install:ci` runs `npm ci` once against the shared lockfile, disables parent-workspace discovery, and includes required dev/optional dependencies despite production/omit settings. Sharp defaults to prebuilt binaries unless explicitly configured otherwise. Do not overlap installers.

- **Portable:** Preserve host HOME, npm cache, registry, proxy, temporary paths, retry/concurrency settings, and lifecycle-script policy. Use `--prefer-offline --no-audit --no-fund`.
- **Managed Linux:** Use the existing project-local HOME/cache/tmp setup and Linux install lock, tarball preflight, and timeout. Restore the image-seeded npm cache only when its lockfile hash matches; retain network fallback. Builds keep their existing timeout. These helpers are not invoked by the portable profile.

`scripts/sites-env.mjs` preserves the caller's HOME, npm cache, proxy, XDG, and temporary-directory configuration while defaulting Wrangler and Miniflare state to the checkout. If npm reports an unwritable cache, select a writable path with `npm_config_cache` for that install. The `dev` and `start` scripts also keep Wrangler logs inside the checkout. Generated `.sites-runtime/` and `.wrangler/` directories are disposable and ignored by Git.

On portable, `npm run dev` uses `vinext dev` with HMR, starting at port 5173. Vinext records the running server in ignored `.vinext/` state, rejects an ordinary duplicate launch, and recovers stale state after a stopped process; exactly simultaneous starts can race. Pass `--port <port>` or `--hostname <host>` after `npm run dev --` when needed; keep portable previews on loopback.

For browser QA on managed Linux, use `sites-preview start`. The project's dev script runs Vite and accepts the supervisor's `--host 0.0.0.0 --port 4173 --strictPort` arguments. The internal browser uses `http://terminal.local:4173/`; it is not a user-facing URL. The supervisor owns the preview lifecycle. The ignored local profile survives the supervisor's cleared process environment.

The portable profile simulates ChatGPT sign-in only for loopback development requests. Visit `/signin-with-chatgpt?return_to=/` to sign in as `local_seedy` (`seedy@sites.test`, display name `Seedy`) and `/signout-with-chatgpt?return_to=/` to sign out. The development cookie preserves that identity across server restarts. Mock auth is disabled in the managed-linux profile and is not included in production builds; hosted authentication remains dispatch-owned.

The Worker uses `vinext/server/fetch-handler`, including Vinext's config-aware image handling. After building, `npm start` runs that Worker locally through Wrangler on `127.0.0.1`, sharing `.wrangler/state` with dev preview and local D1 migrations; it does not deploy the site or simulate sign-in. Use the URL printed by the server. Pass `npm start -- --port <port>` to select a different built-preview port.

Local previews use Miniflare's placeholder `Request.cf` metadata without a network lookup. Set `CLOUDFLARE_CF_FETCH_ENABLED=true` to opt into fetching preview metadata; this setting does not change hosted request metadata.

Local tool usage metrics are disabled by default. Set `WRANGLER_SEND_METRICS=true` to opt in.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `@cloudflare/workers-types` provides Worker types; `cloudflare-env.d.ts` declares optional `DB`/`BUCKET` bindings—update these declarations if binding names change
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Use it as the durable user key; use email and name for display or contact purposes.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use the returned `userId` as the stable user key for user-owned records; do not use email as a durable identifier.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- In a Server Component, start sign-in with `<a href={chatGPTSignInPath(returnTo)} target="_top">`. The auth helper module is server-only; do not import it into a Client Component.
- Do not use `fetch`, XHR, a client-side router, or a framework link that can prefetch the sign-in route. SIWC must start as a top-level navigation.
- Never request the AuthAPI authorization endpoint directly. The dispatch-owned `/signin-with-chatgpt` route must start the SIWC flow.
- Use `chatGPTSignOutPath(returnTo)` for browser sign-out links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. Do not implement app routes for those reserved paths. Routes that do not import and call the helper remain anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the Sites hosting platform's access policy controls for workspace-wide restrictions, or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write actions tied to the current ChatGPT user. Leave public content anonymous.

## Local D1 migrations

For a D1-backed local preview, generate SQL with `npm run db:generate`. Build once through the Sites skill's build entrypoint (or `npm run build` for standalone use) to generate `dist/server/wrangler.json`, rebuilding if bindings change. From the project root, apply each pending migration in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_example.sql
```

Replace the filename with the pending migration and `DB` with your D1 binding name if different. Use `.wrangler/state`, not `.wrangler/state/v3`; Wrangler adds the versioned directories. Do not replay migrations already applied locally. This updates only the preview database; publishing applies production migrations separately.

## Diagnostic Commands

- `npm run install:ci`: perform the one locked dependency install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run start`: preview the built Worker locally with D1/R2 support
- `npm run db:generate`: generate Drizzle migrations after schema changes

When using the Sites plugin, follow its skill instructions for installation, builds, and publishing. These npm commands remain available for standalone use.

The portable build runs Vinext directly without a host `timeout` command. The managed-linux build uses `scripts/build-verified.sh` and its existing `SITES_BUILD_TIMEOUT` setting.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
