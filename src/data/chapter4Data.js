export const chapter4Data = {
    title: '4단계: 실태점검의 관문',
    subtitle: 'KCA 팀장님의 실태점검 질의응답',
    roomPrompt: 'Space: KCA 간사와 대화',
    teamLeaderPrompt: 'Space: KCA 팀장님과 대화',
    inspectionDeskPrompt: 'Space: 점검 데스크 확인',
    playerStart: { x: 176, y: 480 },
    assistantNpc: { x: 250, y: 460, width: 98, height: 135 },
    inspectionDesk: { x: 648, y: 400, width: 300, height: 150 },
    briefingLines: [
        { speaker: 'KCA 간사', text: '실태점검은 지적을 하러 오는 절차가 아닙니다.\n사업이 계획대로 진행되고 있는지 함께 확인하는 과정입니다.' },
        { speaker: 'KCA 간사', text: '방에 들어오시면 먼저 실태점검 안내를 확인해 주세요.\n점검 데스크에서 본격적인 질의응답이 시작됩니다.' },
    ],
    successLines: [
        { speaker: 'KCA 팀장님', text: '좋습니다. 이런 식으로 설명하면 됩니다.' },
        { speaker: 'KCA 팀장님', text: '실태점검은 지적을 위한 절차가 아니라, 사업 현황을 함께 확인하는 과정입니다.' }
    ],
    completeLines: [
        { speaker: 'KCA 팀장님', text: '실태점검 컨설팅이 끝났습니다.\n지금처럼 사유와 증빙을 정리해 두면 정산 단계 대응이 훨씬 수월합니다.' }
    ],
    wrongLines: [
        { speaker: 'KCA 팀장님', text: '집행률이 낮은 경우에는 사유와 향후 계획을 함께 설명할 수 있어야 합니다.' }
    ],
    questions: [
        {
            id: 'low_execution_rate',
            speaker: 'KCA 팀장님',
            statusLines: [
                '현재 시점: 7월',
                '전체 집행률: 18%',
                '',
                '비세목별 집행률',
                '- 운영비: 42%',
                '- 사업추진비: 31%',
                '- 용역비: 0%',
                '- 자산취득비: 55%',
                '',
                '특이사항',
                '- 용역 과업범위 조정 중',
                '- 하반기 계약 예정'
            ],
            question: '전체 집행률이 계획 대비 낮은 편이네요.\n특히 용역비 집행이 아직 없는데, 사유와 향후 계획을 설명해 주실 수 있을까요?',
            answers: [
                {
                    text: '용역 과업범위 조정으로 계약이 지연되어 집행률이 낮습니다. \n하반기 계약 일정과 집행계획을 정리해 설명하겠습니다.',
                    correct: true
                },
                { text: '아직 필요 없어서 안했습니다.', correct: false },
                { text: '집행률은 연말에만 맞추면 되는 것 아닌가요?', correct: false },
                { text: '남는 예산은 나중에 다른 비세목으로 쓰면 됩니다.', correct: false }
            ],
            correctFeedback: '좋습니다. 집행률이 낮은 것 자체보다 사유와 향후 집행계획을 설명할 수 있는지가 중요합니다.',
            wrongFeedback: '집행률이 낮은 경우에는 사유와 향후 집행계획을 함께 설명할 수 있어야 합니다.'
        },
        {
            id: 'service_cost_zero',
            speaker: 'KCA 팀장님',
            statusLines: [
                '일반용역비 예산: 30백만원',
                '일반용역비 집행액: 0원',
                '계약 상태: 미체결',
                '',
                '특이사항',
                '- 제안요청서 작성 중',
                '- 과업 범위 내부 검토 중'
            ],
            question: '일반용역비가 아직 집행되지 않았네요.\n현재 추진 상황은 어떻게 되나요?',
            answers: [
                {
                    text: '제안요청서와 과업 범위를 검토 중이며,\n계약 절차 진행 후 일정에 따라 집행할 예정입니다.',
                    correct: true
                },
                { text: '아직 필요 없어서 안했습니다.', correct: false },
                { text: '어차피 예산은 있으니까 나중에 맞춰서 쓰면 됩니다.', correct: false },
                { text: '용역비는 안 써도 특별히 설명할 필요는 없지 않나요?', correct: false }
            ],
            correctFeedback: '좋습니다. 미집행 항목은 현재 추진상황과 향후 집행 일정을 함께 설명해야 합니다.',
            wrongFeedback: '특정 비세목의 집행이 없을 경우에는 현재 추진 상황과 향후 집행 예정 일정을 설명해야 합니다.'
        },
        {
            id: 'business_expense',
            speaker: 'KCA 팀장님',
            statusLines: [
                '사업추진비 집행률: 68%',
                '',
                '주요 집행 내역',
                '- 전문가 자문회의 5회',
                '- 회의 다과 및 식대',
                '- 참석자 명단 일부 정리 중'
            ],
            question: '사업추진비 집행이 꽤 진행됐네요.\n회의 관련 증빙은 정리되어 있나요?',
            answers: [
                { text: '회의록, 참석자 명단, 지출 증빙을 정리해두었습니다.', correct: true },
                { text: '회의는 실제로 했으니까 증빙은 없어도 괜찮지 않나요?', correct: false },
                { text: '사진이 있으니 회의록 대신 제출하면 될 것 같습니다.', correct: false },
                { text: '식대 영수증만 있으면 충분합니다.', correct: false }
            ],
            correctFeedback: '좋습니다. 회의 관련 지출은 목적과 증빙이 함께 확인되어야 합니다.',
            wrongFeedback: '사업추진비는 집행 목적과 회의 관련 증빙을 함께 확인할 수 있어야 합니다.'
        },
        {
            id: 'asset_registration',
            speaker: 'KCA 팀장님',
            statusLines: [
                '자산취득비 집행률: 60%',
                '',
                '구매 장비',
                '- 노트북 1대',
                '- 태블릿 PC 1대',
                '',
                '특이사항',
                '- 구매 증빙 있음',
                '- PIMS 취득자산 등록완료'
            ],
            question: '장비 구매가 있었네요.\n자산등록 상태도 확인되어 있나요?',
            answers: [
                { text: '구매 증빙과 함께 PIMS에 취득자산을 등록해두었습니다.', correct: true },
                { text: '영수증이 있으니 자산등록은 없어도 되지 않나요?', correct: false },
                { text: '담당자가 잘 쓰고 있으니 따로 관리하지 않아도 됩니다.', correct: false },
                { text: '장비는 나중에 정산할 때 등록하면 됩니다.', correct: false }
            ],
            correctFeedback: '좋습니다. 자산성 물품은 구매 여부뿐 아니라 등록과 관리 상태도 확인해야 합니다.',
            wrongFeedback: '자산성 물품은 구매 증빙뿐 아니라 자산등록 및 관리 상태도 함께 확인해야 합니다.'
        },
        {
            id: 'schedule_delay',
            speaker: 'KCA 팀장님',
            statusLines: [
                '당초 계획',
                '- 6월: 용역 착수',
                '- 8월: 중간 산출물 검토',
                '',
                '현재 상태',
                '- 7월 현재 용역 미착수',
                '- 과업 범위 조정 중'
            ],
            question: '당초 계획보다 일정이 늦어진 부분이 있어 보입니다.\n하반기 계획은 어떻게 되나요?',
            answers: [
                { text: '지연 사유와 변경된 추진 일정을 설명하겠습니다.', correct: true },
                { text: '조금 늦어진 것뿐이라 따로 설명하지 않아도 될 것 같습니다.', correct: false },
                { text: '일정은 그때그때 바뀌는 거라 계획표는 의미 없습니다.', correct: false },
                { text: '아직 착수하지 않았지만 어떻게든 마감 전에는 될 것 같습니다.', correct: false }
            ],
            correctFeedback: '좋습니다. 실태점검에서는 지연 여부뿐 아니라 향후 계획도 함께 확인합니다.',
            wrongFeedback: '사업 일정이 지연되는 경우에는 지연 사유와 변경 일정, 향후 보완 계획을 설명할 수 있어야 합니다.'
        },
        {
            id: 'audit_firm',
            speaker: '회계법인 회계사',
            statusLines: [
                '회계법인 집행점검 예정',
                '',
                '확인 예정 항목',
                '- 집행내역',
                '- 증빙자료',
                '- 비세목 구분',
                '- PIMS 등록 상태'
            ],
            question: '집행내역과 증빙자료를 확인하겠습니다.\n어떤 자료를 준비해 주실 수 있을까요?',
            answers: [
                { text: '비세목별 집행내역, 지출 증빙, PIMS 등록내역을 준비하겠습니다.', correct: true },
                { text: '중간보고서 표지만 보여드리면 될 것 같습니다.', correct: false },
                { text: '담당자가 기억하고 있으니 자료는 없어도 설명 가능합니다.', correct: false },
                { text: '나중에 필요하다고 하면 그때 찾겠습니다.', correct: false }
            ],
            correctFeedback: '좋습니다. 회계법인 집행점검은 집행내역과 증빙, 등록 상태를 중심으로 확인합니다.',
            wrongFeedback: '회계법인 집행점검에는 집행내역, 증빙자료, 비세목 구분, PIMS 등록 상태를 확인할 수 있는 자료가 필요합니다.'
        }
    ]
};
