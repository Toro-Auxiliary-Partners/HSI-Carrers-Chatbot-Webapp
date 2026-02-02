
export interface StudyStatus {
    id: string;
    userId: string;
    treatmentGroup: "treatment" | "control";
    loginCount: number;
    lastLogin: string;
    surveys: {
        preTest: boolean;
        session1Post: boolean;
        session2Post: boolean;
    };
}

export const getStudyStatus = async (): Promise<StudyStatus> => {
    const response = await fetch('/api/study/status', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch study status');
    }

    return response.json();
};

export const markSurveyComplete = async (surveyKey: string): Promise<StudyStatus> => {
    const response = await fetch('/api/study/complete-survey', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ surveyKey })
    });

    if (!response.ok) {
        throw new Error('Failed to mark survey complete');
    }

    return response.json();
};
