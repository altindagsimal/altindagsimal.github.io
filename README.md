# altindagsimal.github.io
{\rtf1\ansi\ansicpg1254\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 <!DOCTYPE html>\
<html lang="en">\
<head>\
    <meta charset="UTF-8">\
    <meta name="viewport" content="width=device-width, initial-scale=1.0">\
    <title>Skincare Advisor</title>\
    <link rel="stylesheet" href="style.css">\
    <link rel="preconnect" href="https://fonts.googleapis.com">\
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">\
</head>\
<body>\
    <div class="app-container">\
        <div id="quiz-view">\
            <h1 id="question-text">Is your skin dry?</h1>\
            <div id="button-container">\
                <button class="btn" id="yes-btn">Yes</button>\
                <button class="btn" id="no-btn">No</button>\
            </div>\
        </div>\
        <div id="result-view" class="hidden">\
            <h2>Your Recommendation</h2>\
            <p id="result-text"></p>\
            <button class="btn" id="restart-btn">Assess Again</button>\
        </div>\
    </div>\
    <script src="script.js"></script>\
    {\rtf1\ansi\ansicpg1254\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 document.addEventListener('DOMContentLoaded', () => \{\
    // DOM Element References\
    const quizView = document.getElementById('quiz-view');\
    const resultView = document.getElementById('result-view');\
    const questionTextElement = document.getElementById('question-text');\
    const resultTextElement = document.getElementById('result-text');\
    const yesBtn = document.getElementById('yes-btn');\
    const noBtn = document.getElementById('no-btn');\
    const restartBtn = document.getElementById('restart-btn');\
\
    // Flowchart logic as a structured object\
    const flowchart = \{\
        start: \{\
            question: "Is your skin dry?",\
            yes: "q_moisturizer",\
            no: "q_allergy"\
        \},\
        q_moisturizer: \{\
            question: "Do you use a face moisturizer?",\
            yes: "q_water",\
            no: \{ result: "Start using a face moisturizer." \}\
        \},\
        q_water: \{\
            question: "Do you drink around 3 liters of water daily?",\
            yes: \{ result: "Your skin health seems to be affected by other factors. Please consult a dermatologist." \},\
            no: \{ result: "Start drinking around 3 liters of water every day to improve skin hydration." \}\
        \},\
        q_allergy: \{\
            question: "Do you have an allergy to something?",\
            yes: \{ result: "Use allergy-friendly products to avoid skin reactions." \},\
            no: "q_oily_food"\
        \},\
        q_oily_food: \{\
            question: "Do you eat oily food frequently?",\
            yes: \{ result: "Switch to a balanced diet to improve your overall skin health." \},\
            no: \{ result: "Your skin issue might have an underlying cause. It is best to consult a dermatologist." \}\
        \}\
    \};\
\
    let currentNodeKey = 'start';\
\
    // Function to display a question\
    const displayQuestion = (nodeKey) => \{\
        const node = flowchart[nodeKey];\
        questionTextElement.textContent = node.question;\
        currentNodeKey = nodeKey;\
    \};\
\
    // Function to handle user's answer\
    const handleAnswer = (answer) => \{\
        const currentNode = flowchart[currentNodeKey];\
        const nextNodeKey = answer === 'yes' ? currentNode.yes : currentNode.no;\
\
        if (typeof nextNodeKey === 'string') \{\
            displayQuestion(nextNodeKey);\
        \} else if (typeof nextNodeKey === 'object' && nextNodeKey.result) \{\
            showResult(nextNodeKey.result);\
        \}\
    \};\
\
    // Function to display the final result\
    const showResult = (resultMessage) => \{\
        resultTextElement.textContent = resultMessage;\
        quizView.classList.add('hidden');\
        resultView.classList.remove('hidden');\
    \};\
\
    // Function to restart the quiz\
    const restartQuiz = () => \{\
        resultView.classList.add('hidden');\
        quizView.classList.remove('hidden');\
        displayQuestion('start');\
    \};\
\
    // Event Listeners for user actions\
    yesBtn.addEventListener('click', () => handleAnswer('yes'));\
    noBtn.addEventListener('click', () => handleAnswer('no'));\
    restartBtn.addEventListener('click', restartQuiz);\
\
    // Initial call to start the application\
    displayQuestion('start');\
\});}
</body>\
</html>}
{\rtf1\ansi\ansicpg1254\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 :root \{\
    --primary-bg: #1a1a1a;\
    --secondary-bg: #2c2c2c;\
    --text-color: #f0f0f0;\
    --accent-color: #00bcd4;\
    --button-color: #444;\
    --button-hover: #555;\
\}\
\
body \{\
    margin: 0;\
    font-family: 'Poppins', sans-serif;\
    background-color: var(--primary-bg);\
    color: var(--text-color);\
    display: flex;\
    justify-content: center;\
    align-items: center;\
    min-height: 100vh;\
    padding: 20px;\
    box-sizing: border-box;\
\}\
\
.app-container \{\
    background-color: var(--secondary-bg);\
    padding: 40px;\
    border-radius: 15px;\
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);\
    width: 100%;\
    max-width: 500px;\
    text-align: center;\
    transition: all 0.3s ease-in-out;\
\}\
\
#question-text, #result-view h2 \{\
    font-size: 1.75rem;\
    font-weight: 600;\
    margin-top: 0;\
    margin-bottom: 30px;\
    color: var(--accent-color);\
\}\
\
#result-text \{\
    font-size: 1.2rem;\
    line-height: 1.6;\
    margin-bottom: 30px;\
\}\
\
#button-container \{\
    display: grid;\
    grid-template-columns: 1fr 1fr;\
    gap: 15px;\
\}\
\
.btn \{\
    background-color: var(--button-color);\
    color: var(--text-color);\
    border: none;\
    padding: 15px 20px;\
    border-radius: 8px;\
    font-size: 1.1rem;\
    font-family: 'Poppins', sans-serif;\
    cursor: pointer;\
    transition: background-color 0.2s, transform 0.1s;\
\}\
\
.btn:hover \{\
    background-color: var(--button-hover);\
\}\
\
.btn:active \{\
    transform: scale(0.96);\
\}\
\
#restart-btn \{\
    background-color: var(--accent-color);\
    color: var(--primary-bg);\
    font-weight: 600;\
\}\
\
.hidden \{\
    display: none;\
\}\
\
/* Responsive Design */\
@media (max-width: 600px) \{\
    .app-container \{\
        padding: 25px;\
    \}\
\
    #question-text, #result-view h2 \{\
        font-size: 1.5rem;\
    \}\
\
    #result-text \{\
        font-size: 1.1rem;\
    \}\
\
    #button-container \{\
        grid-template-columns: 1fr;\
        gap: 10px;\
    \}\
\
    .btn \{\
        padding: 12px;\
        font-size: 1rem;\
    \}\
\}}
