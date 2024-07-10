let memorySlots = new Array(3).fill(null);
let pageRequests = generateRandomPageRequests(12, 5);
let pageFaults = 0;
let slotElements = [];
let requestElements = [];
let pageFaultText;
let nextPageIndex = 0;
let nextFrameIndex = 0;  // Track the next frame to be filled in sequence

function generateRandomPageRequests(length, maxPageNumber) {
    let requests = [];
    let lastNumber = null;  // Track the last number added to the list

    for (let i = 0; i < length; i++) {
        let newPage;
        do {
            newPage = Math.floor(Math.random() * maxPageNumber) + 1;
        } while (newPage === lastNumber);  // Ensure the new page is not the same as the last one

        requests.push(newPage);
        lastNumber = newPage;  // Update the last number to the new page
    }
    return requests;
}


document.addEventListener('DOMContentLoaded', function () {
    const gameContainer = document.getElementById('gameContainer');
    setupUI(gameContainer);
});

function setupUI(container) {
    container.innerHTML = `
        <div style="color: white; font-size: 20px; font-family: 'Press Start 2P', sans-serif;">FIFO Memory Manager</div>
        <div id="pageFaults" style="color: white; font-size: 16px; font-family: 'Press Start 2P', sans-serif;">Page Faults: 0</div>
        <div id="frames" class="frame-container"></div>
        <div id="queue" class="queue-container"></div>
        <div id="discard" class="discard-container"></div>
    `;
    pageFaultText = document.getElementById('pageFaults');
    setupFrames(document.getElementById('frames'));
    setupQueue(document.getElementById('queue'));
    setupDiscardPile(document.getElementById('discard'));
}

function setupFrames(container) {
    for (let i = 0; i < 3; i++) {
        let frame = document.createElement('div');
        frame.className = 'frame';
        frame.innerHTML = `<div class="label" style="color: white;">Frame ${i + 1}</div>`;
        let slot = document.createElement('div');
        slot.className = 'box';
        slot.textContent = 'Empty';
        slot.addEventListener('dragover', allowDrop);
        slot.addEventListener('drop', function (event) { dropHandler(event, i); });
        frame.appendChild(slot);
        container.appendChild(frame);
        slotElements.push(slot);
    }
}

function setupQueue(container) {
    for (let i = 0; i < pageRequests.length; i++) {
        let btn = document.createElement('div');
        btn.className = 'box';
        btn.textContent = 'Page ' + pageRequests[i];
        btn.draggable = true;
        btn.addEventListener('dragstart', function (event) { dragStart(event, pageRequests[i], i); });
        container.appendChild(btn);
        requestElements.push(btn);
    }
}

function setupDiscardPile(container) {
    let discardSlot = document.createElement('div');
    discardSlot.className = 'box';
    discardSlot.textContent = 'Discard';
    discardSlot.addEventListener('dragover', allowDrop);
    discardSlot.addEventListener('drop', discardDropHandler);
    container.appendChild(discardSlot);
}

function allowDrop(event) {
    event.preventDefault();
}

function dragStart(event, page, index) {
    if (index !== nextPageIndex) {
        alert('You must load the pages in order!');
        event.preventDefault();
        return;
    }
    event.dataTransfer.setData("text/plain", page);
    event.dataTransfer.setData("index", index);
}

function dropHandler(event, slotIndex) {
    event.preventDefault();
    let page = event.dataTransfer.getData("text/plain");
    let index = parseInt(event.dataTransfer.getData("index"), 10);

    if (index !== nextPageIndex) {
        alert('You must load the pages in order!');
        return;
    }

    // Prevent placing a page if it's already present in any frame
    if (memorySlots.includes(page)) {
        alert('Page ' + page + ' is already in memory! Drag it to the discard pile if you want to remove it.');
        return;
    }

    // Enforce strict filling order when not all frames are filled
    if (memorySlots.filter(slot => slot !== null).length < 3) {
        if (slotIndex !== memorySlots.filter(slot => slot !== null).length) {
            alert(`Please place the page in Frame ${memorySlots.filter(slot => slot !== null).length + 1} first.`);
            return;
        }
        // Placing a page in an empty frame for the first time
        memorySlots[slotIndex] = page;
        slotElements[slotIndex].textContent = page;
        pageFaults++; // Increment page faults as the frame is filled for the first time
    } else { // All frames are filled, apply FIFO
        if (slotIndex !== nextFrameIndex) {
            alert('Please replace the page in the oldest frame (' + (nextFrameIndex + 1) + ').');
            return;
        }

        // Replace the oldest page as per FIFO rules and increment the page fault count
        memorySlots[nextFrameIndex] = page;
        slotElements[nextFrameIndex].textContent = page;
        nextFrameIndex = (nextFrameIndex + 1) % 3;
        pageFaults++; // Increment page faults for replacing a page
    }

    pageFaultText.textContent = 'Page Faults: ' + pageFaults; // Update the page fault count display
    requestElements[index].remove(); // Remove the page from the queue
    nextPageIndex = findNextPageIndex(); // Update to the next valid index
}

function findNextPageIndex() {
    for (let i = nextPageIndex; i < requestElements.length; i++) {
        if (requestElements[i] && requestElements[i].parentNode) {
            return i;
        }
    }
    return 0; // Reset to start or handle according to your needs
}




function discardDropHandler(event) {
    event.preventDefault();
    let page = event.dataTransfer.getData("text/plain");
    let index = parseInt(event.dataTransfer.getData("index"), 10);

    // Determine where the drag started (either from frames or queue)
    let dragSource = requestElements[index].parentNode.getAttribute('id');

    if (dragSource === 'queue') {
        // Attempting to discard from the queue
        if (memorySlots.includes(page)) { // Check if the page is in any frame
            // Count how many times this page appears in the frames
            let countInFrames = memorySlots.reduce((acc, curr) => acc + (curr === page ? 1 : 0), 0);
            // Count how many times this page appears in the queue
            let countInQueue = Array.from(document.querySelectorAll('.queue-container .box')).reduce((acc, curr) => acc + (curr.textContent.includes(`Page ${page}`) ? 1 : 0), 0);

            if (countInFrames + countInQueue > 1) { // Only allow discard if there are duplicates across frames and queue
                requestElements[index].remove(); // Remove the UI element
                // Correctly adjust nextPageIndex if necessary
                if (index === nextPageIndex) {
                    nextPageIndex = findNextPageIndex(); // Find the next valid index
                }
            } else {
                alert('This page is not a duplicate or is needed in memory!');
            }
        } else {
            alert('This page cannot be discarded as it is not in memory!');
        }
    } else if (dragSource === 'frames') {
        // Discarding directly from the frames
        if (memorySlots.indexOf(page) !== -1) {
            memorySlots[memorySlots.indexOf(page)] = null; // Remove the page from the frame
            updateMemorySlots(); // Update the display of frames
            requestElements[index].remove(); // Remove the UI element
            // Adjust nextPageIndex if necessary
            if (index === nextPageIndex) {
                nextPageIndex = findNextPageIndex(); // Find the next valid index
            }
        } else {
            alert('This page cannot be discarded as it is not in memory!');
        }
    } else {
        alert('Invalid discard action!');
    }
}




function updateMemorySlots() {
    for (let i = 0; i < 3; i++) {
        slotElements[i].textContent = memorySlots[i] || 'Empty';
    }
}
