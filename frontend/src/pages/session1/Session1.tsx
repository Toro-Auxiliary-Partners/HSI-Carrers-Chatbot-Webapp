import React, { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { PrimaryButton } from "@fluentui/react";
import styles from "../home/Home.module.css";

const PRE_TEST_URL = 'https://csudh.qualtrics.com/jfe/form/SV_9YVcDcjw9herDbE';

const DEBUG_USER = {
    username: "aifast123@example.com",
    name: "Debug User",
    homeAccountId: "debug-id",
    environment: "login.microsoftonline.com",
    tenantId: "debug-tenant",
    localAccountId: "debug-local-id"
};

const IS_DEBUG_ENV = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const Session1 = () => {
    const { accounts: msalAccounts } = useMsal();
    const accounts = (IS_DEBUG_ENV && msalAccounts.length === 0) ? [DEBUG_USER] : msalAccounts;
    const username = accounts[0]?.username;

    const handlePreTestClick = () => {
        window.open(PRE_TEST_URL, "_blank");
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Session 1</h1>

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
                <PrimaryButton
                    text="Take Pre-Test Survey"
                    onClick={handlePreTestClick}
                    className={styles.buttonPrimary}
                />
            </div>
        </div>
    );
};
