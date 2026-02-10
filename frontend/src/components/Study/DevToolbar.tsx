import React, { useMemo, useState } from 'react';
import { DefaultButton, Stack, Text } from '@fluentui/react';

export type StudyGroup = 'control' | 'treatment';

export interface StudyProfile {
    id: string;
    type: 'study_profile';
    group: StudyGroup;
    login_count: number;
    surveys: Record<string, boolean>;
    last_login?: string | null;
}

interface DevToolbarProps {
    state: StudyProfile | null;
    isVisible?: boolean;
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

export const DevToolbar: React.FC<DevToolbarProps> = ({ state, isVisible }) => {
    const [busy, setBusy] = useState<string | null>(null);

    const shouldShow = useMemo(() => {
        if (isVisible) return true;
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('debug') === 'true';
        } catch {
            return false;
        }
    }, [isVisible]);

    const loginCount = state?.login_count ?? 0;
    const group = state?.group ?? 'control';

    const run = async (label: string, fn: () => Promise<void>) => {
        try {
            setBusy(label);
            await fn();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            alert(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(null);
        }
    };

    if (!shouldShow) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 12,
                right: 12,
                zIndex: 10000,
                width: 280,
                background: 'rgba(250, 250, 250, 0.95)',
                border: '1px solid #ddd',
                borderRadius: 8,
                boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                padding: 10,
            }}
        >
            <Stack tokens={{ childrenGap: 8 }}>
                <Text variant="mediumPlus"><strong>Dev Toolbar</strong></Text>

                <Stack tokens={{ childrenGap: 2 }}>
                    <Text variant="small">loginCount: <strong>{loginCount}</strong></Text>
                    <Text variant="small">group: <strong>{group}</strong></Text>
                    <Text variant="small">
                        surveys: <strong>{state ? JSON.stringify(state.surveys) : '{}'}</strong>
                    </Text>
                </Stack>

                <Stack horizontal wrap tokens={{ childrenGap: 6 }}>
                    <DefaultButton
                        text={busy === 'reset' ? 'Resetting…' : 'Reset to New User'}
                        disabled={!!busy}
                        onClick={() =>
                            run('reset', async () => {
                                await postJson('/api/study/debug/reset');
                                window.location.reload();
                            })
                        }
                    />

                    <DefaultButton
                        text={busy === 'login2' ? 'Setting…' : 'Simulate Login 2'}
                        disabled={!!busy}
                        onClick={() =>
                            run('login2', async () => {
                                await postJson('/api/study/debug/set', { count: 2, group });
                                window.location.reload();
                            })
                        }
                    />

                    <DefaultButton
                        text={busy === 'control' ? 'Switching…' : 'Switch to Control'}
                        disabled={!!busy || group === 'control'}
                        onClick={() =>
                            run('control', async () => {
                                await postJson('/api/study/debug/set', { count: loginCount, group: 'control' });
                                window.location.reload();
                            })
                        }
                    />

                    <DefaultButton
                        text={busy === 'treatment' ? 'Switching…' : 'Switch to Treatment'}
                        disabled={!!busy || group === 'treatment'}
                        onClick={() =>
                            run('treatment', async () => {
                                await postJson('/api/study/debug/set', { count: loginCount, group: 'treatment' });
                                window.location.reload();
                            })
                        }
                    />
                </Stack>

                <Text variant="tiny" styles={{ root: { opacity: 0.75 } }}>
                    Show via prop or `?debug=true`.
                </Text>
            </Stack>
        </div>
    );
};
