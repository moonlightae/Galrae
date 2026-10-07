# 강·목 정보 재검토 — 2026-10-07

207종을 GBIF의 정확한 종 일치 결과(신뢰도 95 이상)와 NCBI의 최신
Taxonomy LineageEx로 다시 조회했습니다. GBIF의 계급 차이 48건은 서로 다른
분류 체계의 차이를 포함하므로 기존 계통 경로에 일괄 덮어쓰지 않았습니다.
검토한 종별 NCBI ID, GBIF usageKey와 보완 내역은
`taxonomy-rank-review.json`에 보관하고 동물 데이터의 `taxonomy.rankReview`에 반영합니다.

## 보완한 8개 계급 정보

| 종 | 보완한 강 | 보완한 목 | 근거 |
| --- | --- | --- | --- |
| Limulus polyphemus | Merostomata | 기존 Xiphosura 유지 | [NCBI](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=6850) |
| Tachypleus tridentatus | Merostomata | 기존 Xiphosura 유지 | [NCBI](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=6853) |
| Euperipatoides kanangrensis | Udeonychophora | Euonychophora | [NCBI](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=488523) |
| Platynereis dumerilii | Polychaeta | 기존 Phyllodocida 유지 | [NCBI](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=6359) |
| Riftia pachyptila | Polychaeta | 기존 Sabellida 유지 | [NCBI](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=6426) |
| Priapulus caudatus | Priapulimorpha | 기존 Priapulomorpha 유지 | [NCBI](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=37621) |
| Hirudo medicinalis | 기존 Clitellata 유지 | Hirudinida | [NCBI](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=6421) |

보완 계급은 카드의 분류군 표시와 난이도 출제에 사용합니다. 특히 Polychaeta는
전통적 계급이며 측계통군이므로, 이를 새 공통 조상 노드로 삽입하여 기존
계통 관계를 바꾸지 않습니다. 계급 목록과 진화적 분기 구조를 구분합니다.

## 등록부에서도 강·목이 지정되지 않은 사례

| 종 | 미지정 계급 | 추가 확인 |
| --- | --- | --- |
| Dugesia japonica | 강 | [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=484630): Rhabditophora는 아문 |
| Schmidtea mediterranea | 강 | [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=482204): Rhabditophora는 아문 |
| Symsagittifera roscoffensis | 강 | [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=484585): Acoelomorpha는 아문, Acoela는 목 |
| Xenoturbella bocki | 강·목 | [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=141971): Xenoturbellida는 infraphylum, 이후 과로 이어짐 |
| Lymnaea stagnalis | 목 | [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=181582): Hygrophila는 상목 |
| Balanoglossus gigas | 목 | [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=266573): Enteropneusta incertae sedis는 소속 미확정 표기 |

아문·상목이나 소속 미확정 표기를 강·목으로 임의 승격하지 않습니다.
해당 계급이 실제 미지정인 종은 그 계급을 기준으로 하는 난이도에서는
출제하지 않으며, 어려움과 연습 모드에서는 전체 207종을 그대로 사용합니다.

쉬움은 인간을 포함하여 같은 강을 공유하는 두 종이 나오지 않게 하고,
보통은 같은 목을 공유하는 두 종이 나오지 않게 합니다. 경로에 같은 계급이
둘 이상 기록되어 있으면 모두 비교합니다. 대표 종은 매 판 무작위로 고릅니다.
