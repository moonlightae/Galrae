# 계통 경로 점검 — 2026-10-06

## 보대동물군 분기 보완 — 2026-10-13

극피동물 9종과 반삭동물 Balanoglossus gigas에 누락된 Ambulacraria 공통 조상을
추가했습니다. 게임은 `(Chordata, (Echinodermata, Hemichordata))`를 채택합니다.
기존 세 갈래는 의도적인 불확실성 표시가 아닌 데이터 누락이었습니다.
`canonical:ambulacraria`는 게임 내부 ID이며 Wikidata ID가 아닙니다.
불가사리·반삭동물·사람 및 바다나리·반삭동물·창고기의 각 6개 등장 순서에서
분기와 정답 판정을 검증합니다. 튜토리얼의 기존 반삭동물 카드는 더 이상
같은 조상에 추가하는 예시가 아니므로 판형동물 카드로 교체했습니다.
분류 기준 안내에는 이 보완과 후구동물의 단일계통성에 남은 논쟁을 구분했습니다.

- [보대동물군의 계통유전체 근거](https://www.nature.com/articles/nature16150)
- [2025년 후구동물 단일계통성 검토](https://www.annualreviews.org/content/journals/10.1146/annurev-ecolsys-102722-023501)

현재 수록된 207종 전체를 NCBI Taxonomy의 종별 LineageEx와 대조했습니다.
205종은 이름/동의어로 자동 대응했고, 나머지는 Leucoraja erinaceus (7782,
게임명 Leucoraja erinacea), Magallana gigas (29159, 게임명 Crassostrea gigas)
기록으로 확인했습니다. 같은 분류군의 이름만 비교하지 않고, 게임의 실제
압축 계통수에 외부 자료의 종 묶음이 존재하는지도 비교했습니다.

## 실제 분기에 영향을 주는 누락 12종류

| 공통 가지 | 수정 대상/관계 |
| --- | --- |
| Dipnotetrapodomorpha | 폐어와 사지동물 / 실러캔스와 분리 |
| Theria | 캥거루·코알라와 태반류 / 단공류와 분리 |
| Afrotheria | 매너티와 코끼리 |
| Mandibulata | 지네와 범갑각류 / 협각류와 분리 |
| Panarthropoda | 절지·유조·완보동물 / 다른 탈피동물과 분리 |
| Lophotrochozoa | 환형·편형·연체동물 / 윤형동물과 분리 |
| Aparaglossata | 딱정벌레·파리·나비 / 벌과 분리 |
| Panorpida | 파리와 나비 / 딱정벌레와 분리 |
| Eleutherozoa | 불가사리·거미불가사리·성게·해삼 / 바다나리와 분리 |
| Hyloidea | 독화살개구리와 두꺼비 / 개구리과와 분리 |
| Chromadorea | 회충과 예쁜꼬마선충 / 선모충과 분리 |
| Eupercaria | 쏠배감펭과 개복치 / 다른 진극기어류와 분리 |

복사할 공통 조상과 기준 종은 scripts/taxonomy-curation.mjs에 명시했습니다.
새 조상을 추가할 때는 기존 분류군 ID를 재사용하며, 서로 다른 종에 같은
분류군이 다른 부모를 갖지 않는지도 검사했습니다. 추가로 초파리의 잘못된
Nematocera 경로를 제거하고, Platynereis를 Pleistoannelida 아래로 정리했습니다.

## 자료 차이를 그대로 오류로 취급하지 않은 경우

- 동물계 초기 분기(Eumetazoa): 게임의 기존 초기 분기 가설을 유지했습니다.
- Polychaeta: 측계통군인 전통적 다모류를 단일 가지로 강제하지 않습니다.
  Clitellata는 Sedentaria 안에 있는 현재 경로를 유지합니다.
- 2026-10-06 점검에서는 Panarthropoda의 세 문 사이 관계를 구분하지 않았으나,
  2026-10-13에는 아래 연구 근거에 따라 완보동물과 (유조동물 + 절지동물)을
  구분하도록 갱신했습니다. Lophotrochozoa 내부의 미해결 깊은 분기는 유지합니다.
- Tectipleura, Panpulmonata, Cyclostomata, Heteroscleromorpha, Elapinae,
  Camarodonta, Dendrobatinae 등의 명칭/중간 단계 차이는 현재 표본에서
  별도의 잘못된 종 묶음을 만들지 않습니다. 보이지 않는 단일 자식 단계와
  구식·현행 계급 체계의 차이까지 전부 바꾸는 작업은 하지 않았습니다.
- 기존 Ascaridida, Scorpaeniformes 등의 전통적 목 명칭은 유지합니다.
  이번 수정은 공통 분기 누락에 대한 것이며 명명 체계 전체의 전환은 아닙니다.

수정 후 NCBI 표본의 다종 묶음 중 게임에 없는 것은 Eumetazoa와 Polychaeta뿐입니다.
이는 모든 분류가 최종적으로 확정되었다는 보증은 아닙니다. 새 종이나 새로운
연구를 반영할 때는 외부 계통 근거와 표본 묶음을 다시 비교해야 합니다.

## 검증 및 근거

`node scripts/validate-game-logic.mjs`는 독립적으로 검토한 17개 세 종 조합을
각각 6가지 등장 순서로 검사합니다. 가까운 두 종이 별도 가지를 이루는지,
세 종을 공통 조상에 그냥 붙이는 오답이 거부되는지도 검사합니다.
기존 207종 전체 및 무작위 순서 검사, 데이터/한국어 이름 검사도 함께 수행합니다.

## 범절지동물 분기 갱신 — 2026-10-13

채택한 관계는 `(Tardigrada, (Onychophora, Arthropoda))`입니다.
2025년 GBE에 수록된 CAT-PMSF 계통유전체 연구와 2026년 미토게놈 연구가
지지하는 유조동물·절지동물 자매군을 실제 게임 경로에 추가했습니다.
`canonical:antennopoda`는 이 갈래에 대한 게임 내부 ID이며 Wikidata ID가 아닙니다.
계통 경로 생성기가 이를 다시 적용하므로 데이터 재수집 후에도 유지됩니다.
유조동물·개미·완보동물 및 유조동물·투구게·완보동물의 각 6개 출제 순서에서
자매군 관계와 정답 판정을 검증합니다. 세 문을 공통 조상에 그냥 붙이는
기존 판정은 더 이상 허용하지 않습니다.

- [2025년 CAT-PMSF 연구](https://academic.oup.com/gbe/article/17/1/evae273/7931680)
- [2026년 유조동물 미토게놈 연구](https://www.mdpi.com/2073-4425/17/4/372)

사이트의 분류 기준 안내에도 이 관계와 남은 단순화·계급 해석을 반영했습니다.

- [NCBI Taxonomy](https://www.ncbi.nlm.nih.gov/taxonomy)
- [범절지동물 계통 연구](https://pmc.ncbi.nlm.nih.gov/articles/PMC11756273/)
- [대악류 계통 연구](https://pmc.ncbi.nlm.nih.gov/articles/PMC3013382/)
- [완전변태 곤충 계통 연구](https://pmc.ncbi.nlm.nih.gov/articles/PMC4000048/)
- [극피동물 계통 연구](https://pmc.ncbi.nlm.nih.gov/articles/PMC4046411/)
- [편형동물 계통 연구](https://pmc.ncbi.nlm.nih.gov/articles/PMC4446793/)
- [환형동물 계통 및 다모류의 측계통성](https://pmc.ncbi.nlm.nih.gov/articles/PMC5013799/)
- [참굴의 동의어 기록](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=29159)
- [Leucoraja의 이름 기록](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=7782)
