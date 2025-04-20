const STORAGE_KEY = 'storyboards';
const scriptInput = document.getElementById('scriptInput');
const convertButton = document.getElementById('convertButton');
const statusElement = document.getElementById('status');

function createStoryboard(title) {
    return {
        id: Date.now().toString(),
        title: title,
        scenes: [],
        lastEdited: new Date().toISOString()
    };
}

function createScene(number) {
    return {
        id: Date.now().toString() + '-' + number,
        number: number,
        voScript: '',
        files: [], // Keep the files array even if not used by this tool directly
        notes: ''
    };
}

function getStoryboards() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error reading from storage:', error);
        // Return empty array on error to prevent breaking the app
        return [];
    }
}

function saveStoryboards(storyboards) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storyboards));
        return true; // Indicate success
    } catch (error) {
        console.error('Error saving to storage:', error);
        // Indicate failure - storage might be full or other issues
        return false;
    }
}

// --- Updated breakIntoScenes function ---
function breakIntoScenes(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('Invalid input: text must be a non-empty string');
    }

    // Use a clear delimiter like '---' on its own line to split scene blocks
    // Split by newline, three dashes, newline. Handles variations in whitespace around '---'.
    const sceneBlocks = text.split(/^\s*---\s*$/m)
        .map(block => block.trim())
        .filter(block => block); // Remove empty blocks

    if (sceneBlocks.length === 0) {
        throw new Error('No valid scene blocks found. Ensure blocks are separated by "---" on its own line.');
    }

    const storyboard = createStoryboard('Created via script');

    storyboard.scenes = sceneBlocks.map((block, index) => {
        const scene = createScene(index + 1);
        const lines = block.split('\n');
        let voScriptLineIndex = -1;
        let rawVoScript = '';
        let notesLines = [];

        // Find the "Script Segment:" line and separate voScript from notes
        for (let i = 0; i < lines.length; i++) {
            const trimmedLine = lines[i].trim();
            // Use startsWith for potentially more reliable matching than includes
            if (trimmedLine.toLowerCase().startsWith('script segment:')) {
                voScriptLineIndex = i;
                // Extract text after the colon, trim whitespace and quotes
                rawVoScript = lines[i].substring(lines[i].indexOf(':') + 1).trim();
                // Remove potential surrounding quotes ("...")
                if (rawVoScript.startsWith('"') && rawVoScript.endsWith('"')) {
                    rawVoScript = rawVoScript.substring(1, rawVoScript.length - 1);
                }
                break; // Found it, no need to check further lines for this
            }
        }

        // Assign extracted voScript
        scene.voScript = rawVoScript; // Assign the cleaned VO script

        // Collect all *other* lines for notes
        if (voScriptLineIndex !== -1) {
            notesLines = lines.filter((_, i) => i !== voScriptLineIndex);
        } else {
            // If "Script Segment:" was not found, treat the whole block as notes
            console.warn(`Scene ${index + 1}: "Script Segment:" line not found. Entire block added to notes.`);
            notesLines = lines;
        }

        // Join the notes lines back together, preserving line breaks, and trim final result
        scene.notes = notesLines.join('\n\n').trim();

        return scene;
    });

    // Get existing storyboards and add new one at the beginning
    const storyboards = getStoryboards();
    storyboards.unshift(storyboard);

    // Save updated storyboards (handle potential errors)
    if (!saveStoryboards(storyboards)) {
        // Throw an error if saving failed, so the user knows.
        throw new Error('Failed to save the storyboard to local storage. Storage might be full or inaccessible.');
    }

    // Return the number of scenes created for potential use in the status message
    return storyboard.scenes.length;
}
// --- End of Updated breakIntoScenes function ---


/* CSV Download functionality - commented out but preserved for future use
function arrayToCSV(scenes) {
    // ... (original commented out CSV code remains here) ...
}

function downloadCSV(csvString, filename = 'script_breakdown.csv') {
    // ... (original commented out CSV code remains here) ...
}
*/

function updateStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.className = isError ? 'error' : 'success';
}

// --- Updated 'click' event listener ---
convertButton.addEventListener('click', async () => {
    const text = scriptInput.value; // Get the raw value, trimming happens inside breakIntoScenes

    if (!text || text.trim() === '') {
        updateStatus('Please paste your structured script data before creating.', true);
        return;
    }
    convertButton.disabled = true;
    updateStatus('Processing your script data...');
    try {
        const numberOfScenes = breakIntoScenes(text); // Now returns the count
        updateStatus(`✅ Successfully created ${numberOfScenes} scenes! (Go to ⧉StoryboardPro and refresh)`);
    } catch (error) {
        console.error('Processing error:', error);
        // Provide more specific feedback if possible
        updateStatus(`❌ Error: ${error.message}`, true);
    } finally {
        convertButton.disabled = false;
    }
});
// --- End of Updated 'click' event listener ---


scriptInput.addEventListener('input', () => {
    // Clear status message when user types
    statusElement.textContent = '';
    statusElement.className = '';
});
