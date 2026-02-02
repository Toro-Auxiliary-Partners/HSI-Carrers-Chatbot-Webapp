import React, { useEffect, useState } from 'react';
import { getStudyStatus, markSurveyComplete, StudyStatus } from '../../api/studyApi';
import { Dialog, DialogType, PrimaryButton, DefaultButton, Spinner, Stack, Text } from '@fluentui/react';

interface StudySessionHandlerProps {
    children: React.ReactNode;
}

const PRE_TEST_URL = "https://csudh.qualtrics.com/jfe/form/SV_065JsNDcr7yxIsm";
const POST_SURVEY_URL = "https://csudh.qualtrics.com/jfe/form/SV_3HGSME2LdvClYRE";
// TODO: Replace with actual Quiz URL
const QUIZ_URL = "https://c11oh.itch.io/hsi-games"; 

export const StudySessionHandler: React.FC<StudySessionHandlerProps> = ({ children }) => {
    const [status, setStatus] = useState<StudyStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPostSurvey, setShowPostSurvey] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [timerExpired, setTimerExpired] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
             try {
                 const s = await getStudyStatus();
                 setStatus(s);
             } catch (e) {
                 console.error(e);
             } finally {
                 setLoading(false);
             }
        };
        fetchStatus();
    }, []);

    useEffect(() => {
        // Timer Logic for Login 2 & 3
        if (status && (status.loginCount === 2 || status.loginCount === 3)) {
             const timer = setTimeout(() => {
                 setTimerExpired(true);
                 setShowPostSurvey(true);
             }, 30 * 60 * 1000); // 30 minutes
             
             return () => clearTimeout(timer);
        }
    }, [status]);

    const handlePreSurveyComplete = async () => {
        if (status) { 
            try {
                await markSurveyComplete("preTest");
                // Refresh status
                const s = await getStudyStatus();
                setStatus(s);
            } catch (e) {
                console.error("Failed to mark survey complete", e);
            }
        }
    };

    if (loading) return <Spinner label="Loading study session..." ariaLive="assertive" labelPosition="right" />;

    if (!status) return <>{children}</>; // Fallback if failed

    // Login 1: Pre-Test
    if (status.loginCount === 1) {
        if (!status.surveys.preTest) {
            return (
                <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { height: '100vh', padding: 20 } }} tokens={{ childrenGap: 20 }}>
                     <Text variant="xxLarge">Welcome {status.userId}</Text>
                     <Text variant="large">Please complete the pre-test survey to continue.</Text>
                     <PrimaryButton href={PRE_TEST_URL} target="_blank">Go to Survey</PrimaryButton>
                     <DefaultButton onClick={handlePreSurveyComplete}>I have completed the survey</DefaultButton>
                </Stack>
            );
        }
        // If completed, show children (Chatbot)
        return <>{children}</>;
    }

    // Login 2 & 3
    if (status.loginCount === 2 || status.loginCount === 3) {
        // Control Group: Quiz
        if (status.treatmentGroup === 'control') {
             return (
                 <>
                    <iframe src={QUIZ_URL} style={{ width: '100%', height: '100vh', border: 'none' }} title="Quiz" />
                    <PostSurveyDialog isOpen={showPostSurvey} />
                 </>
             )
        }
        
        // Treatment Group: Chatbot
        return (
            <>
                {children}
                <PostSurveyDialog isOpen={showPostSurvey} />
            </>
        );
    }
    
    // Default fallback (Login > 3)
    return <>{children}</>;
};

const PostSurveyDialog = ({ isOpen }: { isOpen: boolean }) => {
    return (
        <Dialog
            hidden={!isOpen}
            dialogContentProps={{
                type: DialogType.normal,
                title: 'Session Complete',
                subText: 'Your 30-minute session has ended. Please complete the post-survey.'
            }}
            modalProps={{ isBlocking: true }}
        >
             <PrimaryButton href={POST_SURVEY_URL} target="_blank">Go to Post-Survey</PrimaryButton>
        </Dialog>
    );
};
