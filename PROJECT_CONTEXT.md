# PIMS WORLD 프로젝트 컨텍스트

## 프로젝트 개요

게임명: PIMS WORLD : 퇴근 없는 테마파크

장르:
- HTML5 기반 2D 픽셀 어드벤처 게임
- Phaser 기반
- ICT기금 사업관리 15개월 사이클을 소재로 한 교육용 게임
- 관료주의 호러 코미디
- 16비트 레트로 픽셀아트, Y2K 놀이공원 분위기

기획 참고 파일:
- 260512_사업관리 게임 스토리 수정본_v4.2.pdf

전체 게임 구조:
- 총 8개 구역
- 1단계: 봉인된 금고
- 2단계: 집행의 집
- 3단계: 중간 관람차
- 4단계: 점검의 관문
- 5단계: 변신의 방
- 6단계: 성과의 제단
- 7단계: 정산의 늪
- 8단계: 반납의 계곡

현재 구현 범위:
- 1단계 [봉인된 금고]만 구현한다.
- 전체 8개 구역은 아직 구현하지 않는다.

---

## 중요한 구현 방향

기획서에는 Maniac Mansion식 동사 버튼 UI가 있지만, 이번 버전에서는 사용하지 않는다.

구현하지 않을 것:
- Walk to
- Pick up
- Look at
- Use
- Open
- Talk to
- Give
- Combine
- Push/Pull
- 동사 버튼 UI

대신 아래 조작 방식을 사용한다.

조작:
- 방향키 또는 WASD로 직접 이동
- 바닥 클릭 시 해당 위치로 자동 이동
- 클릭 이동 중 방향키/WASD 입력이 들어오면 클릭 이동 취소
- Space 키로 가까운 오브젝트 또는 NPC와 상호작용
- 대사창 또는 선택지가 열려 있을 때는 이동 금지
- 대사창은 Space 또는 Enter로 넘기거나 닫기
- 선택지는 1, 2 키 또는 마우스 클릭으로 선택

---

## 게임 설정

해상도:
- 640 x 360

렌더링:
- pixelArt: true
- antialias: false
- 어두운 남보라/검정 계열 배경
- 16비트 레트로 픽셀아트 느낌

스케일:
- Phaser.Scale.FIT
- Phaser.Scale.CENTER_BOTH
- 브라우저 크기에 맞추되 640x360 비율 유지

물리:
- arcade physics 사용
- 복잡한 pathfinding은 아직 구현하지 않음
- 플레이어는 walkable area 밖으로 나가지 못하게 제한

---

## 추천 파일 구조

src/
  main.js

  scenes/
    StartScene.js
    SealedVaultScene.js
    DocumentCheckMiniGameScene.js
    StageClearScene.js

  systems/
    GameState.js
    DialogueManager.js
    InteractionManager.js

  data/
    chapter1Data.js
    dialogueData.js
    miniGameData.js

  objects/
    Player.js
    InteractableObject.js
    DialogBox.js

기존 Phaser 템플릿의 Start/Middle/GameOver 예제 흐름은 제거하거나 사용하지 않는다.

---

## GameState

최소 상태값:

- hp: 100
- currentChapter: 1
- currentMonth: "1~2월"
- hasCheckedInventory: false
- missingNdaCount: 0
- requiredNdaCount: 10
- currentNdaCount: 8
- hasFoundMissingNdas: false
- pimsRegistered: false
- miniGameCleared: false
- sealedVaultOpened: false
- stage1Cleared: false

---

## StartScene

화면 구성:
- 제목: "PIMS WORLD"
- 부제: "퇴근 없는 테마파크"
- 설명: "ICT기금 사업관리 15개월 사이클을 탈출하라"
- 안내: "Click or Tap to Start"

동작:
- 클릭 또는 터치 시 SealedVaultScene으로 이동
- 아직 BGM은 실제 재생하지 않음
- 나중에 assets/audio/bgm.mp3 추가 가능하도록 주석 남김

---

## 1단계 [봉인된 금고] 시나리오

김대리는 PIMS WORLD의 첫 구역인 봉인된 금고 앞에서 정신을 차린다.
네온사인 아래 거대한 금고가 보이고, KCA 간사가 나타나 서류를 제대로 갖췄는지 묻는다.
참여인력은 10명인데 보안서약서는 8장뿐이다.
김대리는 누락된 보안서약서 2장을 찾아 PIMS에 등록해야 한다.

---

## SealedVaultScene 화면 구성

- 임시 도형으로 놀이공원 밤 풍경 + 거대한 금고 분위기
- 플레이어 김대리 임시 도형
- KCA 간사 NPC 임시 도형
- 서류 보관함
- PIMS 단말기
- 거대한 금고 문

상단 UI:
- "1단계: 봉인된 금고"
- "1~2월"
- HP 표시

하단 UI:
- 대사창 또는 안내 문구

오브젝트:
1. KCA 간사
2. 서류 보관함
3. PIMS 단말기
4. 금고 문

---

## Scene 1: 금고 앞에서의 조우

간사 대사:
"신입 담당자님, 사업비를 받고 싶으면 서류부터 제대로 갖춰야죠. 보안서약서 다 챙기셨나요?"

선택지 Q1:
1. "당연하죠! 여기 다 있습니다."
2. "잠시만요... 다시 한번 확인해 보겠습니다."

결과:
- 1번 선택 시:
  - 간사가 서류를 확인한다.
  - "흥, 10명 중에 8장뿐이군요. 당신 뇌는 장식입니까?"
  - hp를 95로 감소
  - hasCheckedInventory = true

- 2번 선택 시:
  - "꼼꼼히 세어보니 정말 2장이 모자랍니다."
  - hp 변화 없음
  - hasCheckedInventory = true
  - 간사 대사: "빨리 보관함에서 찾아오지 않고 뭐 해요!"

선택지가 닫힌 뒤 플레이어 이동 가능.

---

## Scene 2: 서류 검수 / 누락 서약서 찾기

서류 보관함 근처:
- 안내문: "Space: 서류 보관함 조사"

Space:
- "서류 보관함 안에서 누락된 보안서약서 2장을 찾았다."
- missingNdaCount = 2
- currentNdaCount = 10
- hasFoundMissingNdas = true

이미 찾은 경우:
- "이미 보안서약서를 모두 챙겼다."

PIMS 단말기 근처:
- 안내문: "Space: PIMS 단말기 확인"

Space:
- hasFoundMissingNdas가 false:
  "아직 보안서약서가 8장뿐이다. 누락된 2장을 먼저 찾아야 한다."
- hasFoundMissingNdas가 true:
  "보안서약서 10장을 모두 확인했다. 이제 PIMS 입력값을 대조해야 한다."
  이후 DocumentCheckMiniGameScene으로 전환

금고 문 근처:
- 안내문: "Space: 금고 문 확인"

Space:
- miniGameCleared가 false:
  "금고가 봉인되어 있다. PIMS 등록과 서류 검수가 먼저다."
- miniGameCleared가 true:
  StageClearScene으로 이동

---

## DocumentCheckMiniGameScene

미니게임명:
서류 검수 레이스 - 데칼코마니 스캔

컨셉:
- 화면 왼쪽에는 수행계획서
- 화면 오른쪽에는 PIMS 입력창
- 플레이어는 두 화면을 비교해 잘못된 PIMS 값을 고친다.
- 1차 구현은 실제 입력 UI가 아니라 선택지형 퀴즈로 구현한다.

문제 1:
"참여인력 기간이 다릅니다. 수행계획서는 6월 30일까지인데, PIMS에는 12월 31일로 되어 있습니다."
1. "PIMS 날짜를 6월 30일로 수정한다."
2. "나중에 고치기로 하고 넘어간다."
정답: 1

문제 2:
"성과 목표가 다릅니다. 수행계획서는 90점, PIMS는 91점입니다."
1. "키패드로 90을 입력한다."
2. "1점 높은 건 좋은 거니까 그대로 둔다."
정답: 1

문제 3:
"계좌번호에 숫자 하나가 빠져 있습니다."
1. "수행계획서를 보고 빠진 숫자를 보완한다."
2. "일단 저장하고 나중에 확인한다."
정답: 1

정답 처리:
- 정답이면 다음 문제
- 오답이면 hp -= 5
- 간사 독설 대사 출력
- 그래도 다음 문제 진행

3문제 완료:
- pimsRegistered = true
- miniGameCleared = true
- "필수서류 등록 완료. 사업비 교부 준비가 끝났다."
- StageClearScene으로 이동

---

## StageClearScene

Scene 4:
금고의 개방과 새로운 구역으로의 초대

연출:
- 금고 문이 열리는 텍스트 또는 간단한 도형 애니메이션
- "사업비"라고 적힌 골드 코인이 쏟아지는 느낌을 임시 원형 도형으로 표현
- stage1Cleared = true

간사 대사:
"축하해요, 김대리님. 서류의 봉인을 풀고 사업비를 확보하셨군요."
"하지만 좋아하긴 일러요. 이제 진짜 돈을 쓰는 법을 배울 시간입니다."
"저기 보이는 집행의 집으로 가시죠."

마지막 안내:
"1단계 클리어! 다음 업데이트에서 2단계 [집행의 집]이 열립니다."

버튼:
- "처음으로 돌아가기"
- "다시 플레이"

---

## UI / 대사 시스템

DialogBox:
- 하단 검은 반투명 박스
- 화자 이름 표시 가능
- Space 또는 Enter로 다음 대사 진행
- 선택지가 필요한 경우 1, 2 키 또는 마우스 클릭으로 선택 가능

Interaction Prompt:
- 가까운 오브젝트가 있을 때만 표시
- 예: "Space: 서류 보관함 조사"

---

## 그래픽 / 에셋 방향

현재는 실제 이미지 assets를 사용하지 않는다.
Phaser Graphics 또는 Rectangle, Text, Circle로 임시 구현한다.

나중에 교체할 예정인 파일명:
- public/assets/backgrounds/sealed_vault.png
- public/assets/characters/kim_daeri.png
- public/assets/characters/kca_assistant.png
- public/assets/objects/cabinet.png
- public/assets/objects/pims_terminal.png
- public/assets/objects/vault_door.png
- public/assets/audio/bgm.mp3

---

## 아직 구현하지 말 것

- 동사 버튼 UI
- 복잡한 인벤토리 UI
- 2단계 이후 실제 플레이
- 15일 타이머
- 집행률 시스템
- 저장/불러오기
- 모바일 조이스틱
- 실제 BGM 재생
- 복잡한 pathfinding
- 실제 이미지 에셋 로딩 필수화

---

## 성공 기준

npm run dev 실행 시 오류가 없어야 한다.

브라우저에서 다음이 가능해야 한다.

1. PIMS WORLD 시작 화면이 뜬다.
2. 클릭하면 봉인된 금고 장면으로 들어간다.
3. KCA 간사와 첫 대화 및 Q1 선택지가 나온다.
4. 선택에 따라 HP가 유지되거나 감소한다.
5. 캐릭터가 방향키/WASD로 움직인다.
6. 바닥 클릭 시 캐릭터가 이동한다.
7. 클릭 이동 중 키보드를 누르면 클릭 이동이 취소된다.
8. 서류 보관함에서 보안서약서 2장을 찾을 수 있다.
9. PIMS 단말기에서 미니게임으로 진입한다.
10. 3문제 선택지형 서류 검수 미니게임을 진행한다.
11. 오답 시 HP가 감소한다.
12. 미니게임 완료 후 금고가 열린다.
13. 1단계 클리어 화면이 나온다.
14. 동사 버튼은 절대 표시되지 않는다.