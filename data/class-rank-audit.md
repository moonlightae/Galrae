# 상강·강·아강·하강 대조 — 2026-10-14

수록된 **207종 전부**의 NCBI 계통 경로를 새로 조회했습니다. 기존 강 수준 분류군과 NCBI 경로의 강 수준 분류군을 합친 **116개 명칭**을 WoRMS와 대조했습니다. 국내 한글명과 기본 계급은 국립생물자원관의 **2025년 말 기준 62,604종 전체 목록**, 국가생물종목록 II와 국립생태원 자료를 확인했습니다. 종별 NCBI ID, 기관별 계급, 인정 상태, 국내 명칭의 확인 여부, 채택 이유와 링크는 [대조 원자료](class-rank-audit.json)에 있습니다.

이 점검은 현재 게임에 있는 종의 경로를 대상으로 합니다. 세계의 모든 생물·멸종 분류군을 빠짐없이 수록한다는 뜻이 아닙니다. 최신 XLSX는 기본 강만 제공하고 상강·아강·하강 열이 없어, 해당 계급과 한글명은 **2019년 공식 PDF**와 공식 교육 자료로 보완했습니다. 국내 공식 명칭을 직접 확인하지 못한 경우 학명 또는 기존 관용명을 사용하고, 공식 한글명으로 확인되었다고 표시하지 않습니다.

최신 XLSX 전체 62,604행을 읽었으며 수록종 중 59종은 학명이 정확히 일치했습니다. 이는 한국 종목록과 세계 생물로 구성한 게임 종목록의 차이이며, 나머지 종은 NCBI 경로로 점검했습니다. [최신 목록 안내](https://www.nibr.go.kr/cmn/board/SYSTEM_DEFAULT000004/67140bbsDetail.do), [KBR 목록 페이지](https://www.kbr.go.kr/content/view.do?menuKey=799&contentKey=174).

## 채택 기준

- 어류: **조기어강 → 신기어아강 → 진골어하강 / 전골어하강**. Actinopteri는 그 사이의 계급 없는 계통군으로 둡니다.
- 산호: **산호충강 → 육방산호아강**. 은상어류는 **연골어강 → 전두어아강**입니다.
- 육기어류는 사족동물까지 포함하는 게임의 단일 계통 범위 때문에 **육기어상강**으로 둡니다. 전통적인 육기어강과 구별하며 NCBI의 상강을 채택한 예외입니다.
- 파충류는 새도 포함하는 게임 범위에 맞춰 WoRMS의 **상강**을 채택합니다. 그 아래 조강과 강이 중복되지 않습니다. 국내 전통 파충강의 계급을 그대로 적용한 체계와는 다릅니다.
- 기관마다 범위·계급이 다르거나 기존 계급을 확인할 수 없는 중간 분류군은 계통 경로를 유지하면서 계급을 붙이지 않습니다. 분류군 자체를 부정하거나 후손 관계를 제거한 것이 아닙니다.
- 분류 설명은 상강·강·아강·하강 **96개** 모두에 연결합니다. 기존 진화 연구 요약이 없는 항목은 확인한 분류 위치와 출처를 안내합니다.

## 누락 처리

전골어류·육기어류·신기어류 등은 기존 데이터에 있었으나 강만 보존하던 화면에서 생략되었습니다. 네 계급 모두를 계통수와 카드에 표시하도록 수정했습니다. 기존 계급 없는 항목 중 산호충강·불가사리상강군(Asterozoa, 학명 표시)·성게상강군(Echinozoa, 학명 표시)·진이치하강·Lepidosauria·Testudinata는 채택 계급을 명시합니다.

빈모아강(Oligochaeta)과 상어류 하강(Selachii)은 해당 수록종의 경로에 추가합니다. NCBI의 Myophiuroidea는 WoRMS에서 인정되는 Myophiuroida로 이미 수록되어 있고, NCBI의 Hyperoartia는 기존 Petromyzonti(칠성장어강) 항목에 대응합니다. 유조·새예·검미류 및 전통 다모강의 네 보완 항목은 기존 별도 안내를 유지합니다. 전통 다모류를 새 단일 공통 조상으로 만들지는 않습니다.

## 공식 출처

- [KBR 국가생물종목록 XLSX (2025년 말 기준)](https://www.kbr.go.kr/jfile/readDownloadFile.do?fileId=ARTICLE_2241&fileSeq=1): 강 계급과 현재 한글명. 크로마도레아강 등 최신 표기를 반영했습니다.
- [국립생물자원관 국가생물종목록 II (2019)](https://www.nibr.go.kr/aiibook/catImage/21/National%20Species%202.pdf): 상위 계급과 한글명 보완. 원자료에 PDF 쪽 번호를 기록했습니다.
- [국립생태원 돌고기](https://www.nie.re.kr/nie/bbs/BDIDX_r44nuH08940bL4zPQ5asH6/view.do?boardId=2270264): 조기어강 표기. 국립생물자원관의 조기강은 같은 Actinopterygii를 가리킵니다.
- [국립생물자원관 곤충 교육 자료](https://www.nibr.go.kr/aiibook/access/ecatalogt.jsp?Dir=1311&callmode=admin&catimage=&eclang=ko&start=80&um=s): 유시아강·신시류 표기.
- [NCBI 진골어류](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=32443&mode=Info): 하강. 207종은 E-utilities의 taxonomy 레코드로 대조했습니다.
- [NCBI 육기어류](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=8287&mode=Info): 상강, 사족동물을 포함하는 경로.
- [WoRMS](https://www.marinespecies.org/): 정확한 학명으로 API를 조회했습니다. 동명이인·미인정명·대체 표기도 원자료에 남겼으며, 검색되지 않는다는 이유만으로 분류군이 존재하지 않는다고 판단하지 않았습니다.
- [ITIS 전골어류](https://www.itis.gov/servlet/SingleRpt/SingleRpt?search_topic=TSN&search_value=161089): 강으로 취급하는 다른 공식 체계. 게임은 사용자가 선택한 하강 체계를 적용합니다.

## 검증과 사용자 QA

자동 검증: 모든 종의 대조 기록, 경로별 강 중복 없음, 계급 역전 없음, 어류 계급 순서, 96개 안내·대표 사진·이미지 실패 처리, 세 계통수 배치와 게임 판정, 데이터 복사본 일치.

배포 후 사용자가 확인할 항목:

1. 도감 계통수에서 물고기의 안내를 눌러 조기어강 → 신기어아강 → 진골어하강 또는 전골어하강이 보이는지 확인합니다.
2. 산호·은상어·새의 안내에서 산호충강/육방산호아강, 연골어강/전두어아강, 파충류상강/조강을 확인합니다.
3. i 표식의 사진·출처가 열리는지, 한/영 전환 후 계급과 사진이 일치하는지 확인합니다.
4. 위·아래·원형 배치에서 안내가 열리고 확대·이동이 되는지 확인합니다.

## 전체 대조표

아래 표의 국내명 확인은 해당 학명·계급과 직접 대조한 자료에 한합니다. 빈칸은 해당 기관의 이번 조회에서 확인되지 않았다는 뜻이며 부재 판정이 아닙니다.

| 학명 | 이전 → 채택 | 국내 2025 목록 | 국내 2019 PDF | NCBI | WoRMS | 한글명/표시 | 처리 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Acari | 아강 → 아강 |  | subclass / 응애아강 / PDF 52쪽 | subclass | Subclass (accepted) | 응애아강 (국내 확인) | existing |
| Actinopoda | 아강 → 아강 |  |  |  | Subclass (accepted) | Actinopoda (관용명/학명) | existing |
| Actinopteri | 강 → 계급 없음 |  |  | class | Superclass (accepted) | 조기어류 (관용명/학명) | existing |
| Actinopterygii | 상강 → 강 | class / 조기강 | class / 조기강 / PDF 16쪽 | superclass | Gigaclass (accepted) | 조기어강 (국내 확인) | existing |
| Amphibia | 강 → 강 | class / 양서강 |  | class | Class (accepted) | 양서강 (국내 확인) | existing |
| Anthozoa | subphylum → 강 | class / 산호충강 | class / 산호충강 / PDF 27쪽 | class | Subphylum (accepted) | 산호충강 (국내 확인) | existing |
| Appendicularia | 강 → 강 | class / 유형강 |  | class | Class (accepted) | 유형강 (국내 확인) | existing |
| Arachnida | 강 → 강 | class / 거미강 | class / 거미강 / PDF 51쪽 | class | Class (accepted) | 거미강 (국내 확인) | existing |
| Articulata | 아강 → 아강 |  |  | subclass | Subclass (accepted); Class (unaccepted) | Articulata (관용명/학명) | existing |
| Ascidiacea | 강 → 강 | class / 해초강 | class / 해초강 / PDF 25쪽 | class | Class (accepted) | 해초강 (국내 확인) | existing |
| Aspidochirotacea | 아강 → 아강 |  | subclass / 순수아강 / PDF 72쪽 | subclass |  | 순수아강 (국내 확인) | existing |
| Asteroidea | 강 → 강 | class / 불가사리강 | class / 불가사리강 / PDF 71쪽 | class | Class (accepted) | 불가사리강 (국내 확인) | existing |
| Asterozoa | subphylum → 상강 |  |  | superclass | Subphylum (accepted) | Asterozoa (관용명/학명) | existing |
| Autobranchia | 아강 → 계급 없음 |  |  | subclass | Subclass (accepted) | Autobranchia (관용명/학명) | existing |
| Aves | 강 → 강 | class / 조강 | class / 조강 / PDF 21쪽 | class | Class (accepted) | 조강 (국내 확인) | existing |
| Bivalvia | 강 → 강 | class / 이매패강 | class / 이매패강 / PDF 45쪽 | class | Class (accepted) | 이매패강 (국내 확인) | existing |
| Branchiopoda | 강 → 강 | class / 새각강 | class / 새각강 / PDF 56쪽 | class | Class (accepted) | 새각강 (국내 확인) | existing |
| Calcarea | 강 → 강 | class / 석회해면강 | class / 석회해면강 / PDF 25쪽 | class | Class (accepted) | 석회해면강 (국내 확인) | existing |
| Calcaronea | 아강 → 아강 |  |  | subclass | Subclass (accepted) | Calcaronea (관용명/학명) | existing |
| Canalipalpata | 하강 → 하강 |  |  | infraclass | Infraclass (accepted) | Canalipalpata (관용명/학명) | existing |
| Carinacea | 하강 → 하강 |  |  |  | Infraclass (accepted) | Carinacea (관용명/학명) | existing |
| Cephalopoda | 강 → 강 | class / 두족강 | class / 두족강 / PDF 48쪽 | class | Class (accepted) | 두족강 (국내 확인) | existing |
| Cestoda | 강 → 강 | class / 조충강 | class / 조충강 / PDF 30쪽 | class | Class (accepted) | 조충강 (국내 확인) | existing |
| Chilopoda | 강 → 강 | class / 지네강 | class / 지네강 / PDF 66쪽 | class | Class (accepted) | 지네강 (국내 확인) | existing |
| Chondrichthyes | 강 → 강 | class / 연골어강 | class / 연골어강 / PDF 15쪽 | class | Parvphylum (accepted) | 연골어강 (국내 확인) | existing |
| Chromadorea | 강 → 강 | class / 크로마도레아강 |  | class | Class (accepted) | 크로마도레아강 (국내 확인) | existing |
| Clitellata | 강 → 강 | class / 환대강 | class / 환대강 / PDF 49쪽 | class | Class (accepted) | 환대강 (국내 확인) | existing |
| Coelacanthi | 강 → 강 |  |  |  | Class (alternative representation) | 실러캔스강 (관용명/학명) | existing |
| Coleoidea | 아강 → 아강 |  |  | subclass | Subclass (accepted) | Coleoidea (관용명/학명) | existing |
| Crinoidea | 강 → 강 | class / 바다나리강 | class / 바다나리강 / PDF 70쪽 | class | Class (accepted) | 바다나리강 (국내 확인) | existing |
| Cubozoa | 강 → 강 | class / 입방해파리강 | class / 입방해파리강 / PDF 28쪽 | class | Class (accepted) | 입방해파리강 (국내 확인) | existing |
| Cyclostomata | 상강 → 계급 없음 |  |  | clade | Order (unaccepted) | Cyclostomata (관용명/학명) | existing |
| Demospongiae | 강 → 강 | class / 보통해면강 | class / 보통해면강 / PDF 25쪽 | class | Class (accepted) | 보통해면강 (국내 확인) | existing |
| Dipneusti | 강 → 강 |  |  |  | Class (alternative representation) | 폐어강 (관용명/학명) | existing |
| Discomedusae | 아강 → 아강 |  |  |  | Subclass (accepted) | Discomedusae (관용명/학명) | existing |
| Dorylaimia | 아강 → 아강 |  |  | subclass | Subclass (accepted) | Dorylaimia (관용명/학명) | existing |
| Echinoidea | 강 → 강 | class / 성게강 | class / 성게강 / PDF 72쪽 | class | Class (accepted) | 성게강 (국내 확인) | existing |
| Echinozoa | subphylum → 상강 |  |  | superclass | Subphylum (accepted) | Echinozoa (관용명/학명) | existing |
| Elasmobranchii | 아강 → 아강 |  |  | subclass | Class (accepted) | Elasmobranchii (관용명/학명) | existing |
| Elpistostegalia | 하강 → 계급 없음 |  |  |  |  | Elpistostegalia (관용명/학명) | existing |
| Enoplea | 강 → 강 | class / 유침강 | class / 유침강 / PDF 36쪽 | class | Class (accepted) | 유침강 (국내 확인) | existing |
| Enteropneusta | 강 → 강 | class /  |  | class | Class (accepted) | 장새강 (관용명/학명) | existing |
| Errantia | 아강 → 아강 |  | subclass / 유재아강 / PDF 49쪽 | subclass | Subclass (accepted) | 유재아강 (국내 확인) | existing |
| Eucestoda | 아강 → 아강 |  |  | subclass | Subclass (accepted) | Eucestoda (관용명/학명) | existing |
| Euechinoidea | 아강 → 아강 |  | subclass / 진성게아강 / PDF 72쪽 | subclass | Subclass (accepted) | 진성게아강 (국내 확인) | existing |
| Euheterodonta | subterclass → 하강 |  | infraclass / 진이치하강 / PDF 46쪽 | infraclass | Subterclass (accepted) | 진이치하강 (국내 확인) | existing |
| Eumalacostraca | 아강 → 아강 |  | subclass / 진연갑아강 / PDF 60쪽 | subclass | Subclass (accepted) | 진연갑아강 (국내 확인) | existing |
| Eurotatoria | 강 → 강 | class / 진윤충강 | class / 진윤충강 / PDF 32쪽 | class | Class (accepted) | 진윤충강 (국내 확인) | existing |
| Eutardigrada | 강 → 강 | class / 진완보강 | class / 진완보강 / PDF 67쪽 | class | Class (accepted) | 진완보강 (국내 확인) | existing |
| Euthyneura | 하강 → 하강 |  |  | clade | Infraclass (accepted) | Euthyneura (관용명/학명) | existing |
| Gastropoda | 강 → 강 | class / 복족강 | class / 복족강 / PDF 38쪽 | class | Class (accepted) | 복족강 (국내 확인) | existing |
| Heterobranchia | 아강 → 아강 |  | subclass / 이새아강 / PDF 42쪽 | subclass | Subclass (accepted) | 이새아강 (국내 확인) | existing |
| Heteroconchia | 하강 → 하강 |  |  | clade | Infraclass (accepted) | Heteroconchia (관용명/학명) | existing |
| Heteroscleromorpha | 아강 → 아강 |  | subclass / 이규경형해면아강 / PDF 25쪽 | subclass | Subclass (accepted) | 이규경형해면아강 (국내 확인) | existing |
| Hexacorallia | 강 → 아강 |  | subclass / 육방산호아강 / PDF 27쪽 | subclass | Class (accepted) | 육방산호아강 (국내 확인) | existing |
| Hexactinellida | 강 → 강 | class / 육방해면강 | class / 육방해면강 / PDF 27쪽 | class | Class (accepted) | 육방해면강 (국내 확인) | existing |
| Hexasterophora | 아강 → 아강 |  |  | subclass | Subclass (accepted) | Hexasterophora (관용명/학명) | existing |
| Hirudinea | 아강 → 아강 |  |  | subclass | Subclass (accepted) | Hirudinea (관용명/학명) | existing |
| Holocephali | 강 → 아강 |  |  | subclass | Class (accepted) | 전두어아강 (관용명/학명) | existing |
| Holostei | 하강 → 하강 |  |  | infraclass | Class (accepted) | 전골어하강 (관용명/학명) | existing |
| Holothuroidea | 강 → 강 | class / 해삼강 | class / 해삼강 / PDF 72쪽 | class | Class (accepted) | 해삼강 (국내 확인) | existing |
| Hydroidolina | 아강 → 아강 |  |  | subclass | Subclass (accepted) | Hydroidolina (관용명/학명) | existing |
| Hydrozoa | 강 → 강 | class / 히드라충강 | class / 히드라충강 / PDF 28쪽 | class | Class (accepted) | 히드라충강 (국내 확인) | existing |
| Hyperoartia | 없음 → 별도 수록 없음 |  |  | class |  | Hyperoartia (관용명/학명) | alias:Petromyzonti |
| Insecta | 강 → 강 | class / 곤충강 |  | class | Class (accepted) | 곤충강 (국내 확인) | existing |
| Lepidosauria | 상목 → 강 |  |  | class |  | Lepidosauria (관용명/학명) | existing |
| Lepidosauromorpha | 하강 → 계급 없음 |  |  |  |  | Lepidosauromorpha (관용명/학명) | existing |
| Leptocardii | 강 → 강 |  |  | class | Class (accepted) | 두삭강 (관용명/학명) | existing |
| Lissamphibia | 아강 → 계급 없음 |  |  |  |  | Lissamphibia (관용명/학명) | existing |
| Malacostraca | 강 → 강 | class / 연갑강 | class / 연갑강 / PDF 60쪽 | class | Class (accepted) | 연갑강 (국내 확인) | existing |
| Mammalia | 강 → 강 | class / 포유동물강 | class / 포유동물강 / PDF 23쪽 | class | Class (accepted) | 포유동물강 (국내 확인) | existing |
| Merostomata | 강 → 강 | class / 퇴구강 | class / 퇴구강 / PDF 51쪽 | class | Class (accepted) | 퇴구강 (국내 확인) | supplement |
| Metophiurida | 하강 → 하강 |  |  | infraclass | Infraclass (accepted) | Metophiurida (관용명/학명) | existing |
| Monogononta | 아강 → 아강 |  | subclass / 단소아강 / PDF 33쪽 | subclass | Subclass (accepted) | 단소아강 (국내 확인) | existing |
| Multicrustacea | 상강 → 상강 |  |  |  | Superclass (accepted) | Multicrustacea (관용명/학명) | existing |
| Myophiuroida | 아강 → 아강 |  |  |  | Subclass (accepted) | Myophiuroida (관용명/학명) | existing |
| Myophiuroidea | 없음 → 별도 수록 없음 |  |  | subclass | Subclass (unaccepted) | Myophiuroidea (관용명/학명) | alias:Myophiuroida |
| Myxini | 강 → 강 | class / 먹장어강 | class / 먹장어강 / PDF 15쪽 | class | Class (accepted) | 먹장어강 (국내 확인) | existing |
| Nautiloidea | 아강 → 아강 |  |  | subclass | Subclass (accepted); Superfamily (accepted) | Nautiloidea (관용명/학명) | existing |
| Neodermata | 상강 → 상강 |  |  | superclass | Superclass (accepted) | Neodermata (관용명/학명) | existing |
| Neognathae | 하강 → 하강 |  |  | infraclass |  | Neognathae (관용명/학명) | existing |
| Neoptera | 하강 → 하강 |  |  | infraclass | Infraclass (accepted) | 신시류 (하강) (관용명/학명) | existing |
| Neopterygii | 아강 → 아강 |  |  | subclass |  | 신기어아강 (관용명/학명) | existing |
| Neornithes | 아강 → 계급 없음 |  |  |  |  | Neornithes (관용명/학명) | existing |
| Neoselachii | 하강 → 계급 없음 |  |  |  | Subclass (accepted) | Neoselachii (관용명/학명) | existing |
| Nuda | 강 → 강 | class / 무촉수강 |  | class | Class (accepted) | 무촉수강 (국내 확인) | existing |
| Oligochaeta | 없음 → 아강 |  | subclass / 빈모아강 / PDF 49쪽 | subclass | Subclass (accepted) | 빈모아강 (국내 확인) | added |
| Ophiuroidea | 강 → 강 | class / 거미불가사리강 | class / 거미불가사리강 / PDF 71쪽 | class | Class (accepted) | 거미불가사리강 (국내 확인) | existing |
| Palaeognathae | 하강 → 상목 |  |  | superorder |  | Palaeognathae (관용명/학명) | existing |
| Petromyzonti | 강 → 강 |  |  |  | Class (accepted) | 칠성장어강 (관용명/학명) | existing |
| Petromyzontomorphi | 상강 → 계급 없음 |  |  |  |  | Petromyzontomorphi (관용명/학명) | existing |
| Phyllopoda | 아강 → 아강 |  |  | subclass | Subclass (accepted) | Phyllopoda (관용명/학명) | existing |
| Placentalia | 하강 → 계급 없음 |  |  |  |  | Placentalia (관용명/학명) | existing |
| Pleurostigmophora | 아강 → 아강 |  |  | subclass |  | Pleurostigmophora (관용명/학명) | existing |
| Polychaeta | 강 → 강 | class / 다모강 | class / 다모강 / PDF 49쪽 | class | Class (accepted) | 다모강 (국내 확인) | supplement |
| Priapulimorpha | 강 → 강 |  |  | class |  | 프리아풀리모르파강 (관용명/학명) | supplement |
| Pteriomorphia | 하강 → 아강 |  | subclass / 익형아강 / PDF 45쪽 | clade | Infraclass (accepted) | 익형아강 (국내 확인) | existing |
| Pterygota | 아강 → 아강 |  |  | subclass | Infraclass (accepted) | 유시아강 (국내 확인) | existing |
| Reptilia | 강 → 상강 | class / 파충강 | class / 파충강 / PDF 21쪽 |  | Superclass (accepted) | 파충류상강 (관용명/학명) | existing |
| Rhabditia | 아강 → 계급 없음 |  |  |  |  | Rhabditia (관용명/학명) | existing |
| Sarcopterygii | 상강 → 상강 |  |  | superclass | Gigaclass (accepted) | 육기어상강 (관용명/학명) | existing |
| Scyphozoa | 강 → 강 | class / 해파리강 | class / 해파리강 / PDF 29쪽 | class | Class (accepted) | 해파리강 (국내 확인) | existing |
| Sedentaria | 아강 → 계급 없음 |  | subclass / 정재아강 / PDF 50쪽 | subclass | Subclass (accepted) | 정재류 (관용명/학명) | existing |
| Selachii | 없음 → 하강 |  |  | infraclass | Infraclass (accepted) | Selachii (관용명/학명) | added |
| Teleostei | 강 → 하강 |  |  | infraclass | Class (accepted) | 진골어하강 (관용명/학명) | existing |
| Tentaculata | 강 → 강 | class / 유촉수강 | class / 유촉수강 / PDF 30쪽 | class | Class (accepted) | 유촉수강 (국내 확인) | existing |
| Testudinata | 없음 → 아강 |  |  | subclass |  | Testudinata (관용명/학명) | existing |
| Tetractinomorpha | 아강 → 계급 없음 |  |  |  | Subclass (unaccepted) | Tetractinomorpha (관용명/학명) | existing |
| Tetrapoda | 상강 → 계급 없음 |  |  | clade | Megaclass (accepted) | 사족동물 (관용명/학명) | existing |
| Tetrapodomorpha | 아강 → 계급 없음 |  |  |  |  | Tetrapodomorpha (관용명/학명) | existing |
| Theria | supercohort → 아강 |  |  | clade | Subclass (accepted) | Theria (관용명/학명) | existing |
| Theriiformes | 아강 → 계급 없음 |  |  |  |  | Theriiformes (관용명/학명) | existing |
| Udeonychophora | 강 → 강 |  |  | class |  | 우데오니코포라강 (관용명/학명) | supplement |
| Uniplacotomia | 강 → 강 |  |  | class | Class (accepted) | 우니플라코토미아강 (관용명/학명) | existing |
| Vetigastropoda | 아강 → 아강 |  | subclass / 고복족아강 / PDF 38쪽 | subclass | Subclass (accepted) | 고복족아강 (국내 확인) | existing |
| Yinotheria | 아강 → 계급 없음 |  |  |  |  | Yinotheria (관용명/학명) | existing |
