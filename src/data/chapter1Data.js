import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

export const chapter1Data = {
    title: '1단계: 봉인된 금고',
    month: '1~2월',
    walkableArea: { x: 48, y: 150, width: GAME_WIDTH - 96, height: GAME_HEIGHT - 350 },
    playerStart: { x: 380, y: 480 },
    objects: [
        {
            id: 'assistant',
            name: 'KCA 간사',
            prompt: 'Space: KCA 간사와 대화',
            x: 650,
            y: 460,
            width: 98,
            height: 135,
            animated: true
        },
        {
            id: 'cabinet',
            name: '서류 보관함',
            prompt: 'Space: 서류 보관함 조사',
            x: 220,
            y: 442,
            width: 126,
            height: 150,
            hideVisuals: true,
            labelOnly: true
        },
        {
            id: 'terminal',
            name: 'PIMS 단말기',
            prompt: 'Space: PIMS 단말기 확인',
            x: 880,
            y: 442,
            width: 126,
            height: 150,
            hideVisuals: true,
            labelOnly: true
        },
        {
            id: 'vault',
            name: '금고 벽',
            prompt: 'Space: 금고 벽 확인',
            x: 1085,
            y: 442,
            width: 126,
            height: 150,
        }
    ]
};
