document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM Element Selection
    const startScreen = document.getElementById('start-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultScreen = document.getElementById('result-screen');

    const startButton = document.getElementById('start-btn');
    const restartButton = document.getElementById('restart-btn');

    const questionText = document.getElementById('question-text');
    const yesButton = document.getElementById('yes-btn');
    const noButton = document.getElementById('no-btn');

    const resultText = document.getElementById('result-text');

    // 2. Flowchart and Results Data
    const flowchart = {
        'start': {
            type: 'question',
            text: 'Is your facial skin dry?',
            yes: 'q_moisturizer',
            no: 'q_allergy'
        },
        'q_moisturizer': {
            type: 'question',
            text: 'Do you use a face moisturizer?',
            yes: 'q_water',
            no: 'r_sf' // Result: Start using face moisturizer
        },
        'q_water': {
            type: 'question',
            text: 'Do you drink around 3 liters of water daily?',
            yes: 'r_cd1', // Result: Consult dermatologist
            no: 'r_sd'  // Result: Start drinking water
        },
        'q_allergy': {
            type: 'question',
            text: 'Do you have an allergy to something?',
            yes: 'r_af', // Result: Use allergy-friendly products
            no: 'q_oily'
        },
        'q_oily': {
            type: 'question',
            text: 'Do you eat oily food?',
            yes: 'r_sb', // Result: Start balanced diet
            no: 'r_cd2'  // Result: Consult dermatologist
        }
    };

    const results = {
        'r_sf': 'You should start using a face moisturizer to combat dryness.',
        'r_sd': 'You should start drinking around 3 liters of water every day to improve skin hydration.',
        'r_cd1': 'You are following good habits, but dryness persists. It is best to consult a dermatologist for a professional diagnosis.',
        'r_af': 'To avoid skin reactions, you should use allergy-friendly products.',
        'r_sb': 'Excessive oily food can affect your skin. You should start eating a more balanced diet.',
        'r_cd2': 'Since common external factors have been ruled out, you should consult a dermatologist to identify the underlying issue.'
    };

    let currentNodeId;

    // 3. Core Functions
    function startGame() {
        startScreen.classList.add('hidden');
        resultScreen.classList.add('hidden');
        quizScreen.classList.remove('hidden');
        currentNodeId = 'start';
        displayNode(currentNodeId);
    }

    function displayNode(nodeId) {
        const node = flowchart[nodeId];

        // Check if the node ID corresponds to a question or a result
        if (node && node.type === 'question') {
            questionText.textContent = node.text;
        } else {
            // If it's not a question, it must be a result ID
            showResult(nodeId);
        }
    }

    function handleAnswer(answer) {
        const currentNode = flowchart[currentNodeId];
        const nextNodeId = answer ? currentNode.yes : currentNode.no;

        // Add visual feedback for transition
        quizScreen.classList.add('fade-out');

        // Wait for the fade-out transition to complete before changing content
        setTimeout(() => {
            currentNodeId = nextNodeId;
            displayNode(currentNodeId);
            // Fade back in
            quizScreen.classList.remove('fade-out');
        }, 400); // This duration should match the CSS transition
    }

    function showResult(resultId) {
        quizScreen.classList.add('hidden');
        resultScreen.classList.remove('hidden');
        resultText.textContent = results[resultId];
    }

    function restartGame() {
        resultScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    }

    // 4. Event Listeners
    startButton.addEventListener('click', startGame);
    yesButton.addEventListener('click', () => handleAnswer(true));
    noButton.addEventListener('click', () => handleAnswer(false));
    restartButton.addEventListener('click', restartGame);
});
