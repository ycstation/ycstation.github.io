document.addEventListener('DOMContentLoaded', function () {
    const gameContainer = document.getElementById('gameContainer');
    setupUI(gameContainer);

    const modal = document.getElementById("rulesModal");
    const span = document.getElementsByClassName("close-btn")[0];
    const rulesBtn = document.getElementById("rulesBtn");

    openModal();

    rulesBtn.onclick = function() {
        openModal();
    }

    span.onclick = function() {
        closeModal();
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    }
});

function openModal() {
    document.getElementById("rulesModal").style.display = "block";
}

function closeModal() {
    document.getElementById("rulesModal").style.display = "none";
}

let memorySlots = new Array(3).fill(null);
let pageRequests = generateRandomPageRequests(12, 5);
let pageFaults = 0;
let slotElements = [];
let requestElements = [];
let pageFaultText;
let nextPageIndex = 0;
let nextFrameIndex = 0;  

function generateRandomPageRequests(length, maxPageNumber) {
    let requests = [];
    let lastNumber = null; 

    for (let i = 0; i < length; i++) {
        let newPage;
        do {
            newPage = Math.floor(Math.random() * maxPageNumber) + 1;
        } while (newPage === lastNumber); 

        requests.push(newPage);
        lastNumber = newPage;  
    }
    return requests;
}

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


    if (memorySlots.includes(page)) {
        alert('Page ' + page + ' is already in memory! Drag it to the discard pile if you want to remove it.');
        return;
    }


    if (memorySlots.filter(slot => slot !== null).length < 3) {
        if (slotIndex !== memorySlots.filter(slot => slot !== null).length) {
            alert(`Please place the page in Frame ${memorySlots.filter(slot => slot !== null).length + 1} first.`);
            return;
        }

        memorySlots[slotIndex] = page;
        slotElements[slotIndex].textContent = page;
        pageFaults++; 
    } else { 
        if (slotIndex !== nextFrameIndex) {
            alert('Please replace the page in the oldest frame (' + (nextFrameIndex + 1) + ').');
            return;
        }

        memorySlots[nextFrameIndex] = page;
        slotElements[nextFrameIndex].textContent = page;
        nextFrameIndex = (nextFrameIndex + 1) % 3;
        pageFaults++; 
    }

    pageFaultText.textContent = 'Page Faults: ' + pageFaults;
    requestElements[index].remove(); 
    nextPageIndex = findNextPageIndex(); 
}

function findNextPageIndex() {
    for (let i = nextPageIndex; i < requestElements.length; i++) {
        if (requestElements[i] && requestElements[i].parentNode) {
            return i;
        }
    }
    return 0;
}

function discardDropHandler(event) {
    event.preventDefault();
    let page = event.dataTransfer.getData("text/plain");
    let index = parseInt(event.dataTransfer.getData("index"), 10);


    let dragSource = requestElements[index].parentNode.getAttribute('id');

    if (dragSource === 'queue') {

        if (memorySlots.includes(page)) { 

            let countInFrames = memorySlots.reduce((acc, curr) => acc + (curr === page ? 1 : 0), 0);

            let countInQueue = Array.from(document.querySelectorAll('.queue-container .box')).reduce((acc, curr) => acc + (curr.textContent.includes(`Page ${page}`) ? 1 : 0), 0);

            if (countInFrames + countInQueue > 1) { 
                requestElements[index].remove(); 
                
                if (index === nextPageIndex) {
                    nextPageIndex = findNextPageIndex();
                }
            } else {
                alert('This page is not a duplicate or is needed in memory!');
            }
        } else {
            alert('This page cannot be discarded as it is not in memory!');
        }
    } else if (dragSource === 'frames') {

        if (memorySlots.indexOf(page) !== -1) {
            memorySlots[memorySlots.indexOf(page)] = null; 
            updateMemorySlots(); 
            requestElements[index].remove(); 

            if (index === nextPageIndex) {
                nextPageIndex = findNextPageIndex(); 
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
