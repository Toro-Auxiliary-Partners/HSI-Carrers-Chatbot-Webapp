import React, { useContext, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { Stack, Checkbox, Text, PrimaryButton, DefaultButton, MessageBar, MessageBarType } from "@fluentui/react";
import styles from "./Home.module.css";
import { AppStateContext } from "../../state/AppProvider";
import { SignInButton } from "../../../SignInButton";
import { StudyOrchestrator } from "../../components/Study/StudyOrchestrator";

const PRE_TEST_URL = 'https://csudh.qualtrics.com/jfe/form/SV_9YVcDcjw9herDbE';

const POST_TEST_1 = 'https://csudh.qualtrics.com/jfe/form/SV_bwwsM3KDoulQMmi';

const POST_TEST_2 = 'https://csudh.qualtrics.com/jfe/form/SV_3rwuoCJCtkbrfMy';

const QUIZ_URL = 'https://itch.io/embed-upload/16347508?color=333333';

// Define a debug user
const DEBUG_USER = {
    username: "aifast123@example.com",
    name: "Debug User",
    homeAccountId: "debug-id",
    environment: "login.microsoftonline.com",
    tenantId: "debug-tenant",
    localAccountId: "debug-local-id"
};

// Check if environment is 'debug' using Vite's import.meta.env
const IS_DEBUG_ENV = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const Home = () => {
    const { accounts:msalAccounts } = useMsal();
    const appStateContext = useContext(AppStateContext);
    const navigate = useNavigate();

    const [isFirstTime, setIsFirstTime] = useState(false);
    const [isSecondTime, setIsSecondTime] = useState(true);
    const [isThirdTime, setIsThirdTime] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);
    
    // Use debug user if in debug environment and no msal accounts are present
    const accounts = (IS_DEBUG_ENV && msalAccounts.length === 0) ? [DEBUG_USER] : msalAccounts;
    
    const username = accounts[0]?.username;

    useEffect(() => {
        if (username) {
            // Extract number from username (e.g. aifast123@... -> 123)
            const match = username.match(/aifast(\d+)/i);
            if (match) {
                setUserId(parseInt(match[1], 10));
            } else {
                 // Fallback: try to find any number before the @ if 'aifast' prefix isn't present
                 const numMatch = username.split('@')[0].match(/(\d+)/);
                 if (numMatch) {
                    setUserId(parseInt(numMatch[1], 10));
                 }
            }
        }
    }, [username]);

    const handlePreTestClick = () => {
         window.open(PRE_TEST_URL, "_blank");
    };

    const handlePostTest1Click = () => {
        setLoginCount(1);
        window.open(POST_TEST_1, "_blank");
    };

    const handlePostTest2Click = () => {
        setLoginCount(2);
        window.open(POST_TEST_2, "_blank");
    };

    const handleQuizClick = () => {
        appStateContext?.dispatch({ type: 'START_TIMER' });
        navigate("/quiz");
    };

    const handleChatbotClick = () => {
        appStateContext?.dispatch({ type: 'START_TIMER' });
        navigate("/chat");
    };

    const setLoginCount = async (count: number) => {
        console.log("Setting login count to:", count);
        const saved = sessionStorage.setItem('sessionCount', count.toString());
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Build Your Career Pathway Study Dashboard</h1>
            
            {username && (
                <div className={styles.welcomeUser}>
                    Welcome, <strong>{username}</strong>
                </div>
            )}

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Session 1: Take the Pre-Test Survey</h2>
                <div className={styles.instructions}>
                Please take the Pre-Test Survey to begin the study.
                </div>
                <div style={{ margin: '20px 0', textAlign: 'left', display: 'inline-block' }}>
                    <Checkbox 
                        label="Is this your first time logging in?" 
                        checked={isFirstTime} 
                        onChange={(e, checked) => {setIsFirstTime(!!checked); setIsSecondTime(!!!checked);}} 
                    />
                </div>
                <br />
                <PrimaryButton 
                    text="Take Pre-Test Survey" 
                    onClick={handlePreTestClick} 
                    className={styles.buttonPrimary}
                />
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Session 2: Study and Post-Test Survey</h2>
                <div className={styles.instructions}>
                    <p>If your AIFAST User ID is below 300, please select Quiz button below.</p>
                    <p>If your AIFAST User ID is above 300, please select the Chatbot button.</p>
                    <p>Take the Study and Post-Test Survey for the first time</p>
                </div>
                <div style={{ margin: '20px 0', textAlign: 'left', display: 'inline-block' }}>
                    <Checkbox 
                        label="Want to see your AIFAST User ID number?" 
                        checked={isSecondTime} 
                        onChange={(e, checked) => setIsSecondTime(!!checked)} 
                    />
                    {isSecondTime && (
                        <Text style={{ marginLeft: '10px', fontWeight: '600' }}>
                            {userId ? `user: ${userId}` : "No Number Found"}
                        </Text>
                    )}
                </div>
                <div className={styles.splitButtons}>
                    <PrimaryButton 
                        text="Below 300: Quiz" 
                        onClick={() => {setLoginCount(1); handleQuizClick();}}
                        className={styles.buttonPrimary}
                        style={{ marginRight: '10px', marginBottom: '10px' }}
                    />
                    <PrimaryButton 
                        text="300 & Above: Chatbot" 
                        onClick={() => {setLoginCount(1); handleChatbotClick();}}
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

            <div className={styles.section}>
                 <h2 className={styles.sectionTitle}>Session 3</h2>
                 <div className={styles.instructions}>
                    <p>If your AIFAST User ID is below 300, please select Quiz button below.</p>
                    <p>If your AIFAST User ID is above 300, please select the Chatbot button.</p>
                    <p>Take the Study and Post-Test Survey for a second time</p>
                </div>
                <div style={{ margin: '20px 0', textAlign: 'left', display: 'inline-block' }}>
                    <Checkbox 
                        label="Did you already complete Session 2?" 
                        checked={isThirdTime} 
                        onChange={(e, checked) => {setIsFirstTime(false); setIsSecondTime(!!!checked); setIsThirdTime(!!checked); }} 
                    />
                </div>
                <div className={styles.splitButtons}>
                    <PrimaryButton 
                        text="Below 300: Quiz" 
                        onClick={() => {setLoginCount(2); handleQuizClick();}}
                        className={styles.buttonPrimary}
                        style={{ marginRight: '10px', marginBottom: '10px' }}
                    />
                    <PrimaryButton 
                        text="300 & Above: Chatbot" 
                        onClick={() => {setLoginCount(2); handleChatbotClick();}}
                        className={styles.buttonPrimary}
                        style={{ marginBottom: '10px' }}
                    />
                    <br />
                <PrimaryButton 
                    text="Post-Test Survey 2 Only" 
                    onClick={handlePostTest2Click} 
                    className={styles.buttonPrimary}
                />
                </div>
            </div>
        </div>
    );
};
