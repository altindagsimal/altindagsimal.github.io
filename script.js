document.addEventListener('DOMContentLoaded', () => {

    // --- DATA: All book recommendations based on the flowchart ---
    const recommendations = {
        'B': { // Beginner
            'U': { // Under 150 pages
                'L': ["The Little Prince – Antoine de Saint-Exupéry (~100 pages)", "The Kreutzer Sonata – Leo Tolstoy (~100 pages)"],
                'D': ["The Old Man and the Sea – Ernest Hemingway (~120 pages)", "The Death of Ivan Ilyich – Tolstoy (~100 pages)"],
                'S': ["Animal Farm – George Orwell (~110 pages)", "The Pearl – Steinbeck (~90 pages)"],
                'P': ["The Stranger – Albert Camus (~120 pages)", "The Metamorphosis – Kafka (~60 pages)"]
            },
            'V': { // 150-300 pages
                'L': ["Breakfast at Tiffany's – Truman Capote (~180 pages)", "A Room with a View – E.M. Forster (~220 pages)"],
                'D': ["Of Mice and Men – John Steinbeck (~180 pages)", "Lord of the Flies – William Golding (~200 pages)"],
                'S': ["Fahrenheit 451 – Ray Bradbury (~190 pages)", "Anthem – Ayn Rand (~150 pages)"],
                'P': ["Siddhartha – Hermann Hesse (~160 pages)", "Demian – Hermann Hesse (~200 pages)"]
            }
        },
        'I': { // Intermediate
            'V': { // 150-300 pages
                'L': ["Madame Bovary – Gustave Flaubert (~250 pages)", "A Room with a View – E.M. Forster (~220 pages)"],
                'D': ["The Bell Jar – Sylvia Plath (~250 pages)", "The Catcher in the Rye – J.D. Salinger (~230 pages)"],
                'S': ["The Trial – Franz Kafka (~240 pages)", "Native Son – Richard Wright (abridged) (~280 pages)"],
                'P': ["Demian – Hermann Hesse (~250 pages)", "Steppenwolf – Hermann Hesse (simplified) (~270 pages)"]
            },
            'W': { // 300-500 pages
                'L': ["The Age of Innocence – Edith Wharton (~320 pages)", "Jane Eyre – Charlotte Brontë (~400 pages)"],
                'D': ["Crime and Punishment – Dostoyevsky (~430 pages)", "Jude the Obscure – Thomas Hardy (~450 pages)"],
                'S': ["The Grapes of Wrath – John Steinbeck (~470 pages)", "Oliver Twist – Charles Dickens (~430 pages)"],
                'P': ["The Plague – Albert Camus (~320 pages)", "Brave New World – Aldous Huxley (~300 pages)"]
            }
        },
        'A': { // Advanced
            'Z': { // Over 500 pages
                'L': ["Anna Karenina – Leo Tolstoy (abridged version) (~500 pages)", "Wuthering Heights – Emily Brontë (~400 pages)"],
                'D': ["The Brothers Karamazov – Dostoyevsky (~800+ in most editions)", "The Idiot – Dostoyevsky (~500 pages)"],
                'S': ["Bleak House – Charles Dickens (~500 pages)", "Les Misérables – Victor Hugo (partial edition) (~480 pages)"],
                'P': ["The Magic Mountain – Thomas Mann (~700 pages)", "War and Peace – Leo Tolstoy (~1,200 pages)"]
            }
        }
    };

    // --- STATE: To store user's choices ---
    const userChoices = {
        level: null,
        length: null,
        genre: null
    };

    // --- DOM Element References ---
    const introSection = document.getElementById('intro-section');
    const startButton = document.getElementById('start-btn');
    const levelSection = document.getElementById('level-selection');
    const lengthSection = document.getElementById('length-selection');
    const genreSection = document.getElementById('genre-selection');
    const resultsSection = document.getElementById('results');
    const bookList = document.getElementById('book-list');
    const resetButton = document.getElementById('reset-btn');

    // --- EVENT LISTENERS (using event delegation) ---
    startButton.addEventListener('click', startApp);
    levelSection.addEventListener('click', handleLevelChoice);
    lengthSection.addEventListener('click', handleLengthChoice);
    genreSection.addEventListener('click', handleGenreChoice);
    resetButton.addEventListener('click', resetApp);

    // --- HANDLER FUNCTIONS ---
    function startApp() {
        transitionToSection(introSection, levelSection);
    }

    function handleLevelChoice(event) {
        if (!event.target.classList.contains('choice-btn')) return;

        userChoices.level = event.target.dataset.value;
        updateLengthOptions(userChoices.level);
        transitionToSection(levelSection, lengthSection);
    }

    function handleLengthChoice(event) {
        if (!event.target.classList.contains('choice-btn')) return;

        userChoices.length = event.target.dataset.value;
        transitionToSection(lengthSection, genreSection);
    }

    function handleGenreChoice(event) {
        if (!event.target.classList.contains('choice-btn')) return;

        userChoices.genre = event.target.dataset.value;
        displayResults();
        transitionToSection(genreSection, resultsSection);
    }

    // --- LOGIC FUNCTIONS ---

    // Filter available length options based on chosen level
    function updateLengthOptions(level) {
        const validLengths = Object.keys(recommendations[level]);
        const allLengthButtons = lengthSection.querySelectorAll('.choice-btn');

        allLengthButtons.forEach(button => {
            if (validLengths.includes(button.dataset.value)) {
                button.classList.remove('hidden');
            } else {
                button.classList.add('hidden');
            }
        });
    }

    // Display the final results
    function displayResults() {
        const { level, length, genre } = userChoices;
        const books = recommendations[level]?.[length]?.[genre];

        bookList.innerHTML = ''; // Clear previous results

        if (books && books.length > 0) {
            books.forEach(bookString => {
                const [title, author] = bookString.split(' – ');
                const listItem = document.createElement('div');
                listItem.className = 'book-item';
                listItem.innerHTML = `
                    <div class="book-title">${title}</div>
                    <div class="book-author">${author}</div>
                `;
                bookList.appendChild(listItem);
            });
        } else {
            // Error message if no combination is found (for robustness)
            const errorItem = document.createElement('div');
            errorItem.className = 'book-item';
            errorItem.textContent = 'Sorry, no recommendations found for this combination. Please try again.';
            bookList.appendChild(errorItem);
        }
    }
    
    // Smoothly transition between sections
    function transitionToSection(fromSection, toSection) {
        fromSection.classList.add('hidden');
        toSection.classList.remove('hidden');
    }

    // Reset the application to the start
    function resetApp() {
        userChoices.level = null;
        userChoices.length = null;
        userChoices.genre = null;

        transitionToSection(resultsSection, introSection);
        // Hide other sections just in case
        levelSection.classList.add('hidden');
        lengthSection.classList.add('hidden');
        genreSection.classList.add('hidden');
    }
});
