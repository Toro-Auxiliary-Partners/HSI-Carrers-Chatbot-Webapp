import React, { useEffect, useMemo, useState } from 'react';
import { DefaultButton, Dialog, DialogType, PrimaryButton, Spinner, Stack, Text } from '@fluentui/react';
import { DevToolbar, StudyProfile } from './DevToolbar';

interface StudyOrchestratorProps {
    children: React.ReactNode;

    // Optional knobs for experiments
    debugVisible?: boolean;
    preTestUrl?: string;
    postTestUrl?: string;
    quizUrl?: string;
}

const DEFAULT_PRE_TEST_URL = 'https://csudh.qualtrics.com/jfe/form/SV_9YVcDcjw9herDbE';
const DEFAULT_POST_TEST_URL_1 = 'https://csudh.qualtrics.com/jfe/form/SV_bwwsM3KDoulQMmi';
const DEFAULT_POST_TEST_URL_2 = 'https://csudh.qualtrics.com/jfe/form/SV_3rwuoCJCtkbrfMy';
const DEFAULT_QUIZ_URL = 'https://itch.io/embed-upload/16347508?color=333333';

async function getJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${url} failed: ${res.status} ${text}`);
    }
    return res.json();
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${url} failed: ${res.status} ${text}`);
    }
    return res.json();
}

export const StudyOrchestrator: React.FC<StudyOrchestratorProps> = ({
    children,
    debugVisible,
    preTestUrl,
    postTestUrl,
    quizUrl,
}) => {
    const [state, setState] = useState<StudyProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPostTest, setShowPostTest] = useState(false);

    const sessionCountString = localStorage.getItem('sessionCount');
    console.log("sessionCountString", sessionCountString);

    const sessionInfo = useMemo(
        () => ({
            pre: DEFAULT_PRE_TEST_URL,
            post1: DEFAULT_POST_TEST_URL_1,
            post2: DEFAULT_POST_TEST_URL_2,
            quiz: DEFAULT_QUIZ_URL,
        }),
        [preTestUrl, postTestUrl, quizUrl]
    );

    const refresh = async () => {
        const s = await getJson<StudyProfile>('/api/study/state');
        setState(s);
    };

    useEffect(() => {
        let mounted = true;
        if (mounted) setLoading(false);
        console.log(localStorage.getItem('sessionCount'));
        return () => {
            mounted = false;
        };
    }, []);

    const inMainSession = !!state && state.surveys?.pre_test === true;

    useEffect(() => {
        if (!inMainSession) return;

        const timer = window.setTimeout(() => {
            setShowPostTest(true);
        }, 30 * 60 * 1000);

        return () => window.clearTimeout(timer);
    }, [inMainSession]);

    const markPreTestComplete = async () => {
        try {
            const updated = await postJson<StudyProfile>('/api/study/survey', { survey: 'pre_test', completed: true });
            setState(updated);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            alert(e instanceof Error ? e.message : String(e));
        }
    };

    const markPostTestComplete = async () => {
        try {
            const updated = await postJson<StudyProfile>('/api/study/survey', { survey: 'post_test_1', completed: true });
            setState(updated);
            setShowPostTest(false);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            alert(e instanceof Error ? e.message : String(e));
        }
    };

    if (loading) {
        return (
            <>
                <Spinner label="Loading study session…" ariaLive="assertive" labelPosition="right" />
                <DevToolbar state={state} isVisible={debugVisible} />
            </>
        );
    }

    // If the study APIs are unavailable, just render children.
    if (!state) {
        return (
            <>
                {children}
                <DevToolbar state={state} isVisible={debugVisible} />
            </>
        );
    }
    
    const sessionCount : number = sessionCountString ? parseInt(sessionCountString, 10) : 0;

    const content = <>{children}</>;


    // Pre-test gate (requested: loginCount == 0 and preTest == false)
    if (sessionCount === 0) {
        return (
            <>
                <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { height: '100vh', padding: 20 } }} tokens={{ childrenGap: 16 }}>
                    <Text variant="xxLarge">Pre-Test Survey</Text>
                    <Text variant="large">Please complete the pre-test survey to continue.</Text>
                    <PrimaryButton href={sessionInfo.pre} target="_blank">Go to Survey</PrimaryButton>
                    <DefaultButton onClick={markPreTestComplete}>I have completed the survey</DefaultButton>
                </Stack>
                <DevToolbar state={state} isVisible={debugVisible} />
            </>
        );
    }
    else if (sessionCount === 1) {
        return (
            <>
                <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { height: '100vh', padding: 20 } }} tokens={{ childrenGap: 16 }}>
                    <Text variant="xxLarge">Post Test Survey 1</Text>
                    <Text variant="large">Please complete the post-test survey to continue.</Text>
                    <PrimaryButton href={sessionInfo.post1} target="_blank">Go to Survey</PrimaryButton>
                    <DefaultButton onClick={markPreTestComplete}>I have completed the survey</DefaultButton>
                </Stack>
                <DevToolbar state={state} isVisible={debugVisible} />
            </>
        );
    }
   
    return (
        <>
            {content}
            <PostTestDialog
                isOpen={showPostTest}
                postUrl={sessionInfo.post2}
                onDone={markPostTestComplete}
            />
            <DevToolbar state={state} isVisible={debugVisible} />
        </>
    );
};

const PostTestDialog = ({
    isOpen,
    postUrl,
    onDone,
}: {
    isOpen: boolean;
    postUrl: string;
    onDone: () => Promise<void> | void;
}) => {
    return (
        <Dialog
            hidden={!isOpen}
            dialogContentProps={{
                type: DialogType.normal,
                title: 'Session Complete',
                subText: 'Your 30-minute session has ended. Please complete the post-test survey.',
            }}
            modalProps={{ isBlocking: true }}
        >
            <Stack horizontal tokens={{ childrenGap: 10 }}>
                <PrimaryButton href={postUrl} target="_blank">Go to Post-Test Survey</PrimaryButton>
                <DefaultButton onClick={() => onDone()}>I have completed the post-test</DefaultButton>
            </Stack>
        </Dialog>
    );
};
