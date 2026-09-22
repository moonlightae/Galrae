"use client";

import { useEffect } from "react";

declare global {
  interface Window { __galraeBooted?: boolean; }
}

const markup = `
  <div class="paper-noise" aria-hidden="true"></div>
  <main id="lobby" class="screen lobby-screen">
    <header class="site-header">
      <a class="wordmark" href="#" aria-label="갈래 홈"><span class="wordmark-mark" aria-hidden="true">Y</span><span>갈래</span></a>
      <div class="header-actions"><p class="header-meta">동물계 · 첫 번째 모드</p><div id="auth-panel" class="auth-panel" aria-live="polite"><span class="auth-loading">계정 확인 중…</span></div></div>
    </header>
    <section class="lobby-intro" aria-labelledby="lobby-title">
      <p class="eyebrow">PHYLOGENY CARD GAME</p><h1 id="lobby-title">생명의 갈래를<br />찾아주세요.</h1>
      <p class="intro-copy">새로운 생물이 기존 생물과 어디에서 갈라졌는지 맞혀 계통수를 완성하세요.</p>
      <div class="mode-panel">
        <div><p class="panel-label">플레이할 계</p><h2>동물계</h2><p>인간에서 시작해 서로 다른 동물의 공통 조상을 찾아갑니다.</p>
          <div class="mode-options" aria-label="계 모드 목록"><span class="is-active">동물계</span><span aria-disabled="true">식물계 · 준비 중</span><span aria-disabled="true">균계 · 준비 중</span></div>
        </div>
        <div class="mode-badge" aria-label="선택됨">ANIMALIA</div>
        <button id="start-game" class="primary-button" type="button" disabled>데이터 불러오는 중… <span aria-hidden="true">→</span></button>
      </div>
    </section>
    <section class="leaderboard" aria-labelledby="leaderboard-title">
      <div class="section-heading leaderboard-heading"><div><p class="eyebrow">GLOBAL RANKING</p><h2 id="leaderboard-title">리더보드</h2></div><p id="leaderboard-status">기록을 불러오는 중…</p></div>
      <ol id="leaderboard-list" class="leaderboard-list" aria-live="polite"></ol>
      <p id="leaderboard-note" class="leaderboard-note">로그인하면 게임 기록이 자동으로 등록됩니다.</p>
    </section>
    <section class="collection" aria-labelledby="collection-title">
      <div class="section-heading"><div><p class="eyebrow">MY COLLECTION</p><h2 id="collection-title">분류한 생물</h2></div><p id="collection-count">0종 발견</p></div>
      <div id="collection-grid" class="collection-grid"></div>
      <p class="data-attribution">Species text and taxonomy data from <a href="https://en.wikipedia.org/" target="_blank" rel="noreferrer">English Wikipedia</a> (<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>) and <a href="https://www.wikidata.org/" target="_blank" rel="noreferrer">Wikidata</a>. Images are provided by <a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer">Wikimedia Commons</a> under the license shown on each card.</p>
    </section>
  </main>
  <main id="game" class="screen game-screen" hidden>
    <header class="game-header"><button id="quit-game" class="text-button" type="button">← 로비</button><div class="game-progress" aria-live="polite"><span id="round-label">동물계 · 1번째 분류</span><span id="score-label">정답 0</span></div></header>
    <div class="game-layout">
      <section class="tree-panel" aria-labelledby="tree-title">
        <div class="tree-heading"><div><p class="eyebrow">CURRENT TREE</p><h1 id="tree-title">현재 계통수</h1></div></div>
        <div id="tree-canvas" class="tree-canvas" aria-live="polite"></div>
        <div id="failure-panel" class="failure-panel" role="alert" hidden><div><p class="eyebrow">CLASSIFICATION FAILED</p><strong>분류에 실패했어요.</strong><p>초록색으로 표시된 곳이 올바른 위치입니다.</p><p id="failure-score-status" class="failure-score-status"></p></div><button id="retry-game" class="primary-button" type="button">처음부터 다시 →</button></div>
      </section>
      <aside class="card-dock" aria-labelledby="card-dock-title">
        <div class="dock-copy"><p class="eyebrow">NEW SPECIES</p><h2 id="card-dock-title">새 동물 카드</h2></div>
        <div id="active-card" class="animal-card is-draggable" draggable="true" tabindex="0" role="button" aria-describedby="drag-help">
          <div class="card-topline"><span>동물계</span><span>ANIMALIA</span></div><div class="card-art"><img id="active-image" alt="" /><span id="active-image-fallback" aria-hidden="true">?</span></div>
          <div class="card-body"><p class="card-kicker">NEW SPECIES</p><h3 id="active-name">Loading…</h3><p id="active-description">Loading the animal dataset.</p></div><div class="card-footer"><span id="active-scientific">—</span><span id="active-number">01</span></div>
        </div>
        <a id="active-credit" class="image-credit" href="#" target="_blank" rel="noreferrer">Image credit</a>
        <p id="drag-help" class="drag-help">원형 분기점에 놓으면 같은 조상 아래 가지가 추가되고, 분기점 위 선에 놓으면 새로운 공통 조상이 생깁니다. 이미 분류한 생물은 선택하지 않은 상태에서 눌러 카드를 다시 볼 수 있어요.</p>
      </aside>
    </div>
  </main>
  <div id="result-modal" class="modal-backdrop" hidden><section class="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title"><p class="eyebrow">CLASSIFICATION COMPLETE</p><h2 id="result-title">분류를 마쳤어요.</h2><div class="result-number"><strong id="result-count">0</strong><span>species</span></div><p id="result-copy">새로운 동물을 올바른 갈래에 놓았습니다.</p><p id="score-submit-status" class="score-submit-status"></p><button id="return-lobby" class="primary-button" type="button">수집함 보기 →</button></section></div>
  <div id="species-modal" class="modal-backdrop species-modal-backdrop" hidden><section class="species-dialog" role="dialog" aria-modal="true" aria-labelledby="species-view-name"><button id="close-species-card" class="dialog-close" type="button" aria-label="카드 닫기">×</button><div class="animal-card species-view-card"><div class="card-topline"><span>동물계</span><span>ANIMALIA</span></div><div class="card-art"><img id="species-view-image" alt="" /><span id="species-view-fallback" aria-hidden="true">?</span></div><div class="card-body"><p class="card-kicker">CLASSIFIED SPECIES</p><h3 id="species-view-name">—</h3><p id="species-view-description">—</p></div><div class="card-footer"><span id="species-view-scientific">—</span><span>✓</span></div></div><a id="species-view-credit" class="dialog-image-credit" href="#" target="_blank" rel="noreferrer">Image credit</a></section></div>
  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
`;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.body.appendChild(script);
  });
}

export default function GameClient() {
  useEffect(() => {
    if (window.__galraeBooted) return;
    window.__galraeBooted = true;
    loadScript("/game-logic.js").then(() => loadScript("/app.js")).catch(console.error);
  }, []);
  return <div dangerouslySetInnerHTML={{ __html: markup }} />;
}
