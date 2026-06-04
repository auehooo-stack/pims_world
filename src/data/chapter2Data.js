import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

export const chapter2Data = {
    title: '2단계: 집행의 집',
    timerDays: 15,
    timerTickMs: 5000,
    walkableArea: { x: 48, y: 146, width: GAME_WIDTH - 96, height: 398 },
    playerStart: { x: 172, y: 494 },
    assistant: { x: 242, y: 418, width: 92, height: 118 },
    pims: { x: 970, y: 332, width: 178, height: 220 },
    baskets: [
        { id: 'operating', label: '운영비', category: '운영비', x: 500, y: 486, width: 112, height: 68, color: 0x39e6c0 },
        { id: 'promotion', label: '사업추진비', category: '사업추진비', x: 634, y: 486, width: 132, height: 68, color: 0xffc86e },
        { id: 'asset', label: '자산취득비', category: '자산취득비', x: 778, y: 486, width: 132, height: 68, color: 0xffd36e },
        { id: 'travel', label: '여비', category: '여비', x: 920, y: 486, width: 112, height: 68, color: 0x6f94ff },
        { id: 'reject', label: '반려통', category: '반려통', x: 1050, y: 486, width: 112, height: 68, color: 0xff6b7d }
    ],
    receiptPool: [
        {
            id: 'r1',
            label: '사무용품 영수증',
            category: '운영비',
            asset: false,
            purpose: '사무실에서 쓸 소모품 구입',
            amount: '18,000원',
            place: '문구점',
            note: '자주 쓰는 소모성 물품'
        },
        {
            id: 'r2',
            label: '회의 다과 영수증',
            category: '사업추진비',
            asset: false,
            purpose: '회의 중 다과 준비',
            amount: '24,500원',
            place: '인근 카페',
            note: '간담회와 회의 동반 지출'
        },
        {
            id: 'r3',
            label: '버스비 영수증',
            category: '여비',
            asset: false,
            purpose: '외근 이동',
            amount: '3,500원',
            place: '시내버스',
            note: '짧은 이동 비용'
        },
        {
            id: 'r4',
            label: '택시비 영수증',
            category: '여비',
            asset: false,
            purpose: '늦은 회의 종료 후 이동',
            amount: '12,800원',
            place: '택시',
            note: '야간 이동'
        },
        {
            id: 'r5',
            label: '노트북 구매 영수증',
            category: '자산취득비',
            asset: true,
            purpose: '업무용 노트북 구매',
            amount: '1,230,000원',
            place: '전자기기 매장',
            note: '비싼 장비는 먼저 PIMS 등록'
        },
        {
            id: 'r6',
            label: '태블릿 PC 영수증',
            category: '자산취득비',
            asset: true,
            purpose: '업무용 태블릿 PC 구매',
            amount: '690,000원',
            place: '온라인몰',
            note: '자산취득비 사전 등록 필요'
        },
        {
            id: 'r7',
            label: '프린터 토너 영수증',
            category: '운영비',
            asset: false,
            purpose: '프린터 소모품 교체',
            amount: '32,000원',
            place: '전자상가',
            note: '사무 운영을 위한 반복 구매'
        },
        {
            id: 'r8',
            label: '철도 운임 영수증',
            category: '여비',
            asset: false,
            purpose: '출장 이동',
            amount: '19,600원',
            place: '철도역',
            note: '장거리 이동 비용'
        },
        {
            id: 'r9',
            label: '증빙 누락 영수증',
            category: '반려통',
            asset: false,
            invalid: true,
            purpose: '결제 내역만 남아 있음',
            amount: '11,000원',
            place: '기타',
            note: '적격증빙 누락'
        },
        {
            id: 'r10',
            label: '중복 영수증',
            category: '반려통',
            asset: false,
            invalid: true,
            purpose: '이미 등록된 항목과 동일',
            amount: '8,700원',
            place: '동일 거래처',
            note: '중복 제출 의심'
        }
    ],
    introLines: [
        { speaker: 'KCA 간사', text: '김대리님, 여기는 집행의 집입니다.' },
        { speaker: 'KCA 간사', text: '바닥의 영수증은 이미지처럼 보이기만 하고, 주우면 상세 내용이 펼쳐집니다.' },
        { speaker: 'KCA 간사', text: '운영비, 사업추진비, 자산취득비, 여비, 반려통으로 나눠 넣으세요. 자산취득비는 PIMS 등록이 먼저입니다.' }
    ],
    assetReminder: '뭐 잊은 거 없냐? 자산취득비는 먼저 PIMS에 등록해야지.',
    assetRegistered: '자산 등록 완료! 이제 자산취득비 바구니로 넣어.',
    rejectMessage: '반려되었습니다. 맞는 바구니로 다시 넣으세요.',
    pimsHint: 'Space: PIMS 자산 등록',
    assistantHint: 'Space: KCA 간사와 대화'
};
