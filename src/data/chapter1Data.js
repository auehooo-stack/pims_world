import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

export const chapter1Data = {
    title: '1단계: 봉인된 금고',
    month: '1~2월',
    walkableArea: { x: 48, y: 150, width: GAME_WIDTH - 96, height: GAME_HEIGHT - 350 },
    playerStart: { x: 225, y: 473 },
    objects: [
        {
            id: 'assistant',
            name: 'KCA 간사',
            prompt: 'Space: KCA 간사와 대화',
            x: 600,
            y: 460,
            width: 92,
            height: 118,
            color: 0xff4f86,
            animated: true
        },
        {
            id: 'cabinet',
            name: '서류 보관함',
            prompt: 'Space: 서류 보관함 조사',
            x: 420,
            y: 442,
            width: 96,
            height: 120,
            color: 0x4d8dff,
            hideVisuals: true
        },
        {
            id: 'terminal',
            name: 'PIMS 단말기',
            prompt: 'Space: PIMS 단말기 확인',
            x: 830,
            y: 442,
            width: 196,
            height: 247,
            color: 0x22e6a8,
            hideVisuals: true
        },
        {
            id: 'vault',
            name: '금고 벽',
            prompt: 'Space: 금고 벽 확인',
            x: 1045,
            y: 420,
            width: 280,
            height: 200,
            color: 0xb7a86a
        }
    ]
};
