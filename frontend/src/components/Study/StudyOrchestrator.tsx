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

const DEFAULT_PRE_TEST_URL = 'https://csudh.qualtrics.com/jfe/form/SV_065JsNDcr7yxIsm';
const DEFAULT_POST_TEST_URL = 'https://csudh.qualtrics.com/jfe/form/SV_3HGSME2LdvClYRE';
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

    const urls = useMemo(
        () => ({
            pre: preTestUrl ?? DEFAULT_PRE_TEST_URL,
            post: postTestUrl ?? DEFAULT_POST_TEST_URL,
            quiz: quizUrl ?? DEFAULT_QUIZ_URL,
        }),
        [preTestUrl, postTestUrl, quizUrl]
    );

    const refresh = async () => {
        const s = await getJson<StudyProfile>('/api/study/state');
        setState(s);
    };

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Register this session (login_count only increments after 30 minutes).
                const s = await postJson<StudyProfile>('/api/study/login');
                if (!mounted) return;
                setState(s);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

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

    // Pre-test gate (requested: loginCount == 0 and preTest == false)
    if (state.login_count === 0 && state.surveys?.pre_test === false) {
        return (
            <>
                <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { height: '100vh', padding: 20 } }} tokens={{ childrenGap: 16 }}>
                    <Text variant="xxLarge">Pre-Test Survey</Text>
                    <Text variant="large">Please complete the pre-test survey to continue.</Text>
                    <PrimaryButton href={urls.pre} target="_blank">Go to Survey</PrimaryButton>
                    <DefaultButton onClick={markPreTestComplete}>I have completed the survey</DefaultButton>
                </Stack>
                <DevToolbar state={state} isVisible={debugVisible} />
            </>
        );
    }

    const content = state.group === 'control'
        ? <iframe src={urls.quiz} style={{ width: '100%', height: '100vh', border: 'none' }} title="Quiz" />
        : <>{children}</>;

    return (
        <>
            {content}
            <PostTestDialog
                isOpen={showPostTest}
                postUrl={urls.post}
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
