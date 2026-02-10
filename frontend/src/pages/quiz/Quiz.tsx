import React from 'react';
import styles from './Quiz.module.css';

const QUIZ_URL = 'https://itch.io/embed-upload/16347508?color=333333';

const Quiz = () => {
    return (
        <div className={styles.container}>
            <iframe 
                src={QUIZ_URL} 
                title="Study Quiz"
                className={styles.iframe}
                allowFullScreen={true}
            />
        </div>
    );
};

export default Quiz;
