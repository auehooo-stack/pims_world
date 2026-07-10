export const CHANGE_TYPES = {
    approval: '승인사항',
    notification: '통보사항',
    etc: '기타사항'
};

export const changeTypeMeta = {
    approval: {
        label: '승인사항',
        subLabel: '주무부서 승인 필요'
    },
    notification: {
        label: '통보사항',
        subLabel: '주무부서 통보 필요'
    },
    etc: {
        label: '기타사항',
        subLabel: 'PIMS 정보수정만'
    }
};

export const chapter5Data = {
    title: '5단계: 협약변경의 방',
    subtitle: '변경유형 판정',
    roomPrompt: 'Space: 변경유형 판정 열기',
    packageTitle: '변경유형 판정',
    warningText: '협약변경은 11월 30일까지',
    playerStart: { x: 174, y: 486 },
    roomInteractable: { x: 526, y: 384, width: 220, height: 186 },
    changeCases: [
        {
            id: 'budget_category_change',
            title: '사업비 비목 간 변경',
            description: '사업비를 한 비목에서 다른 비목으로 변경하려고 합니다.',
            note: '비목 간 변경은 사업계획과 예산 구조에 영향을 줍니다.',
            correctType: 'approval',
            attachmentList: [
                '승인요청공문',
                '주무부서 승인공문',
                '변경수행계획서',
                '사업계획변경서',
                'PIMS 정보수정'
            ],
            explanation: '맞습니다. 사업비 비목 간 변경은 승인사항입니다. 승인요청공문과 주무부서 승인공문까지 확인하고, 변경된 내용은 PIMS 정보에도 반영해야 합니다.',
            trapType: null,
            trapMessage: ''
        },
        {
            id: 'budget_detail_change',
            title: '사업비 세목 간 변경',
            description: '사업비를 같은 비목 안의 다른 세목으로 조정하려고 합니다.',
            note: '일반적인 세목 간 변경입니다. 단, 인건비·여비 관련 세목 간 변경은 별도로 구분해야 합니다.',
            correctType: 'notification',
            attachmentList: [
                '통보공문',
                '변경수행계획서',
                '사업계획변경서',
                'PIMS 정보수정'
            ],
            explanation: '맞습니다. 일반적인 사업비 세목 간 변경은 통보사항입니다. 다만 인건비 또는 여비의 세목 간 변경은 승인사항이므로 구분해야 합니다.',
            trapType: 'approval',
            trapMessage: '하하! 세목 간 변경이라고 전부 승인사항은 아닙니다. 일반적인 세목 간 변경은 통보사항입니다. 변경내용을 제대로 읽어보세요!'
        },
        {
            id: 'labor_cost_detail_change',
            title: '인건비 세목 간 변경',
            description: '인건비 세목 간 금액을 조정하려고 합니다.',
            note: '세목 간 변경이지만 인건비 관련 변경입니다.',
            correctType: 'approval',
            attachmentList: [
                '승인요청공문',
                '주무부서 승인공문',
                '변경수행계획서',
                '사업계획변경서',
                'PIMS 정보수정'
            ],
            explanation: '맞습니다. 세목 간 변경이라도 인건비 세목 간 변경은 승인사항입니다. 승인요청공문과 승인공문까지 확인해야 합니다.',
            trapType: 'notification',
            trapMessage: '하하! 세목 간 변경이라도 인건비는 예외입니다. 인건비 세목 간 변경은 통보사항이 아니라 승인사항입니다.'
        },
        {
            id: 'travel_cost_detail_change',
            title: '여비 세목 간 변경',
            description: '여비 세목 간 금액을 조정하려고 합니다.',
            note: '세목 간 변경이지만 여비 관련 변경입니다.',
            correctType: 'approval',
            attachmentList: [
                '승인요청공문',
                '주무부서 승인공문',
                '변경수행계획서',
                '사업계획변경서',
                'PIMS 정보수정'
            ],
            explanation: '맞습니다. 세목 간 변경이라도 여비 세목 간 변경은 승인사항입니다. 승인요청공문과 승인공문을 함께 확인해야 합니다.',
            trapType: 'notification',
            trapMessage: '하하! 여비도 그냥 넘기면 안 됩니다. 여비 세목 간 변경은 통보사항이 아니라 승인사항입니다.'
        },
        {
            id: 'working_manager_change',
            title: '실무책임자 변경',
            description: '사업의 실무책임자가 변경됩니다.',
            note: '실무책임자 변경입니다. 총괄책임자 변경과 구분해야 합니다.',
            correctType: 'notification',
            attachmentList: [
                '통보공문',
                '변경수행계획서',
                '사업계획변경서',
                'PIMS 정보수정'
            ],
            explanation: '맞습니다. 실무책임자 변경은 통보사항입니다. 총괄책임자 변경과 구분해야 합니다.',
            trapType: 'approval',
            trapMessage: '하하! 혹시나 해서 놓은 함정에 걸리셨군요. 실무책임자 변경은 승인사항이 아니라 통보사항입니다. 변경사항을 제대로 읽어보세요!'
        },
        {
            id: 'general_manager_change',
            title: '총괄책임자 변경',
            description: '사업의 총괄책임자가 변경됩니다.',
            note: '총괄책임자는 사업 수행 책임이 큰 핵심 인력입니다.',
            correctType: 'approval',
            attachmentList: [
                '승인요청공문',
                '주무부서 승인공문',
                '변경수행계획서',
                '사업계획변경서',
                'PIMS 정보수정'
            ],
            explanation: '맞습니다. 총괄책임자 변경은 승인사항입니다. 승인요청공문과 주무부서 승인공문까지 확인해야 합니다.',
            trapType: 'notification',
            trapMessage: '하하! 총괄책임자 변경을 단순 통보로 넘기려 하셨군요. 총괄책임자 변경은 승인사항입니다.'
        },
        {
            id: 'participant_change',
            title: '참여인력 변경',
            description: '기존 참여인력이 빠지고 신규 참여인력이 들어옵니다.',
            note: '기존 참여인력은 변경 전까지 사업에 참여했습니다.',
            correctType: 'notification',
            attachmentList: [
                '통보공문',
                '변경수행계획서',
                '사업계획변경서',
                '보안서약서',
                'PIMS 정보수정'
            ],
            explanation: '맞습니다. 참여인력 변경은 통보사항입니다. 신규 참여인력의 보안서약서를 추가해야 하며, 기존 참여인력은 변경 전까지 참여했으므로 관련 자료를 삭제하면 안 됩니다. 변경된 참여인력 정보는 PIMS에도 반영해야 합니다.',
            trapType: 'approval',
            trapMessage: '하하! 참여인력 변경을 승인사항으로 착각하셨군요. 참여인력 변경은 통보사항입니다. 다만 신규 참여인력의 보안서약서와 PIMS 정보수정은 필요합니다.'
        },
        {
            id: 'contact_info_change',
            title: '담당자 연락처 변경',
            description: '수행기관 담당자의 전화번호가 변경되었습니다.',
            note: '사업계획이나 수행체계가 바뀌는 사항은 아닙니다.',
            correctType: 'etc',
            attachmentList: [
                'PIMS 정보수정'
            ],
            explanation: '맞습니다. 단순 연락처 변경은 협약변경 서류를 조립할 필요 없이 PIMS 정보수정으로 처리합니다.',
            trapType: 'notification',
            trapMessage: '하하! 단순 연락처 변경까지 통보사항으로 처리하려 하셨군요. 이 건은 기타사항으로 보고 PIMS 정보수정만 하면 됩니다.'
        }
    ]
};
