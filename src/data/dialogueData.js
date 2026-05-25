export const dialogueData = {
    intro: {
        speaker: 'KCA 간사',
        text: '신입 담당자님, 사업비를 받으려면 서류부터 제대로 갖춰야 합니다. 보안서약서는 다 챙기셨나요?',
        choices: [
            {
                label: '당연하죠! 여기 다 있습니다.',
                result: 'confident'
            },
            {
                label: '잠시만요... 다시 한 번 확인해 보겠습니다.',
                result: 'careful'
            }
        ]
    },
    confidentResult: [
        { speaker: 'KCA 간사', text: '음, 10명 중에 8명분만 확인됐군요. 자신감도 좋지만 수량 확인이 먼저입니다.' }
    ],
    carefulResult: [
        { speaker: '김대리', text: '다시 세어 보니 누락된 2장이 있네요.' },
        { speaker: 'KCA 간사', text: '좋습니다. 서류 보관함에 숨어 있을 가능성이 높습니다. 먼저 찾아보세요.' }
    ],
    assistantDefault: [
        { speaker: 'KCA 간사', text: '보안서약서 10장 확인, PIMS 등록, 금고 확인. 순서대로 처리하세요.' }
    ],
    cabinetFound: [
        { speaker: '김대리', text: '서류 보관함 안에서 누락된 보안서약서 2장을 찾았다.' }
    ],
    cabinetAlreadyFound: [
        { speaker: '김대리', text: '이미 보안서약서를 모두 챙겼다.' }
    ],
    terminalLocked: [
        { speaker: 'KCA 간사', text: '아직 보안서약서가 8장뿐입니다. 누락된 2장을 먼저 찾아야 합니다.' }
    ],
    terminalReady: [
        { speaker: 'KCA 간사', text: '보안서약서 10장을 모두 확인했습니다. 이제 PIMS 입력값을 대조할 차례입니다.' }
    ],
    vaultLocked: [
        { speaker: 'KCA 간사', text: '금고가 봉인되어 있습니다. PIMS 등록과 서류 검수가 먼저입니다.' }
    ],
    stageClear: [
        { speaker: 'KCA 간사', text: '축하해요, 김대리님. 서류의 봉인을 풀고 사업비를 확보하셨군요.' },
        { speaker: 'KCA 간사', text: '하지만 좋아하긴 일러요. 이제 진짜 돈을 쓰는 법을 배울 시간입니다.' },
        { speaker: 'KCA 간사', text: '저기 보이는 집행의 집으로 가시죠.' }
    ]
};
