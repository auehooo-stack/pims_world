import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameDimensions.js';

export const chapter3Data = {
    title: '3단계: 중간 관람차',
    subtitle: '중간보고서 작성하기',
    timerDays: 15,
    timerTickMs: 5000,
    walkableArea: { x: 48, y: 146, width: GAME_WIDTH - 96, height: 398 },
    playerStart: { x: 176, y: 476 },
    assistant: { x: 260, y: 428, width: 92, height: 118 },
    reportTent: { x: 560, y: 436, width: 160, height: 180 },
    submitBin: { x: 1064, y: 420, width: 180, height: 232 },
    briefingLines: [
        { speaker: 'KCA 간사', text: '김대리님, 중간보고서는 상반기 성과실적과 상반기 집행실적을 함께 봐야 합니다.' },
        { speaker: 'KCA 간사', text: '여기에 제출 공문까지 포함해서 보고서를 만든 뒤, PIMS에 기한 내로 제출해야 합니다.' },
        { speaker: 'KCA 간사', text: '작성만 해두고 끝내면 안 됩니다. 7월 31일 전에 반드시 전송까지 마치세요.' }
    ],
    assistantReminderLines: [
        { speaker: 'KCA 간사', text: '중간보고서에는 상반기 성과실적, 상반기 집행실적, 제출 공문이 필요합니다.' },
        { speaker: 'KCA 간사', text: '보고서 작성천막에서 자료를 고르고, 완성되면 PIMS 전송함에 제출하세요.' }
    ],
    tentLines: [
        { speaker: 'KCA 간사', text: '보고서 작성천막입니다. [보고서 작성하기]를 눌러 필요한 자료를 골라주세요.' }
    ],
    successLines: [
        { speaker: 'KCA 간사', text: '좋습니다. 성과실적, 집행실적, 공문까지 다 갖췄네요. 이제 PIMS로 제출하시죠.' }
    ],
    incompleteLines: [
        { speaker: 'KCA 간사', text: '흠… 보고서 형태는 갖췄는데, 뭔가 하나 빠진 느낌이네요. 일단 제출은 해보시죠.' }
    ],
    rejectLines: [
        { speaker: 'KCA 간사', text: '필수자료가 아닌 게 섞여 있네요. 제출 전에 한 번 더 확인하는 게 좋겠습니다.' }
    ],
    failMessage: '중간보고서 제출 기한을 넘겼습니다.',
    reportTentPrompt: 'Space: 보고서 작성천막 조사',
    submitPrompt: 'Space: PIMS 전송함 제출',
    assistantHint: 'Space: KCA 간사와 대화',
    reportCards: [
        {
            id: 'performance',
            label: '상반기 성과실적',
            description: '1월부터 6월까지 달성한 성과를 정리한 자료입니다.',
            required: true,
            feedback: ''
        },
        {
            id: 'execution',
            label: '상반기 집행실적',
            description: '상반기 사업비 집행 내역을 정리한 자료입니다.',
            required: true,
            feedback: ''
        },
        {
            id: 'official_letter',
            label: '제출 공문',
            description: '중간보고서를 공식적으로 제출하는 공문입니다.',
            required: true,
            feedback: ''
        },
        {
            id: 'plan_h2',
            label: '하반기 추진계획',
            description: '중간보고의 핵심은 상반기 실적 확인이며, 하반기 계획은 필수 제출자료가 아닙니다.',
            required: false,
            feedback: '계획자료가 아니라 상반기 실적자료가 필요합니다.'
        },
        {
            id: 'last_year',
            label: '전년도 성과자료',
            description: '보고 대상 기간이 다릅니다.',
            required: false,
            feedback: '보고 대상 기간이 다릅니다. 이번 중간보고에는 올해 상반기 실적이 필요합니다.'
        },
        {
            id: 'memo',
            label: '개인 메모',
            description: '공식 제출자료가 아닙니다.',
            required: false,
            feedback: '개인 메모는 공식 제출자료로 인정되지 않습니다.'
        },
        {
            id: 'change_request',
            label: '협약변경 요청서',
            description: '협약변경 단계에서 사용하는 자료입니다.',
            required: false,
            feedback: '협약변경 요청서는 변경 단계에서 사용하는 자료입니다.'
        },
        {
            id: 'settlement',
            label: '정산보고서',
            description: '정산 단계에서 제출하는 자료입니다.',
            required: false,
            feedback: '정산보고서는 최종 정산 단계에서 제출하는 자료입니다.'
        },
        {
            id: 'promo_mockup',
            label: '홍보물 시안',
            description: '성과 증빙으로 활용될 수는 있지만, 중간보고서 제출 패키지의 핵심 필수자료는 아닙니다.',
            required: false,
            feedback: '홍보물 시안만으로는 중간보고서가 완성되지 않습니다.'
        }
    ]
};
