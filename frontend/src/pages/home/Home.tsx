import React, { useContext, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { Stack, Checkbox, Text, PrimaryButton, DefaultButton, MessageBar, MessageBarType } from "@fluentui/react";
import styles from "./Home.module.css";
import { AppStateContext } from "../../state/AppProvider";

const PRE_TEST_URL = 'https://csudh.qualtrics.com/jfe/form/SV_065JsNDcr7yxIsm';
const QUIZ_URL = 'https://itch.io/embed-upload/16347508?color=333333';

export const Home = () => {
    const { accounts } = useMsal();
    const appStateContext = useContext(AppStateContext);
    const navigate = useNavigate();

    const [isFirstTime, setIsFirstTime] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);

    const username = accounts[0]?.username;

    useEffect(() => {
        if (username) {
            const match = username.match(/aifast(\d+)/i);
            if (match) {
                setUserId(parseInt(match[1], 10));
            }
        }
    }, [username]);

    const handlePreTestClick = () => {
         window.open(PRE_TEST_URL, "_blank");
    };

    const handleQuizClick = () => {
        appStateContext?.dispatch({ type: 'START_TIMER' });
        navigate("/quiz");
    };

    const handleChatbotClick = () => {
        appStateContext?.dispatch({ type: 'START_TIMER' });
        navigate("/chat");
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Study Dashboard</h1>
            
            {userId && (
                <div className={styles.welcomeUser}>
                    Welcome, <strong>{userId}</strong>
                </div>
            )}

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Step 1: Enrollment (Pre-Test Survey)</h2>
                <div className={styles.instructions}>
                    Please take the Pre-Test Survey to begin your enrollment.
                </div>
                <div style={{ margin: '20px 0', textAlign: 'left', display: 'inline-block' }}>
                    <Checkbox 
                        label="Is this your first time logging in?" 
                        checked={isFirstTime} 
                        onChange={(e, checked) => setIsFirstTime(!!checked)} 
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
                <h2 className={styles.sectionTitle}>Step 2: Study Assignment (Sorting)</h2>
                <div className={styles.instructions}>
                    Check your User ID number. If it is below 300, select the Quiz. If it is 300 or above, select the Chatbot.
                </div>
                <div className={styles.splitButtons}>
                    <PrimaryButton 
                        text="Below 300: Quiz" 
                        onClick={handleQuizClick}
                        className={styles.buttonPrimary}
                        style={{ marginRight: '10px', marginBottom: '10px' }}
                    />
                    <PrimaryButton 
                        text="300 & Above: Chatbot" 
                        onClick={handleChatbotClick}
                        className={styles.buttonPrimary}
                        style={{ marginBottom: '10px' }}
                    />
                </div>
            </div>

            <div className={styles.section}>
                 <h2 className={styles.sectionTitle}>Instructions</h2>
                 <p>Once you start a module, a 30-minute timer will begin.</p>
                 <p>When the time is up, a link to the Post-Test Survey will appear in the top bar.</p>
            </div>
        </div>
    );
};
