import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

export const chapter2Data = {
    title: '2단계: 집행의 집',
    subtitle: '영수증 폭풍',
    timerDays: 15,
    timerTickMs: 5000,
    walkableArea: { x: 56, y: 150, width: GAME_WIDTH - 112, height: GAME_HEIGHT - 236 },
    playerStart: { x: 450, y: 480 },
    assistant: { x: 680, y: 460, width: 98, height: 135 },
    receiptPile: { x: 185, y: 442, width: 300, height: 150 },
    pims: { x: 1130, y: 442, width: 126, height: 150 },
    decorativeBaskets: [
        { id: 'operating', label: '운영비', x: 610, y: 428, width: 92, height: 46, color: 0x39e6c0 },
        { id: 'promotion', label: '사업추진비', x: 718, y: 428, width: 92, height: 46, color: 0xffc86e },
        { id: 'travel', label: '여비', x: 826, y: 428, width: 92, height: 46, color: 0x6f94ff },
        { id: 'asset', label: '자산취득비', x: 934, y: 428, width: 92, height: 46, color: 0xffd36e },
        { id: 'reject', label: '반려', x: 1042, y: 428, width: 92, height: 46, color: 0xff6b7d }
    ],
    introLines: [
        { speaker: 'KCA 간사', text: '김대리님, 여기는 집행의 집입니다.' },
        { speaker: 'KCA 간사', text: '영수증 더미에서 사업비 집행 영수증을 찾아 비세목을 분류하고,\n필요한 증빙까지 함께 정리해주세요.' },
        { speaker: 'KCA 간사', text: '운영비, 사업추진비, 자산취득비, 여비, 반려로 구분하세요. \n힌트를 드리자면, 취득자산은 꼭 PIMS에 등록하셔야 합니다.' }
    ],
    assistantHint: 'Space: KCA 간사와 대화',
    receiptPilePrompt: 'Space: 영수증 더미 확인',
    receiptStartLabel: '영수증 처리 시작',
    receiptStartHint: '영수증 더미를 확인한 뒤 분류를 시작하세요.',
    pimsHint: 'Space: PIMS 단말기 사용',
    pimsStartLabel: 'PIMS 등록하기',
    pimsStartHint: '분류한 영수증을 PIMS에 등록하세요.',
    bonusWaveLines: [
        { speaker: 'KCA 간사', text: '아차! 대리님, 여기 영수증이 더 있네요!' },
        { speaker: 'KCA 간사', text: '이것까지 한번 분류해보시죠!' }
    ],
    registrationPromptLines: [
        { speaker: 'KCA 간사', text: '분류는 끝났습니다. 이제 PIMS 단말기로 이동해 등록하세요.' }
    ],
    registrationCompleteLines: [
        { speaker: 'KCA 간사', text: '집행등록이 끝났습니다. 이제 다음 단계로 넘어가시죠.' }
    ],
    assetReminder: '자산취득비는 PIMS 자산등록이 먼저입니다.',
    assetRegistered: '자산 등록 완료! 이제 집행 등록을 진행하세요.',
    successLines: [
        { speaker: 'KCA 간사', text: '좋습니다. 분류와 PIMS 등록까지 모두 마쳤네요.' },
        { speaker: 'KCA 간사', text: '이제 2단계 집행 처리가 완료되었습니다. 다음 단계로 가시죠.' }
    ],
    incompleteLines: [
        { speaker: 'KCA 간사', text: '아직 PIMS 등록이 끝나지 않았습니다. 등록 대기 목록을 다시 확인하세요.' }
    ],
    rejectLines: [
        { speaker: 'KCA 간사', text: '반려 처리된 영수증은 PIMS 등록 대상이 아닙니다.' }
    ],
    failMessage: '집행 처리 기한이 지났습니다.',
    receiptPool: [
        {
            id: 'r1',
            title: '사무용품 구매 영수증',
            itemName: '파일철, 볼펜, 라벨지',
            purpose: '사업 운영에 필요한 사무용품 구입',
            expenseDate: '5월 3일',
            useTime: '14:10',
            amount: '38,000원',
            note: '소모성 사무용품은 자산취득비가 아닙니다.',
            correctCategory: '운영비',
            evidence: [],
            requiredExtraActions: []
        },
        {
            id: 'r2',
            title: '외부 회의 다과 영수증',
            itemName: '회의용 음료 및 다과',
            purpose: '외부 전문가 회의 진행',
            expenseDate: '5월 8일',
            useTime: '15:30',
            amount: '82,000원',
            note: '회의비는 회의록이 필요합니다.',
            correctCategory: '사업추진비',
            evidence: ['minutes'],
            requiredExtraActions: ['minutes']
        },
        {
            id: 'r3',
            title: '시외 교통비 영수증',
            itemName: 'KTX 승차권',
            purpose: '사업 회의 참석을 위한 시외 이동',
            expenseDate: '5월 10일',
            useTime: '09:20',
            amount: '59,800원',
            note: '출장 이동에 따른 여비입니다.',
            correctCategory: '여비',
            evidence: [],
            requiredExtraActions: []
        },
        {
            id: 'r4',
            title: '태블릿 PC 구매 영수증',
            itemName: '태블릿 PC',
            purpose: '사업 운영용 장비 구입',
            expenseDate: '5월 12일',
            useTime: '11:40',
            amount: '690,000원',
            note: '자산취득비는 PIMS 자산등록이 필요합니다.',
            correctCategory: '자산취득비',
            evidence: [],
            asset: true,
            requiredExtraActions: ['asset']
        },
        {
            id: 'r5',
            title: '개인 카페 결제 영수증',
            itemName: '주말 카페 음료',
            purpose: '개인 식음료 구입',
            expenseDate: '5월 14일',
            useTime: '16:00',
            amount: '12,000원',
            note: '사업 목적과 관련 없는 개인성 지출입니다.',
            correctCategory: '반려',
            invalid: true,
            requiredExtraActions: []
        },
        {
            id: 'r6',
            title: '회의 식대 영수증',
            itemName: '회의 식대',
            purpose: '사업 추진 관련 내부·외부 회의 진행',
            expenseDate: '5월 15일',
            useTime: '18:40',
            amount: '320,000원',
            note: '회의비는 회의록을 첨부해야 합니다.',
            correctCategory: '사업추진비',
            evidence: ['minutes'],
            requiredExtraActions: ['minutes']
        },
        {
            id: 'r7',
            title: '자문회의 식대',
            itemName: '외부위원 자문회의 식대',
            purpose: '외부위원 자문회의 진행',
            expenseDate: '5월 16일',
            useTime: '18:20',
            amount: '520,000원',
            note: '50만원 이상 회의비는 참여명단과 서명 증빙도 필요합니다.',
            correctCategory: '사업추진비',
            evidence: ['minutes', 'participants', 'signature'],
            requiredExtraActions: ['minutes', 'participants', 'signature']
        },
        {
            id: 'r8',
            title: '노트북 구매 영수증',
            itemName: '노트북 1대',
            purpose: '사업 운영용 장비 구입',
            expenseDate: '5월 17일',
            useTime: '13:00',
            amount: '1,300,000원',
            note: '장비류는 자산취득비로 구분해야 합니다.',
            correctCategory: '자산취득비',
            evidence: [],
            asset: true,
            requiredExtraActions: ['asset']
        },
        {
            id: 'r9',
            title: '사업 회의비 영수증',
            itemName: '회의 식대',
            purpose: '사업 추진 회의 진행',
            expenseDate: '5월 18일',
            useTime: '23:40',
            amount: '180,000원',
            note: '심야시간 집행은 불인정 대상입니다.',
            correctCategory: '반려',
            invalid: true,
            requiredExtraActions: []
        },
        {
            id: 'r10',
            title: '자문위원 수당 지급 건',
            itemName: '자문위원 수당',
            purpose: '외부 자문위원 자문 수당 지급',
            expenseDate: '5월 19일',
            useTime: '14:00',
            amount: '300,000원',
            note: '회의비가 아닌 일반수용비입니다.',
            correctCategory: '운영비',
            evidence: [],
            requiredExtraActions: []
        }
    ]
};
