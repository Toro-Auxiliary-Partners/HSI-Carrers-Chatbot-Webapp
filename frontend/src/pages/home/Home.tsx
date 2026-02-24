import React from "react";
import { useNavigate } from "react-router-dom";
import { PrimaryButton } from "@fluentui/react";
import styles from "./Home.module.css";

export const Home = () => {
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Build Your Career Pathway Study Dashboard</h1>

            <div className={styles.section}>
                <p className={styles.instructions}>
                    If you have hit this page, please click the button below to go to Session One.
                </p>
                <PrimaryButton
                    text="Go to Session One"
                    onClick={() => navigate("/session1")}
                    className={styles.buttonPrimary}
                />
            </div>
        </div>
    );
};
