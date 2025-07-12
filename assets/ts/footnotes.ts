import { createPopper, Instance as PopperInstance } from '@popperjs/core';

// Function to decode HTML entities
function decodeHTMLEntities(text: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

export function setupFootnotes() {
    // Delay slightly to ensure DOM is fully rendered
    setTimeout(() => {
        const footnotes = document.querySelectorAll('.inline-footnote');
        
        footnotes.forEach((footnote) => {
            const sup = footnote.querySelector('.footnote-number') as HTMLElement;
            if (!sup) return;

            // Only open popup when clicking the <sup>
            sup.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePopup(footnote as HTMLElement);
            });
        });

        // Global event listeners for closing popups
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.footnote-popup') && !target.closest('.inline-footnote')) {
                closeAllPopups();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAllPopups();
            }
        });
    }, 100);
}

function togglePopup(footnote: HTMLElement) {
    const existingPopup = document.querySelector('.footnote-popup');
    if (existingPopup) {
        closeAllPopups();
        openPopup(footnote);
    } else {
        openPopup(footnote);
    }
}

let currentPopper: PopperInstance | null = null;

function openPopup(footnote: HTMLElement) {
    closeAllPopups();
    const content = footnote.getAttribute('data-footnote-content');
    if (!content) return;
    const popup = document.createElement('div');
    popup.className = 'footnote-popup active';
    const contentDiv = document.createElement('div');
    contentDiv.className = 'footnote-content';
    const decodedContent = decodeHTMLEntities(content);
    contentDiv.innerHTML = decodedContent;
    const closeBtn = document.createElement('div');
    closeBtn.className = 'footnote-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllPopups();
    });
    popup.appendChild(contentDiv);
    popup.appendChild(closeBtn);
    document.body.appendChild(popup);
    // Use Popper.js for positioning
    const sup = footnote.querySelector('.footnote-number') as HTMLElement;
    if (sup) {
        currentPopper = createPopper(sup, popup, {
            placement: 'top',
            modifiers: [
                { name: 'offset', options: { offset: [0, 8] } },
                { name: 'preventOverflow', options: { boundary: 'viewport' } },
                { name: 'flip', options: { fallbackPlacements: ['bottom', 'right', 'left'] } },
            ],
        });
    }
    popup.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function closeAllPopups() {
    document.querySelectorAll('.footnote-popup').forEach(popup => {
        popup.remove();
    });
    if (currentPopper) {
        currentPopper.destroy();
        currentPopper = null;
    }
}

function populateFootnotesWidget() {
    const widgetList = document.querySelector('.widget--footnotes .footnotes-list');
    if (!widgetList) return;
    // Clear any existing content
    widgetList.innerHTML = '';
    const footnotes = document.querySelectorAll('.inline-footnote');
    footnotes.forEach((footnote) => {
        const id = footnote.getAttribute('data-footnote-id');
        const content = footnote.getAttribute('data-footnote-content');
        if (!id || !content) return;
        const li = document.createElement('li');
        li.id = id;
        li.className = 'footnote-item';
        li.innerHTML = decodeHTMLEntities(content);
        widgetList.appendChild(li);
    });
    
    // Set up alignment after populating
    alignFootnotesWidget();
}

function alignFootnotesWidget() {
    const widgetList = document.querySelector('.widget--footnotes .footnotes-list');
    if (!widgetList) return;
    
    const footnotes = document.querySelectorAll('.inline-footnote');
    const footnoteItems = widgetList.querySelectorAll('.footnote-item');
    
    // First pass: calculate initial positions
    const positions: { top: number; height: number; element: HTMLElement }[] = [];
    
    footnotes.forEach((footnote, index) => {
        const sup = footnote.querySelector('.footnote-number') as HTMLElement;
        const footnoteItem = footnoteItems[index] as HTMLElement;
        
        if (!sup || !footnoteItem) return;
        
        // Calculate the Y-coordinate relative to the viewport
        const supRect = sup.getBoundingClientRect();
        const widgetRect = widgetList.getBoundingClientRect();
        
        // Calculate the relative position within the sidebar widget
        const relativeY = supRect.top - widgetRect.top;
        
        // Get the height of the footnote item
        const itemHeight = footnoteItem.offsetHeight || 50; // fallback height
        
        positions.push({
            top: relativeY,
            height: itemHeight,
            element: footnoteItem
        });
    });
    
    // Second pass: resolve overlaps
    const minSpacing = 10; // minimum spacing between items in pixels
    
    for (let i = 1; i < positions.length; i++) {
        const current = positions[i];
        const previous = positions[i - 1];
        
        // Check if current item overlaps with previous item
        const currentTop = current.top;
        const previousBottom = previous.top + previous.height;
        
        if (currentTop < previousBottom + minSpacing) {
            // Adjust current item position to avoid overlap
            current.top = previousBottom + minSpacing;
        }
    }
    
    // Third pass: apply final positions
    positions.forEach(({ top, element }) => {
        element.style.position = 'absolute';
        element.style.top = `${top}px`;
        element.style.transform = 'translateY(-50%)'; // Center vertically on the target position
    });
}

function updateFootnotesAlignment() {
    alignFootnotesWidget();
}

// Call both setupFootnotes and populateFootnotesWidget on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupFootnotes();
        populateFootnotesWidget();
        
        // Add scroll event listener to maintain alignment
        window.addEventListener('scroll', updateFootnotesAlignment);
        window.addEventListener('resize', updateFootnotesAlignment);
    });
} else {
    setupFootnotes();
    populateFootnotesWidget();
    
    // Add scroll event listener to maintain alignment
    window.addEventListener('scroll', updateFootnotesAlignment);
    window.addEventListener('resize', updateFootnotesAlignment);
} 