import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { Checkbox, Text, PrimaryButton } from "@fluentui/react";
import styles from "../home/Home.module.css";
import { AppStateContext } from "../../state/AppProvider";

const POST_TEST_1 = 'https://csudh.qualtrics.com/jfe/form/SV_bwwsM3KDoulQMmi';

const DEBUG_USER = {
    username: "aifast123@example.com",
    name: "Debug User",
    homeAccountId: "debug-id",
    environment: "login.microsoftonline.com",
    tenantId: "debug-tenant",
    localAccountId: "debug-local-id"
};

const IS_DEBUG_ENV = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const Session2 = () => {
    const { accounts: msalAccounts } = useMsal();
    const appStateContext = useContext(AppStateContext);
    const navigate = useNavigate();

    const [showUserId, setShowUserId] = useState(true);
    const [userId, setUserId] = useState<number | null>(null);

    const accounts = (IS_DEBUG_ENV && msalAccounts.length === 0) ? [DEBUG_USER] : msalAccounts;
    const username = accounts[0]?.username;

    useEffect(() => {
        if (username) {
            const match = username.match(/aifast(\d+)/i);
            if (match) {
                setUserId(parseInt(match[1], 10));
            } else {
                const numMatch = username.split('@')[0].match(/(\d+)/);
                if (numMatch) {
                    setUserId(parseInt(numMatch[1], 10));
                }
            }
        }
    }, [username]);

    const setLoginCount = (count: number) => {
        sessionStorage.setItem('sessionCount', count.toString());
    };

    const handleChatbotClick = () => {
        setLoginCount(1);
        appStateContext?.dispatch({ type: 'START_TIMER' });
        navigate("/chat");
    };

    const handleQuizClick = () => {
        setLoginCount(1);
        appStateContext?.dispatch({ type: 'START_TIMER' });
        navigate("/quiz");
    };

    const handlePostTest1Click = () => {
        setLoginCount(1);
        window.open(POST_TEST_1, "_blank");
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Session 2</h1>

            {username && (
                <div className={styles.welcomeUser}>
                    Welcome, <strong>{username}</strong>
                </div>
            )}

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Session 2: Study and Post-Test Survey</h2>
                <div className={styles.instructions}>
                    <p>If your AIFAST User ID is <strong>1–300</strong>, please select the <strong>Chatbot (treatment)</strong> button below.</p>
                    <p>If your AIFAST User ID is <strong>301–600</strong>, please select the <strong>Quiz (control)</strong> button below.</p>
                    <p>Take the Study and Post-Test Survey for the first time.</p>
                </div>
                <div style={{ margin: '20px 0', textAlign: 'left', display: 'inline-block' }}>
                    <Checkbox
                        label="Want to see your AIFAST User ID number?"
                        checked={showUserId}
                        onChange={(e, checked) => setShowUserId(!!checked)}
                    />
                    {showUserId && (
                        <Text style={{ marginLeft: '10px', fontWeight: '600' }}>
                            {userId ? `user: ${userId}` : "No Number Found"}
                        </Text>
                    )}
                </div>
                <div className={styles.splitButtons}>
                    <PrimaryButton
                        text="1–300: Chatbot (treatment)"
                        onClick={handleChatbotClick}
                        className={styles.buttonPrimary}
                        style={{ marginRight: '10px', marginBottom: '10px' }}
                    />
                    <PrimaryButton
                        text="301–600: Quiz (control)"
                        onClick={handleQuizClick}
                        className={styles.buttonPrimary}
                        style={{ marginBottom: '10px' }}
                    />
                    <PrimaryButton
                        text="Post-Test Survey 1 Only"
                        onClick={handlePostTest1Click}
                        className={styles.buttonPrimary}
                    />
                </div>
            </div>
        </div>
    );
};
