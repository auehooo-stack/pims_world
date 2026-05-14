export const chapter1Data = {
    title: '1단계: 봉인된 금고',
    month: '1~2월',
    walkableArea: { x: 24, y: 112, width: 592, height: 178 },
    playerStart: { x: 112, y: 244 },
    objects: [
        {
            id: 'assistant',
            name: 'KCA 간사',
            prompt: 'Space: KCA 간사와 대화',
            x: 432,
            y: 214,
            width: 30,
            height: 48,
            color: 0xff4f86
        },
        {
            id: 'cabinet',
            name: '서류 보관함',
            prompt: 'Space: 서류 보관함 조사',
            x: 164,
            y: 190,
            width: 44,
            height: 56,
            color: 0x4d8dff
        },
        {
            id: 'terminal',
            name: 'PIMS 단말기',
            prompt: 'Space: PIMS 단말기 확인',
            x: 282,
            y: 198,
            width: 48,
            height: 42,
            color: 0x22e6a8
        },
        {
            id: 'vault',
            name: '금고 문',
            prompt: 'Space: 금고 문 확인',
            x: 518,
            y: 164,
            width: 92,
            height: 118,
            color: 0xb7a86a
        }
    ]
};
