/**
 * PixelFont - Shared pixel font data for rendering "Pixellence" as pixel art
 * Each letter is defined on a 5x7 (or 3x7) grid using '#' for filled pixels
 */

export const pixelFont = {
    'P': [
        '####.',
        '#...#',
        '#...#',
        '####.',
        '#....',
        '#....',
        '#....',
    ],
    'i': [
        '.#.',
        '...',
        '.#.',
        '.#.',
        '.#.',
        '.#.',
        '.#.',
    ],
    'x': [
        '.....',
        '.....',
        '#...#',
        '.#.#.',
        '..#..',
        '.#.#.',
        '#...#',
    ],
    'e': [
        '.....',
        '.....',
        '.###.',
        '#...#',
        '#####',
        '#....',
        '.####',
    ],
    'l': [
        '.#.',
        '.#.',
        '.#.',
        '.#.',
        '.#.',
        '.#.',
        '.##',
    ],
    'n': [
        '.....',
        '.....',
        '#.##.',
        '##..#',
        '#...#',
        '#...#',
        '#...#',
    ],
    'c': [
        '.....',
        '.....',
        '.###.',
        '#...#',
        '#....',
        '#...#',
        '.###.',
    ],
};

export const letterWidths = { 'P': 5, 'i': 3, 'x': 5, 'e': 5, 'l': 3, 'n': 5, 'c': 5 };

/**
 * Build pixel text data for a given title string.
 * Returns an array of { x, y, size, color } objects for each filled pixel.
 *
 * @param {string} title - Text to render (must use letters defined in pixelFont)
 * @param {number} centerX - Horizontal center position
 * @param {number} centerY - Vertical center position
 * @param {number} pixelSize - Size of each pixel square
 * @param {number[]} colors - Array of colors to cycle through per character
 * @returns {{ x: number, y: number, size: number, color: number }[]}
 */
export function buildPixelText(title, centerX, centerY, pixelSize, colors) {
    const spacing = 2;

    // Calculate total width
    let totalWidth = 0;
    for (const ch of title) {
        totalWidth += (letterWidths[ch] || 5) * pixelSize + spacing * pixelSize;
    }
    totalWidth -= spacing * pixelSize;

    const startX = centerX - totalWidth / 2;
    const startY = centerY - (7 * pixelSize) / 2;

    const pixels = [];
    let cursorX = startX;

    for (let charIdx = 0; charIdx < title.length; charIdx++) {
        const ch = title[charIdx];
        const charMap = pixelFont[ch];
        if (!charMap) continue;

        const color = colors[charIdx % colors.length];

        for (let row = 0; row < charMap.length; row++) {
            for (let col = 0; col < charMap[row].length; col++) {
                if (charMap[row][col] === '#') {
                    pixels.push({
                        x: cursorX + col * pixelSize,
                        y: startY + row * pixelSize,
                        size: pixelSize,
                        color: color
                    });
                }
            }
        }

        cursorX += (letterWidths[ch] || 5) * pixelSize + spacing * pixelSize;
    }

    return pixels;
}
