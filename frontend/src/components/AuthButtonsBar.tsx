import React from "react";
import { SignInButton } from "../../SignInButton";
import { SignOutButton } from "../../SignOutButton";
import styles from "./AuthButtonsBar.module.css";

const AuthButtonsBar = () => {
    return (
        <div className={styles.authButtonsBar}>
            <SignInButton />
            <SignOutButton />
        </div>
    );
};

export default AuthButtonsBar;
