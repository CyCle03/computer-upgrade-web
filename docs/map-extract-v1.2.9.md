# [SCA] 컴퓨터 강화하기 V1.2.9 — 맵 문자열 추출본

> **이 문서에 들어 있는 내용은 `[SCA]컴퓨터강화하기 V1.2.9.scx`의 `staredit\scenario.chk`를 압축 해제한 뒤, CP949로 읽을 수 있는 문자열만 정리한 것입니다.**
> 패치노트·스프레드시트·웹 구현·추정 수치는 **포함하지 않습니다.**

## 추출 방법

| 항목 | 값 |
|------|-----|
| 원본 파일 | `[SCA]컴퓨터강화하기 V1.2.9.scx` |
| 대상 | `staredit\scenario.chk` (MPQ PKWARE 0x08 섹터) |
| 압축 해제 크기 | 56,821,328 bytes |
| 인코딩 | CP949 (`errors=replace`) |
| 생성 | 2026-06-08 · `scripts/build_map_extract_doc.py` |

## 한계 (맵 문자열에 없는 것)

- EUD/트리거에만 있는 구매 가격·확률·보상 공식
- `채굴증폭기` **SCA 구매가** 문구 (정적 텍스트 미발견)
- `사냥터 수입 +1%`, `게임 배속 +1프레임` 등 SCA 영구 상점 항목명 (정적 텍스트 미발견)
- 블리자드 기본 유닛/업그레이드 영문 문자열(맵 에셋 잔존)

---

## 1. 맵 식별 문자열

- `staredit/wav/Lukrembo - Rose.ogg`
- `Ver1.2.9`
- `staredit\wav\Lukrembo - Rose.ogg`
- `SCA 컴퓨터 강화하기 V1.2.9`
- `Lukrembo - Rose`

## 2. SCA · 센터 UI

- `00 5. SCA 도움말`
- `SCA 물품 목록 ####################`
- `SCA 센터`
- `SCA 컴퓨터 강화하기 V1.2.9`

### 2.1 `SCA 물품 목록` 구간 (원문)

```text
SCA 물품 목록 #################### 외형 커스텀 센터 무기 커스텀 센터 오버클럭 연구소 1레벨 오버클럭 연구소 2레벨 오버클럭 연구소 3레벨 오버클럭 연구소 4레벨 DDR4 오버클럭 파츠 DDR5 오버클럭 파츠 오버클럭 센터 오버클럭 명령 목록 #################### Protoss Robotics Support Bay Protoss Shield Battery Khaydarin Crystal Formation Protoss Temple Xel'Naga Temple 1원 단위 1만원 단위 1코인 단위 Cave Cave-in Cantina Mining Platform Independent Command Center Independent Starport Jump Gate Ruins Kyadarin Crystal Formation Vespene Geyser Warp Gate Psi Disrupter Zerg Marker Terran Marker Protoss Marker
```

## 3. SCA 상점 `SP :` 표기 (맵에 박힌 가격 문구)

환생 미네랄 구매 티어로 보이는 표기만 추출되었습니다.

- `20코인 | SP : 800`
- `200코인 | SP : 5000`
- `2000코인 | SP : 12000`
- `5000코인 | SP : 25000`
- `40000코인 | SP : 40000`
- `20코인 | SP : 500`
- `500코인 | SP : 8000`
- `7500코인 | SP : 30000`

## 4. 파티 · 채굴 관련

### 4.1 섹션 제목
- `00 6. 파티사냥터`
- `P1 채굴증폭기 무기 정보 ####################`
- `P1 파티보스 채굴봇 ####################`
- `P2 채굴증폭기 무기 정보 ####################`
- `P2 파티보스 채굴봇 ####################`
- `P3 채굴증폭기 무기 정보 ####################`
- `P3 파티보스 채굴봇 ####################`
- `P4 채굴증폭기 무기 정보 ####################`
- `P4 파티보스 채굴봇 ####################`
- `P5 채굴증폭기 무기 정보 ####################`
- `P5 파티보스 채굴봇 ####################`
- `P6 채굴증폭기 무기 정보 ####################`
- `P6 파티보스 채굴봇 ####################`
- `채굴 난이도`
- `파티 사냥터 제어`
- `파티보스 이름##################################################`
- `파티사냥터 참가(Q)`
- `파티사냥터 퇴장(W)`

### 4.2 `채굴 난이도` 블록 (원문 발췌)

```text
채굴 난이도 냉각방식 : 공랭
 쿨링성능 : 500
 제공 방어력 : 1

 강화 확률 : 30% 냉각방식 : 공랭
 쿨링성능 : 650
 제공 방어력 : 5

 강화 확률 : 25% 냉각방식 : 공랭
 쿨링성능 : 800
 제공 방어력 : 15

 강화 확률 : 20% 냉각방식 : 공랭
 쿨링성능 : 950
 제공 방어력 : 30

 강화 확률 : 20% 냉각방식 : 공랭
 쿨링성능 : 1100
 제공 방어력 : 50 플라즈마 쉴드 냉각방식 : 수랭
 쿨링성능 : 1200
 제공 방어력 : 100

 강화 확률 : 15% 냉각방식 : 수랭
 쿨링성능 : 1400
 제공 방어력 : 150

 강화 확률 : 15% 냉각방식 : 수랭
 쿨링성능 : 1600
 제공 방어력 : 255

 강화 확률 : 10% 냉각방식 : 수랭
 쿨링성능 : 1800
 제공 방어력 : 255+150

 강화 확률 : 5% 냉각방식 : 수랭
 쿨링성능 : 2000
 제공 방어력 : 255+255 성능수치 : 5
 제공 고정쉴드 : 0 성능수치 : 20
 제공 고정쉴드 : 5 성능수치 : 50
 제공 고정쉴드 : 30 성능수치 : 150
 제공 고정쉴드 : 100 성능수치 : 300
 제공 고정쉴드 : 300 성능수치 : 600
 제공 고정쉴드 : 1000 성능수치 : 1200
 제공 고정쉴드 : 2000 성능수치 : 2500
 제공 고정쉴드 : 3500 성능수치 : 3500
 제공 고정쉴드 : 5000 성능수치 : 5000
 제공 고정쉴드 : 8000 성능수치 : 300
 제공 고정쉴드 : 300 성능수치 : 1200
 제공 고정쉴드 : 2000 성능수치 : 2500
 제공 고정쉴드 : 3500 성능수치 : 5000
 제공 고정쉴드 : 8000 다운로드 속도 : x1

 강화 확률 : 20% 다운로드 속도 : x1

 강화 확률 : 15% 다운로드 속도 : x1

 강화 확률 : 10% 다운로드 속도 : x1 다운로드 속도 : x4

 강화 확률 : 15% 다운로드 속도 : x4

 강화 확률 : 10% 다운로드 속도 : x4

 강화 확률 : 5% 다운로드 속도 : x4 공격력 : 8400
 성능수치 : 7500

 강화 확률 : 5% Khaydarin Core a Upgrade Infantry A rmor p Upgrade Vehicle P lating h Upgrade S h ip Plating c Evolve C arapace c Evolve Flyer C arapace a Upgrade Ground A rmor a Upgrade Air A rmor w Upgrade Infantry W eapons w Upgrade Vehicle W eapons s Upgrade S hip Weapons m Upgrade M elee Attacks a Upgrade Missile A ttacks a Upgrade Flyer A ttacks w Upgrade Ground W eapons w Upgrade Air W eapons s Upgrade Plasma S hields u Research U -238 Shells
(Increase Marine attack range) i Research I on Thrusters
(Faster Vulture movement) b Research B urst Lasers
(Wraith Weapon) t Research T itan Reactor
(+50 Science Vessel energy) o Research O cular Implants
(Increase Ghost sight range) m Research M oebius Reactor
(+50 Ghost energy) a Research A pollo Reactor
(+50 Wraith energy) c Research C olossus Reactor
(+50 Battlecruiser energy) v Evolve V entral Sacs
(Transporting for Overlord) a Evolve A ntennae
(Increase Overlord sight range) p Evolve P neumatized Carapace
(Faster Overlord movement) m Evolve M etabolic Boost
(Faster Zergling movement) a Evolve A drenal Glands
(Faster Zergling Attack) m Evolve M uscular Augments
(Faster Hydralisk movement) g Evolve G rooved Spines
(Increase Hydralisk attack range) g Evolve G amete Meiosis
(+50 Queen energy) m Evolve M etasynaptic Node
(+50 Defiler energy) s Develop S ingularity Charge
(Increase Dragoon attack range) l Develop L eg Enhancements
(Faster Zealot movement) s Upgrade S carab Damage c Increase Reaver C apacity
(+5 Max Scarabs) g Develop G ravitic Drive
(Faster Shuttle movement) s Develop S ensor Array
(Increase Observer sight range) g Develop G ravitic Booster
(Faster Observer movement) k Deve
```

## 5. 환생 · 환생수치

- `00 [환생하기]`
- `조건 : 환생 수치 1000만 이상`
- `조건 : 환생 수치 3000만 이상`
- `조건 : 환생 수치 5000만 이상`
- `조건 : 환생 수치 7000만 이상`
- `클릭하면 플레이어들의 환생 수치를 확인할 수 있습니다.`
- `클릭하면 환생 도움말을 볼 수 있습니다.`
- `환생 수치 확인 [Z]`
- `환생수치##################################################`

## 6. 자동강화 키 안내

- `자동강화 1강 내리기(A)`
- `자동강화 1강 내리기(D)`
- `자동강화 1강 내리기(S)`
- `자동강화 1강 올리기(E)`
- `자동강화 1강 올리기(Q)`
- `자동강화 1강 올리기(W)`
- `자동강화 성공시 유닛 따로빼기 (D)`
- `자동강화 수치 ON/OFF [Ins]`
- `자동강화 켜기/끄기(Z)`
- `현재 자동강화 설정의 최고강 유닛이 나올 경우, 아래 위치에 따로 생성하는 설정을 켜거나 끕니다.`

## 7. 오버클럭 · 튜닝램

- `00 6. 오버클럭 가이드`
- `DDR4 오버클럭 파츠`
- `DDR4 오버클럭 파츠 1개 획득`
- `DDR5 오버클럭 파츠`
- `DDR5 오버클럭 파츠 1개 획득`
- `OVERCLOCK`
- `OVERCLOCK ON`
- `[오버클럭]`
- `[튜닝램]`
- `오버클럭 명령 목록 ####################`
- `오버클럭 사냥터 참가(Q)`
- `오버클럭 사냥터 퇴장(W)`
- `오버클럭 센터`
- `오버클럭 연구소 1레벨`
- `오버클럭 연구소 2레벨`
- `오버클럭 연구소 3레벨`
- `오버클럭 연구소 4레벨`
- `오버클럭 연구소 레벨 내리기(A)`
- `오버클럭 연구소 레벨 올리기(S)`
- `오버클럭 파츠 자동 사용 ON/OFF (Z)`
- `오버클럭 파츠 획득 텍스트 ON/OFF (E)`

## 8. 다운로드 · 게임 해금

- `00 2. 작업 과 게이밍`
- `다운로드 속도 : x1`
- `다운로드 속도 : x4`
- `스타크래프트 8K 게이밍`
- `작업 / 게이밍 선택`

## 9. 파티 사냥 수입 표기 (원·코인)

- `00 6. 파티사냥터`
- `100원`
- `2,500원`
- `250,000원`
- `3,500원`
- `30,000원`
- `300원`
- `50,000원`
- `750,000원`
- `파티사냥터 참가(Q)`
- `파티사냥터 퇴장(W)`

## 10. 도움말 목차 (`00 N.` 패턴)


## 11. 저장 · BGM

- `00 [BGM 정보]`
- `BGM OFF`
- `BGM ON`
- `BGM ON/OFF (E)`
- `BGM을 켜거나 끕니다.`
- `Lukrembo - Rose`
- `staredit/wav/Lukrembo - Rose.ogg`
- `staredit\wav\Lukrembo - Rose.ogg`
- `※방을 나가면 남은 시간은 저장되지 않습니다.`
- `수동 저장 [F12]`

## 12. `####` 구간 — 게임 관련 발췌

### 외형 커스텀 센터 무기 커스텀 센터 오버클럭 연구소 1레벨 오버클럭 연구소 2레벨 오버클럭 연구소 3레벨 오버클럭 연구소 4레벨 DDR4 ...

```text
외형 커스텀 센터 무기 커스텀 센터 오버클럭 연구소 1레벨 오버클럭 연구소 2레벨 오버클럭 연구소 3레벨 오버클럭 연구소 4레벨 DDR4 오버클럭 파츠 DDR5 오버클럭 파츠 오버클럭 센터 오버클럭 명령 목록
```

### P2 파티보스 채굴봇

```text
P2 파티보스 채굴봇
```

### P3 파티보스 채굴봇

```text
P3 파티보스 채굴봇
```

### P4 파티보스 채굴봇

```text
P4 파티보스 채굴봇
```

### P5 파티보스 채굴봇

```text
P5 파티보스 채굴봇
```

### P6 파티보스 채굴봇

```text
P6 파티보스 채굴봇
```

### ########## P2 Weapon

```text
########## P2 Weapon
```

### ########## P3 Weapon

```text
########## P3 Weapon
```

### ########## P4 Weapon

```text
########## P4 Weapon
```

### ########## P5 Weapon

```text
########## P5 Weapon
```

### ########## P6 Weapon

```text
########## P6 Weapon
```

### P2 채굴증폭기 무기 정보

```text
P2 채굴증폭기 무기 정보
```

### P3 채굴증폭기 무기 정보

```text
P3 채굴증폭기 무기 정보
```

### P4 채굴증폭기 무기 정보

```text
P4 채굴증폭기 무기 정보
```

### P5 채굴증폭기 무기 정보

```text
P5 채굴증폭기 무기 정보
```

### P6 채굴증폭기 무기 정보

```text
P6 채굴증폭기 무기 정보
```

### Brood Wars Zerg 10 - Town A Brood Wars Zerg 10 - Town B Brood Wars Zerg 10 - ...

```text
Brood Wars Zerg 10 - Town A Brood Wars Zerg 10 - Town B Brood Wars Zerg 10 - Town C Brood Wars Zerg 10 - Town D ─ 정 보 노 예 ─ 환생수치
```

## 13. 부품 스탯 문구 샘플 (맵 가이드 텍스트)

아래는 `가용 코어`·`성능수치`·`강화 확률` 등이 포함된 줄만 발췌한 것입니다.

- `가용 코어 : 1`
- `성능수치 : 1`
- `강화 확률 : 40%`
- `성능수치 : 5`
- `성능수치 : 25`
- `강화 확률 : 30%`
- `가용 코어 : 2`
- `성능수치 : 60`
- `강화 확률 : 25%`
- `성능수치 : 75`
- `가용 코어 : 4`
- `성능수치 : 150`
- `강화 확률 : 20%`
- `가용 코어 : 6`
- `성능수치 : 300`
- `강화 확률 : 15%`
- `가용 코어 : 8`
- `성능수치 : 750`
- `가용 코어 : 10`
- `성능수치 : 1500`
- `강화 확률 : 10%`
- `가용 코어 : 12`
- `성능수치 : 3000`
- `강화 확률 : 5%`
- `성능수치 : 5000`
- `가용 코어 : 14`
- `성능수치 : 12000`
- `가용 코어 : 16`
- `성능수치 : 18000`
- `성능수치 : 25000`
- `성능수치 : 700`
- `성능수치 : 1250`
- `성능수치 : 2500`
- `성능수치 : 4000`
- `성능수치 : 10000`
- `공격 딜레이 : 48`
- `성능수치 : 10`
- `공격 딜레이 : 44`
- `성능수치 : 50`
- `공격 딜레이 : 36`
- `성능수치 : 200`
- `공격 딜레이 : 32`
- `공격 딜레이 : 28`
- `성능수치 : 500`
- `공격 딜레이 : 24`
- `성능수치 : 800`
- `공격 딜레이 : 20`
- `공격 딜레이 : 16`
- `성능수치 : 2200`
- `공격 딜레이 : 12`
- `공격 딜레이 : 10`
- `공격 딜레이 : 8`
- `공격력 : 2`
- `성능수치 : 20`
- `공격력 : 7`
- `성능수치 : 40`
- `공격력 : 16`
- `성능수치 : 100`
- `공격력 : 26`
- `성능수치 : 240`
- … 외 59줄

---

## 재생성

```bash
python scripts/build_map_extract_doc.py
```
