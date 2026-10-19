export const gameMarkup = `
  <dialog id="difficulty-dialog" class="tutorial-intro-dialog difficulty-dialog" aria-labelledby="difficulty-title">
    <div class="difficulty-heading"><h2 id="difficulty-title">난이도 선택</h2><button id="close-difficulty" class="text-button" type="button" aria-label="난이도 선택 닫기">×</button></div>
    <div class="difficulty-options">
      <button type="button" data-difficulty="easy"><strong>쉬움</strong><span>같은 강에서는 한 종만 출제합니다.</span></button>
      <button type="button" data-difficulty="medium"><strong>보통</strong><span>같은 목에서는 한 종만 출제합니다.</span></button>
      <button type="button" data-difficulty="hard"><strong>어려움</strong><span>모든 동물을 분류합니다.</span></button>
      <button id="death-difficulty" type="button" disabled><strong>죽음</strong><span id="death-difficulty-status">어려움 완주 후 해금</span></button>
    </div>
  </dialog>
  <dialog id="settings-dialog" class="ancestor-dialog settings-dialog" aria-labelledby="settings-title">
    <div class="difficulty-heading"><h2 id="settings-title">설정</h2><button id="close-settings" class="text-button" type="button" aria-label="설정 닫기">×</button></div>
    <label class="photo-setting"><input id="hide-insect-photos" type="checkbox" /><span>곤충 사진 가리기<small>곤충 사진을 회색으로 덮습니다. 사진을 누르면 볼 수 있습니다.</small></span></label>
  </dialog>
  <div id="boot-loading" class="loading-screen" role="status" aria-live="polite"><div class="loading-content"><span class="loading-spinner" aria-hidden="true"></span><strong>갈래</strong><p id="boot-loading-status">계정과 기록을 불러오는 중…</p></div></div>
  <div id="game-loading" class="loading-screen" role="status" aria-live="polite" hidden><div class="loading-content"><span class="loading-spinner" aria-hidden="true"></span><strong>갈래</strong><p>첫 생물 카드를 준비하는 중…</p></div></div>
  <main id="lobby" class="screen lobby-screen">
    <div class="lobby-main">
      <div class="lobby-left">
        <section class="lobby-intro" aria-labelledby="lobby-title">
          <h1 id="lobby-title">갈래</h1>
          <p class="intro-copy">하나의 생명에서 뻗어 나온 수많은 갈래. 새로운 생물의 자리를 찾아 계통수를 완성해 보세요.</p>
        </section>
        <section class="mode-panel" aria-label="게임 시작">
        <div><p class="panel-label">플레이할 계</p><h2 id="kingdom-title">동물계</h2><p id="kingdom-description">인간에서 시작해 서로 다른 동물의 공통 조상을 찾아갑니다.</p>
          <div class="mode-options" aria-label="계 모드 목록"><button type="button" data-kingdom="animals" class="is-active" aria-pressed="true">동물계</button><button type="button" data-kingdom="plants" aria-pressed="false">식물계</button><span aria-disabled="true">균계 · 준비 중</span></div>
        </div>
        <div class="game-start-actions"><button id="start-game" class="primary-button" type="button" disabled>분류 시작 <span aria-hidden="true">→</span></button><button id="start-practice" class="primary-button" type="button" disabled>연습 모드 시작 <span aria-hidden="true">→</span></button></div>
        <div class="mode-links"><button id="start-tutorial" class="text-button" type="button">튜토리얼</button>
        </div>
        </section>
      </div>
      <div class="lobby-sculpture-stage">
        <button id="lobby-sculpture" class="lobby-sculpture" type="button" aria-label="입체 계통도. 드래그 또는 방향키로 회전, 클릭 또는 Enter로 다크모드 전환." aria-pressed="false"></button>
      </div>
    </div>
    <button class="collection-shortcut" type="button" data-page="collection" aria-label="도감 열기" title="도감">
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M12 10 31 6l8 5v29l-19 4-8-5Z" fill="#414950" />
        <path d="m20 15 19-4v25l-19 4Z" fill="#f0eee8" />
        <path d="m23 18 12-2m-12 7 12-2m-12 7 12-2m-12 7 12-2" stroke="#c5c4be" stroke-width="1.5" />
        <path d="m12 10 8 5v29l-8-5Z" fill="#5e6871" />
        <path d="m12 10 19-4 8 5-19 4Z" fill="#78838c" />
        <path d="m15 18 2 1m-2 3 2 1m-2 11 2 1" stroke="#e5e8e9" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>
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
    <section class="collection" aria-labelledby="collection-title">
      <div class="collection-header">
      <button class="text-button" type="button" data-page="lobby">← 로비</button>
      <div class="section-heading"><div><h2 id="collection-title">도감</h2></div><p id="collection-count">0종 발견</p></div>
      <div class="collection-view-controls tree-layout-controls" role="group" aria-label="도감 보기 모드">
        <button type="button" data-collection-view="cards" aria-pressed="true">도감</button>
        <button type="button" data-collection-view="tree" aria-pressed="false">계통수</button>
        <button type="button" disabled title="준비 중">내 세계 · 준비 중</button>
      </div>
      <div class="tree-layout-controls" role="group" aria-label="도감 언어"><button type="button" data-card-language="ko" aria-pressed="false">한글</button><button type="button" data-card-language="en" aria-pressed="true">영어</button></div>
        <div class="collection-tree-toolbar">
          <div class="tree-layout-controls" role="group" aria-label="도감 계통수 배치"><button type="button" data-tree-layout="top" aria-pressed="true">위</button><button type="button" data-tree-layout="bottom" aria-pressed="false">아래</button><button type="button" data-tree-layout="radial" aria-pressed="false">원형</button></div>
          <div class="tree-zoom-controls"><button id="collection-zoom-out" type="button" aria-label="도감 계통수 축소">−</button><span id="collection-zoom-status" class="tree-zoom-status" aria-live="polite">100%</span><button id="collection-zoom-in" type="button" aria-label="도감 계통수 확대">+</button></div><button id="collection-tree-fit" class="tree-reset-view" type="button">보기 초기화</button>
        </div>
        <p class="collection-tree-help">휠로 확대·축소하고, 빈 곳을 드래그해 이동할 수 있습니다. 진한 계급 표식을 누르면 특징·대표 생물·진화 이야기가 열립니다.</p>
        <form id="collection-branch-search" class="collection-branch-search" role="search">
          <input id="collection-branch-query" type="search" placeholder="분기점 검색" aria-label="분기점 검색" aria-controls="collection-branch-results" autocomplete="off" maxlength="80" />
          <ul id="collection-branch-results" class="collection-branch-results" hidden></ul>
          <span id="collection-branch-status" class="sr-only" role="status"></span>
        </form>
      </div>
      <div id="collection-grid" class="collection-grid"></div>
      <div id="collection-tree-panel" hidden>
        <aside id="collection-rank-legend" class="collection-rank-legend" aria-label="계통수 계급 범례"></aside>
        <div id="collection-tree" class="tree-canvas" tabindex="0" role="region" aria-label="수집한 동물의 계통수"></div>
      </div>
      <p class="data-attribution">Species text and taxonomy data from <a href="https://en.wikipedia.org/" target="_blank" rel="noreferrer">English Wikipedia</a> (<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>) and <a href="https://www.wikidata.org/" target="_blank" rel="noreferrer">Wikidata</a>. Images are provided by <a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer">Wikimedia Commons</a> under the license shown on each card.</p>
    </section>
  </main>
  <main id="tasks-page" class="screen library-screen" data-lobby-page hidden>
    <button class="text-button page-back" type="button" data-page="lobby">← 로비</button>
    <section class="tasks-panel"><div class="section-heading"><h1 tabindex="-1">발전과제</h1><p id="achievements-count">0 / 26</p></div><p id="achievements-status" role="status">메달을 가리키거나 눌러 설명을 확인해 보세요.</p><div id="achievements-grid"></div></section>
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
          <button type="button" data-page="collection">도감</button>
          <button type="button" data-page="tasks">발전과제</button>
          <button type="button" data-page="taxonomy-notes">분류 기준 안내</button>
          <button id="open-settings" type="button">설정</button>
        </div>
        <div id="auth-panel" class="auth-panel toolbar-account" aria-live="polite"><span class="auth-loading">게임 계정 확인 중…</span></div>
      </nav>
    </div>
  </div>
  <main id="taxonomy-notes-page" class="screen library-screen" data-lobby-page hidden>
    <button class="text-button page-back" type="button" data-page="lobby">← 로비</button>
    <section class="collection taxonomy-notes-panel" aria-labelledby="taxonomy-notes-title">
      <div class="section-heading"><h2 id="taxonomy-notes-title">분류 기준 안내</h2></div>
      <div class="taxonomy-notes">
        <p>연구 근거에 따라 채택한 관계와 게임에서 단순화한 분기를 안내합니다. 정답 판정은 아래 기준을 따릅니다. 2026년 10월 13일 갱신.</p>
        <ul>
          <li><strong>석회·육방·보통해면</strong> — 2026년 계통유전체 연구를 따라 육방해면강(Hexactinellida)과 보통해면강(Demospongiae)을 Silicea로 먼저 묶고, 석회해면강(Calcarea)은 그 바깥에서 분기하도록 판정합니다. 기존 세 갈래 표시는 공통 조상 누락이었으며 이를 보완했습니다. 전체 연구에서는 석회해면과 동골해면류(Homoscleromorpha)가 다른 묶음을 이루지만, 게임에는 동골해면류가 수록되지 않아 그 분기는 표시하지 않습니다. <a href="https://doi.org/10.1126/sciadv.adx1754" target="_blank" rel="noreferrer">2026년 해면동물 계통유전체 연구</a></li>
          <li><strong>새예·선형·범절지동물</strong> — 2025년 CAT-PMSF 계통유전체 연구를 따라 선형동물문(Nematoda)과 범절지동물(Panarthropoda)을 먼저 묶고, 새예동물문(Priapulida)은 그 바깥에서 분기하도록 판정합니다. 이 공통 갈래는 Cryptovermes에 해당합니다. 범절지동물에는 절지·유조·완보동물이 포함되며, 기존 세 갈래 표시는 누락된 공통 조상을 보완해 제거했습니다. 연구마다 분석 결과가 다르고 유선형동물(Nematomorpha)의 위치에는 불확실성이 남아 있으므로, 게임은 위 연구의 CAT-PMSF 관계를 채택합니다. <a href="https://academic.oup.com/gbe/article/17/1/evae273/7931680" target="_blank" rel="noreferrer">2025년 계통유전체 연구</a></li>
          <li><strong>상자해파리·해파리·히드라충</strong> — 핵 유전체·전사체 기반 계통 연구를 따라 상자해파리강(Cubozoa)과 해파리강(Scyphozoa)을 Rhopaliophora로 먼저 묶고, 히드라충강(Hydrozoa)은 그 묶음의 바깥에서 분기하도록 판정합니다. 기존 세 갈래 표시는 공통 조상 누락이었으며 이를 보완했습니다. 연구의 전체 계통수에서는 십자해파리강(Staurozoa)이 Rhopaliophora와 함께 Acraspeda를 이루지만, 게임에는 십자해파리가 수록되지 않아 그 분기는 표시하지 않습니다. <a href="https://doi.org/10.1186/s12862-018-1142-0" target="_blank" rel="noreferrer">자포동물 계통유전체 연구</a></li>
          <li><strong>보대동물군과 후구동물</strong> — 극피동물문과 반삭동물문은 자매군인 보대동물군(Ambulacraria)으로 먼저 묶고, 척삭동물문은 그 바깥에서 분기하도록 판정합니다. 기존의 세 갈래 표시는 분기 순서의 불확실성 때문이 아니라 공통 조상 누락이었으며 이를 보완했습니다. 보대동물군 자체와 달리, 보대동물군·척삭동물을 모두 포함하는 후구동물(Deuterostomia)의 단일계통성에는 논쟁이 남아 있습니다. 게임은 후구동물 갈래를 유지하는 가설을 채택합니다. <a href="https://www.nature.com/articles/nature16150" target="_blank" rel="noreferrer">보대동물군 계통유전체 근거</a> · <a href="https://www.annualreviews.org/content/journals/10.1146/annurev-ecolsys-102722-023501" target="_blank" rel="noreferrer">2025년 후구동물 검토</a></li>
          <li><strong>동물계 초기 분기</strong> — 유즐동물문(Ctenophora)과 판형동물문(Placozoa)을 동물계 공통조상 바로 아래의 별도 가지로 둡니다. 둘이 자매군이라는 뜻은 아니며, 어느 쪽이 먼저 분기했는지는 게임에서 판정하지 않습니다. 이들의 정확한 위치는 연구마다 다릅니다. <a href="https://www.nature.com/articles/s41586-023-05936-6" target="_blank" rel="noreferrer">유즐동물 연구</a> · <a href="https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.2005359" target="_blank" rel="noreferrer">판형동물 연구</a></li>
          <li><strong>Symsagittifera roscoffensis</strong> — 과거 편형동물로 분류되기도 했지만, 게임에서는 편형동물문이 아닌 Xenacoelomorpha문에 둡니다. Xenacoelomorpha의 상위 위치에는 여러 가설이 있으며, 게임은 Nephrozoa의 자매군 가설을 택합니다. <a href="https://www.nature.com/articles/nature16520" target="_blank" rel="noreferrer">채택한 가설</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11521371/" target="_blank" rel="noreferrer">다른 가설</a></li>
          <li><strong>유조·절지·완보동물</strong> — 유조동물과 절지동물을 자매군으로 묶고, 완보동물은 그 묶음의 바깥에서 분기하도록 판정합니다. 세 문을 같은 분기점에 나란히 붙이는 기존 단순화를 제거했습니다. 2025년 학술지에 수록된 CAT-PMSF 계통유전체 연구와 2026년 미토게놈 연구가 지지하는 관계를 채택했습니다. <a href="https://academic.oup.com/gbe/article/17/1/evae273/7931680" target="_blank" rel="noreferrer">2025년 연구</a> · <a href="https://www.mdpi.com/2073-4425/17/4/372" target="_blank" rel="noreferrer">2026년 연구</a></li>
          <li><strong>다모류와 환대류</strong> — 전통적인 다모강(Polychaeta)은 측계통군이므로 하나의 독립된 갈래로 강제하지 않습니다. 지렁이·거머리를 포함하는 환대류(Clitellata)는 Sedentaria 안에 둡니다. 카드의 강·목 이름과 계통수의 공통 조상 갈래는 구분합니다. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5013799/" target="_blank" rel="noreferrer">환형동물 계통 근거</a></li>
          <li><strong>나선동물의 깊은 분기</strong> — 환형·편형·연체동물은 게임의 Lophotrochozoa 갈래로 묶어 윤형동물과 구분합니다. 거머리(환형동물)·조충(편형동물)·연체동물이 같은 원에서 갈라지는 표시는 문 사이의 깊은 관계를 단순화한 것입니다. 어느 두 문을 먼저 묶을지는 판정하지 않으며, 동시에 분화했다는 뜻도 아닙니다. 최근 연구 종합에서도 이 구간의 관계에는 논쟁이 남아 있습니다. Lophotrochozoa라는 이름의 범위도 문헌마다 다릅니다. <a href="https://onlinelibrary.wiley.com/doi/full/10.1111/zsc.70056" target="_blank" rel="noreferrer">2026년 연구 종합</a></li>
          <li><strong>연체동물의 내부 분기</strong> — 2025년 유전체 연구를 따라 두족류는 복족류와 Diasoma(이매패류·굴족류)를 포함한 묶음의 바깥에서 갈라지도록 판정합니다. 현재 수록종에서는 조개·달팽이를 먼저 묶고 문어·오징어·앵무조개는 그 바깥에서 분기합니다. 기존 세 갈래는 공통 조상 누락이었으며 이를 보완했습니다. 게임에 굴족류가 없으므로 조개·달팽이가 바로 자매군처럼 보이지만, 실제 연구에서는 굴족류도 그 묶음에 포함됩니다. <a href="https://doi.org/10.1126/science.ads0215" target="_blank" rel="noreferrer">2025년 연체동물 유전체 연구</a></li>
          <li><strong>난이도에 사용하는 계급</strong> — 쉬움은 같은 강, 보통은 같은 목에서 한 종만 출제합니다. 강·목이 누락된 경우에는 검토한 등록부 정보를 보완하고, 등록부에서도 계급이 미지정인 종은 해당 난이도에서 제외합니다. 어려움과 연습 모드에서는 전체 종을 사용합니다. 분류 등록부의 계급 차이만으로 계통 관계를 바꾸지는 않습니다.</li>
          <li><strong>검토에서 보완한 공통 갈래</strong> — 폐어·사지동물, 유대류·태반류, 지네·범갑각류, 딱정벌레·파리·나비 등에서 누락된 공통 갈래를 보완했습니다. 전통적인 강·목 이름이 다르다는 이유만으로 동물을 별도 갈래로 나누지는 않습니다.</li>
        </ul>
      </div>
    </section>
  </main>
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
        <div id="failure-panel" class="failure-panel" role="alert" hidden><div><p class="eyebrow">CLASSIFICATION FAILED</p><strong id="failure-title">분류에 실패했어요.</strong><p id="failure-copy">초록색으로 표시된 곳이 올바른 위치입니다.</p><p id="failure-score-status" class="failure-score-status"></p></div><button id="retry-game" class="primary-button" type="button">처음부터 다시 →</button></div>
        <div id="tutorial-complete-panel" class="failure-panel" role="status" hidden><div><p class="eyebrow">TUTORIAL COMPLETE</p><strong>튜토리얼을 마쳤어요.</strong><p>개미가 추가된 위치를 살펴보세요. 네 가지 배치 방법을 모두 연습했습니다.</p></div><div class="tutorial-complete-actions"><button id="tutorial-complete-lobby" class="text-button" type="button">로비로</button><button id="tutorial-play" class="primary-button" type="button">실전 시작 →</button></div></div>
      </section>
      <aside class="card-dock" aria-labelledby="card-dock-title">
        <div class="dock-copy"><p class="eyebrow">NEW SPECIES</p><h2 id="card-dock-title">새 동물 카드</h2></div>
        <div id="active-card" class="animal-card is-draggable" draggable="true" tabindex="0" role="group" aria-describedby="drag-help">
          <div class="card-topline"><span>동물계</span><span>ANIMALIA</span></div><div class="card-art"><img id="active-image" alt="" /><span id="active-image-fallback" aria-hidden="true">?</span></div>
          <div class="card-body"><p class="card-kicker">NEW SPECIES</p><h3 id="active-name">Loading…</h3><p id="active-description">Loading the animal dataset.</p></div><div class="card-footer"><span id="active-scientific">—</span><span id="active-success-count">분류 성공 0회</span></div>
        </div>
        <a id="active-credit" class="image-credit" href="#" target="_blank" rel="noreferrer">Image credit</a>
        <p id="drag-help" class="drag-help">원형 분기점에 놓으면 같은 조상 아래 가지가 추가되고, 분기점으로 이어지는 선에 놓으면 새로운 공통 조상이 생깁니다. 이미 분류한 생물은 선택하지 않은 상태에서 눌러 카드를 다시 볼 수 있어요.</p>
        <div class="card-language"><p>동물카드 언어 전환하기</p><div class="tree-layout-controls" role="group" aria-label="동물카드 언어"><button type="button" data-card-language="en" aria-pressed="true">영어</button><button type="button" data-card-language="ko" aria-pressed="false">한글</button></div><p class="card-language-note">계통분류학은 영어로 배울 때 가장 오류가 적습니다.</p></div>
      </aside>
    </div>
  </main>
  <dialog id="guest-start-dialog" class="tutorial-intro-dialog guest-start-dialog" aria-labelledby="guest-start-title" aria-describedby="guest-start-copy"><h2 id="guest-start-title">잠깐만요!</h2><p id="guest-start-copy">로그인하지 않고 시작하면 기록이 남지 않아요.</p><form method="dialog" class="guest-start-actions"><button class="secondary-button" value="play" autofocus>알겠으니까 그냥 할게요!</button><button class="primary-button" value="login">로그인하러 가기</button></form></dialog>
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
  <dialog id="ancestor-guide" class="ancestor-dialog ancestor-guide" aria-labelledby="ancestor-guide-title"><h2 id="ancestor-guide-title">분류군의 이야기를 만나보세요</h2><p>진한 <strong>계급 표식</strong>을 누르면 특징·대표 생물·진화 연구 이야기를 볼 수 있습니다.</p><p>오른쪽 범례에서 모양별 계급을 확인하고, 문과 문을 잇는 분기와 동물계의 공통 조상도 살펴보세요.</p><button id="close-ancestor-guide" class="primary-button" type="button" autofocus>알겠어요</button></dialog>
  <dialog id="ancestor-dialog" class="ancestor-dialog" aria-labelledby="ancestor-title"><button id="close-ancestor" class="dialog-close" type="button" aria-label="조상 설명 닫기" autofocus>×</button><h2 id="ancestor-title"></h2><p id="ancestor-scientific" class="ancestor-scientific"></p><figure class="ancestor-photo"><div class="ancestor-photo-art"><img id="ancestor-image" alt="" /><p id="ancestor-image-fallback" hidden></p></div><figcaption id="ancestor-image-caption"></figcaption><a id="ancestor-image-credit" target="_blank" rel="noreferrer"></a></figure><div id="ancestor-content"></div><div id="ancestor-sources" class="ancestor-sources" aria-label="연구 출처"></div><p id="ancestor-note" class="ancestor-note"></p></dialog>
  <div id="achievement-notifications" class="achievement-notifications" role="status" aria-live="polite" aria-relevant="additions" aria-label="새로 달성한 발전과제"></div>
  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
`;
