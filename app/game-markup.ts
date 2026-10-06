export const gameMarkup = `
  <div id="boot-loading" class="loading-screen" role="status" aria-live="polite"><div class="loading-content"><span class="loading-spinner" aria-hidden="true"></span><strong>갈래</strong><p id="boot-loading-status">계정과 기록을 불러오는 중…</p></div></div>
  <div id="game-loading" class="loading-screen" role="status" aria-live="polite" hidden><div class="loading-content"><span class="loading-spinner" aria-hidden="true"></span><strong>갈래</strong><p>첫 생물 카드를 준비하는 중…</p></div></div>
  <div class="paper-noise" aria-hidden="true"></div>
  <main id="lobby" class="screen lobby-screen">
    <div class="lobby-main">
      <div class="lobby-left">
        <section class="lobby-intro" aria-labelledby="lobby-title">
          <h1 id="lobby-title">갈래</h1>
          <p class="intro-copy">하나의 생명에서 뻗어 나온 수많은 갈래. 새로운 생물의 자리를 찾아 계통수를 완성해 보세요.</p>
        </section>
        <section class="mode-panel" aria-label="게임 시작">
        <div><p class="panel-label">플레이할 계</p><h2>동물계</h2><p>인간에서 시작해 서로 다른 동물의 공통 조상을 찾아갑니다.</p>
          <div class="mode-options" aria-label="계 모드 목록"><span class="is-active">동물계</span><span aria-disabled="true">식물계 · 준비 중</span><span aria-disabled="true">균계 · 준비 중</span></div>
        </div>
        <div class="mode-badge" aria-label="선택됨">ANIMALIA</div>
        <button id="start-game" class="primary-button" type="button" disabled>데이터 불러오는 중… <span aria-hidden="true">→</span></button>
        <div class="mode-links"><button id="start-tutorial" class="text-button" type="button">튜토리얼</button>
        </div>
        </section>
      </div>
      <div class="lobby-sculpture-stage">
        <button id="lobby-sculpture" class="lobby-sculpture" type="button" aria-label="입체 계통도. 드래그 또는 방향키로 회전, 클릭 또는 Enter로 색상 전환."></button>
      </div>
    </div>
  </main>
  <main id="leaderboard-page" class="screen library-screen" data-lobby-page hidden>
    <button class="text-button page-back" type="button" data-page="lobby">← 로비</button>
      <section class="leaderboard" aria-labelledby="leaderboard-title">
        <div class="section-heading leaderboard-heading"><div><h2 id="leaderboard-title">리더보드</h2></div><p id="leaderboard-status">기록을 불러오는 중…</p></div>
        <ol id="leaderboard-list" class="leaderboard-list" aria-live="polite"></ol>
        <p id="leaderboard-note" class="leaderboard-note">게임 아이디로 로그인하면 최고 기록이 자동으로 등록됩니다.</p>
      </section>
  </main>
  <main id="collection-page" class="screen library-screen" data-lobby-page hidden>
    <button class="text-button page-back" type="button" data-page="lobby">← 로비</button>
    <section class="collection" aria-labelledby="collection-title">
      <div class="section-heading"><div><h2 id="collection-title">분류한 카드</h2></div><p id="collection-count">0종 발견</p></div>
      <div id="collection-grid" class="collection-grid"></div>
      <p class="data-attribution">Species text and taxonomy data from <a href="https://en.wikipedia.org/" target="_blank" rel="noreferrer">English Wikipedia</a> (<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>) and <a href="https://www.wikidata.org/" target="_blank" rel="noreferrer">Wikidata</a>. Images are provided by <a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer">Wikimedia Commons</a> under the license shown on each card.</p>
    </section>
  </main>
  <main id="tasks-page" class="screen library-screen" data-lobby-page hidden>
    <button class="text-button page-back" type="button" data-page="lobby">← 로비</button>
    <section class="tasks-panel"><h1 tabindex="-1">발전과제</h1><p>발전과제는 준비 중입니다.</p></section>
  </main>
  <div id="navigation-shell" class="navigation-shell">
    <button id="toolbar-shade" class="toolbar-shade" type="button" tabindex="-1" aria-label="메뉴 닫기"></button>
    <div id="toolbar-edge" class="toolbar-edge">
      <button id="toolbar-handle" class="toolbar-handle" type="button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="side-toolbar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg><span>메뉴</span></button>
      <nav id="side-toolbar" class="side-toolbar" aria-label="화면 메뉴" inert>
        <div class="toolbar-heading"><span>갈래</span><button id="close-toolbar" class="text-button" type="button" aria-label="메뉴 닫기">×</button></div>
        <div class="toolbar-pages">
          <button type="button" data-page="lobby" aria-current="page">로비</button>
          <button type="button" data-page="leaderboard">리더보드</button>
          <button type="button" data-page="collection">카드 리스트</button>
          <button type="button" data-page="tasks">발전과제</button>
          <button id="taxonomy-notes-toggle" type="button" aria-expanded="false" aria-haspopup="dialog" aria-controls="taxonomy-notes-modal">분류 기준 안내</button>
        </div>
        <div id="auth-panel" class="auth-panel toolbar-account" aria-live="polite"><span class="auth-loading">게임 계정 확인 중…</span></div>
      </nav>
    </div>
  </div>
  <div id="taxonomy-notes-modal" class="modal-backdrop taxonomy-notes-backdrop" hidden>
    <section class="taxonomy-notes-dialog" role="dialog" aria-modal="true" aria-labelledby="taxonomy-notes-title">
      <button id="close-taxonomy-notes" class="dialog-close" type="button" aria-label="주의점 창 닫기">×</button>
      <h2 id="taxonomy-notes-title">주의점</h2>
      <div class="taxonomy-notes">
        <p>계통 관계가 논쟁 중인 곳은 게임을 위해 하나의 가설을 선택했습니다. 아래 내용은 게임 중에는 표시되지 않습니다.</p>
        <ul>
          <li><strong>동물계 초기 분기</strong> — 유즐동물문(Ctenophora)과 판형동물문(Placozoa)을 동물계 공통조상 바로 아래의 별도 가지로 둡니다. 둘이 자매군이라는 뜻은 아니며, 어느 쪽이 먼저 분기했는지는 게임에서 판정하지 않습니다. 이들의 정확한 위치는 연구마다 다릅니다. <a href="https://www.nature.com/articles/s41586-023-05936-6" target="_blank" rel="noreferrer">유즐동물 연구</a> · <a href="https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.2005359" target="_blank" rel="noreferrer">판형동물 연구</a></li>
          <li><strong>Symsagittifera roscoffensis</strong> — 과거 편형동물로 분류되기도 했지만, 게임에서는 편형동물문이 아닌 Xenacoelomorpha문에 둡니다. Xenacoelomorpha의 상위 위치에는 여러 가설이 있으며, 게임은 Nephrozoa의 자매군 가설을 택합니다. <a href="https://www.nature.com/articles/nature16520" target="_blank" rel="noreferrer">채택한 가설</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11521371/" target="_blank" rel="noreferrer">다른 가설</a></li>
        </ul>
      </div>
    </section>
  </div>
  <main id="game" class="screen game-screen" hidden>
    <header class="game-header"><button id="quit-game" class="text-button" type="button">← 로비</button><div class="game-progress" aria-live="polite"><span id="round-label">동물계 · 1번째 분류</span><span id="score-label">정답 0</span></div></header>
    <div class="game-layout">
      <section class="tree-panel" aria-labelledby="tree-title">
        <div class="tree-heading"><div><p class="eyebrow">CURRENT TREE</p><h1 id="tree-title">현재 계통수</h1></div>
          <div class="tree-toolbar"><div class="tree-layout-controls" role="group" aria-label="계통수 배치">
            <button type="button" data-tree-layout="top" aria-pressed="true" title="공통조상이 위">위</button><button type="button" data-tree-layout="bottom" aria-pressed="false" title="공통조상이 아래">아래</button><button type="button" data-tree-layout="radial" aria-pressed="false" title="공통조상이 가운데">원형</button>
          </div><div class="tree-zoom-controls"><button id="tree-zoom-out" type="button" aria-label="계통수 축소">−</button><span id="tree-zoom-status" class="tree-zoom-status" aria-live="polite">100%</span><button id="tree-zoom-in" type="button" aria-label="계통수 확대">+</button></div><button id="tree-reset-view" class="tree-reset-view" type="button">보기 초기화</button></div>
        </div>
        <p id="tutorial-banner" class="tutorial-banner" role="status" hidden></p>
        <div id="tree-canvas" class="tree-canvas" aria-live="polite"></div>
        <p class="tree-canvas-help">계통수 위에서 휠로 확대·축소하고, 빈 곳을 드래그해 화면을 이동할 수 있습니다.</p>
        <div id="failure-panel" class="failure-panel" role="alert" hidden><div><p class="eyebrow">CLASSIFICATION FAILED</p><strong id="failure-title">분류에 실패했어요.</strong><p id="failure-copy">핑크색으로 표시된 곳이 올바른 위치입니다.</p><p id="failure-score-status" class="failure-score-status"></p></div><button id="retry-game" class="primary-button" type="button">처음부터 다시 →</button></div>
        <div id="tutorial-complete-panel" class="failure-panel" role="status" hidden><div><p class="eyebrow">TUTORIAL COMPLETE</p><strong>튜토리얼을 마쳤어요.</strong><p>개미가 추가된 위치를 살펴보세요. 네 가지 배치 방법을 모두 연습했습니다.</p></div><div class="tutorial-complete-actions"><button id="tutorial-complete-lobby" class="text-button" type="button">로비로</button><button id="tutorial-play" class="primary-button" type="button">실전 시작 →</button></div></div>
      </section>
      <aside class="card-dock" aria-labelledby="card-dock-title">
        <div class="dock-copy"><p class="eyebrow">NEW SPECIES</p><h2 id="card-dock-title">새 동물 카드</h2></div>
        <div id="active-card" class="animal-card is-draggable" draggable="true" tabindex="0" role="button" aria-describedby="drag-help">
          <div class="card-topline"><span>동물계</span><span>ANIMALIA</span></div><div class="card-art"><img id="active-image" alt="" /><span id="active-image-fallback" aria-hidden="true">?</span></div>
          <div class="card-body"><p class="card-kicker">NEW SPECIES</p><h3 id="active-name">Loading…</h3><p id="active-description">Loading the animal dataset.</p></div><div class="card-footer"><span id="active-scientific">—</span><span id="active-success-count">분류 성공 0회</span></div>
        </div>
        <a id="active-credit" class="image-credit" href="#" target="_blank" rel="noreferrer">Image credit</a>
        <p id="drag-help" class="drag-help">원형 분기점에 놓으면 같은 조상 아래 가지가 추가되고, 분기점으로 이어지는 선에 놓으면 새로운 공통 조상이 생깁니다. 이미 분류한 생물은 선택하지 않은 상태에서 눌러 카드를 다시 볼 수 있어요.</p>
        <div class="card-language"><p>동물카드 언어 전환하기</p><div class="tree-layout-controls" role="group" aria-label="동물카드 언어"><button type="button" data-card-language="en" aria-pressed="true">영어</button><button type="button" data-card-language="ko" aria-pressed="false">한글</button></div><p class="card-language-note">계통분류학은 영어로 배울 때 가장 오류가 적습니다.</p></div>
      </aside>
    </div>
  </main>
  <div id="tutorial-intro-modal" class="modal-backdrop tutorial-intro-backdrop" hidden><section class="tutorial-intro-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorial-intro-title"><h2 id="tutorial-intro-title">튜토리얼</h2><p>네 장의 카드로 게임 플레이 방법을 이해합니다.</p><div class="tutorial-intro-actions"><button id="tutorial-quit" class="text-button" type="button">로비로</button><button id="tutorial-begin" class="primary-button" type="button">튜토리얼 시작 →</button></div></section></div>
  <div id="result-modal" class="modal-backdrop" hidden><section class="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title"><p class="eyebrow">CLASSIFICATION COMPLETE</p><h2 id="result-title">분류를 마쳤어요.</h2><div class="result-number"><strong id="result-count">0</strong><span id="result-unit">species</span></div><p id="result-copy">새로운 동물을 올바른 갈래에 놓았습니다.</p><p id="score-submit-status" class="score-submit-status"></p><button id="return-lobby" class="primary-button" type="button">수집함 보기 →</button></section></div>
  <div id="account-modal" class="screen library-screen account-page" data-lobby-page hidden>
    <section class="account-dialog" aria-labelledby="account-title">
      <button id="close-account" class="dialog-close account-close" type="button" aria-label="계정 창 닫기">×</button>
      <div id="account-auth-view">
        <p class="eyebrow">GAME ACCOUNT</p><h2 id="account-title">게임 계정</h2>
        <div class="auth-tabs" role="tablist"><button id="show-login" class="is-active" type="button" role="tab" aria-selected="true">로그인</button><button id="show-register" type="button" role="tab" aria-selected="false">새 계정</button></div>
        <form id="account-form" class="account-form"><label>아이디<input id="account-username" name="username" autocomplete="username" minlength="3" maxlength="20" required /></label><label id="display-name-field" hidden>표시할 이름<input id="account-display-name" name="displayName" autocomplete="nickname" maxlength="30" /></label><label>비밀번호<input id="account-password" name="password" type="password" autocomplete="current-password" minlength="8" maxlength="72" required /></label><label id="confirm-password-field" hidden>비밀번호 확인<input id="account-confirm-password" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" maxlength="72" /></label><p id="account-form-help">이 기기에서 사용할 게임 아이디로 로그인하세요.</p><p id="account-error" class="account-error" role="alert"></p><button id="account-submit" class="primary-button" type="submit">로그인 →</button></form>
      </div>
      <div id="account-profile-view" hidden><p class="eyebrow">GAME ACCOUNT</p><h2 id="account-profile-name">—</h2><p id="account-profile-id" class="account-profile-id">—</p><p class="account-profile-copy">이 아이디의 수집함과 리더보드 기록을 사용하고 있어요.</p><div id="chatgpt-link-panel" class="chatgpt-link-panel"></div><button id="open-admin" class="admin-open-button" type="button" hidden>관리자 도구 →</button></div>
      <div id="admin-view" hidden><div class="admin-heading"><div><p class="eyebrow">ADMIN CONSOLE</p><h2>관리자 도구</h2></div><button id="close-admin" class="text-button" type="button">← 계정</button></div><p class="admin-copy">계정을 삭제하거나 비밀번호를 기본값으로 초기화할 수 있습니다.</p><div id="admin-user-list" class="admin-user-list"></div><button id="reset-leaderboard" class="danger-button wide" type="button">리더보드 전체 초기화</button><p id="admin-status" class="admin-status" role="status"></p></div>
    </section>
  </div>
  <div id="species-modal" class="modal-backdrop species-modal-backdrop" hidden><section class="species-dialog" role="dialog" aria-modal="true" aria-labelledby="species-view-name"><button id="close-species-card" class="dialog-close" type="button" aria-label="카드 닫기">×</button><div class="animal-card species-view-card"><div class="card-topline"><span>동물계</span><span>ANIMALIA</span></div><div class="card-art"><img id="species-view-image" alt="" /><span id="species-view-fallback" aria-hidden="true">?</span></div><div class="card-body"><p class="card-kicker">CLASSIFIED SPECIES</p><h3 id="species-view-name">—</h3><p id="species-view-description">—</p><details id="species-view-taxonomy" class="mini-card-taxonomy" hidden><summary>상위 분류군</summary><div id="species-view-groups" class="mini-card-groups" aria-label="상위 분류군"></div></details></div><div class="card-footer"><span id="species-view-scientific">—</span><span id="species-view-success-count">분류 성공 0회</span></div></div><a id="species-view-credit" class="dialog-image-credit" href="#" target="_blank" rel="noreferrer">Image credit</a></section></div>
  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
`;
