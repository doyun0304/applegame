document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    cancelSelection();
});

const board = document.getElementById("game-board");
const btnReset = document.getElementById("btnReset");
const btnHint = document.getElementById("btnHint");
const btnShop = document.getElementById("btnShop");
const btnCloseShop = document.getElementById("btnCloseShop");
const shopOverlay = document.getElementById("shop-overlay");
const shopItemsContainer = document.getElementById("shop-items");
const gameoverOverlay = document.getElementById("gameover-overlay");
const btnPlayAgain = document.getElementById("btnPlayAgain");
const lblFinalScore = document.getElementById("lblFinalScore");
const lblFinalGold = document.getElementById("lblFinalGold");
const lblScore = document.getElementById("lblScore");
const lblTime = document.getElementById("lblTime");
const lblHintCount = document.getElementById("lblHintCount");
const lblGold = document.getElementById("lblGold");
const lblShopGold = document.getElementById("lblShopGold");
const debugPanel = document.getElementById("debug-panel");
const btnCloseDebug = document.getElementById("btnCloseDebug");
const inputDebugGold = document.getElementById("inputDebugGold");
const btnSetGold = document.getElementById("btnSetGold");
const debugUpgradesContainer = document.getElementById("debug-upgrades");
const btnDebugReroll = document.getElementById("btnDebugReroll");
const chkInfiniteTime = document.getElementById("chkInfiniteTime");
const chkInfiniteHint = document.getElementById("chkInfiniteHint");
let infiniteTime = false;
let infiniteHint = false;
const rows = 9;
const cols = 18;
const baseGameTime = 120;
const baseJokerCnt = 5;
const baseHintCnt = 3;

const GOLD_KEY = "appleGame_gold";
const UPGRADE_KEY = "appleGame_upgrades";
const shopItems = [
    { id: "hint", icon: "💡", name: "힌트 +1", desc: "판마다 사용 가능한 힌트 횟수가 1 증가합니다.", baseCost: 50, growth: 1.7, maxLevel: 5 },
    { id: "time", icon: "⏱️", name: "시간 +10초", desc: "게임 시작 시간이 10초 증가합니다.", baseCost: 60, growth: 1.7, maxLevel: 5 },
    { id: "joker", icon: "🃏", name: "조커 +1", desc: "조커(와일드) 칸 개수가 1 증가합니다.", baseCost: 90, growth: 1.8, maxLevel: 5 },
];

let gameCnt = 0;
let score = 0;
let gameEnded = false;
let gold = loadGold();
let upgrades = loadUpgrades();
let hintCnt = baseHintCnt;
let hintGroups = []; // 각 원소는 힌트 한 번에 표시된 칸들의 배열
let grid = [];
let selectionBox = null;
let startX = 0, startY = 0;
let highlightedCells = [];

function getMaxHintCnt() {
    return baseHintCnt + upgrades.hint;
}

function getGameTime() {
    return baseGameTime + upgrades.time * 10;
}

function getJokerCnt() {
    return baseJokerCnt + upgrades.joker;
}

function loadGold() {
    const value = parseInt(localStorage.getItem(GOLD_KEY));
    return Number.isNaN(value) ? 0 : value;
}

function saveGold() {
    localStorage.setItem(GOLD_KEY, String(gold));
}

function addGold(amount) {
    gold += amount;
    saveGold();
    updateGoldLabel();
}

function updateGoldLabel() {
    lblGold.innerText = gold;
    lblShopGold.innerText = gold;
}

function loadUpgrades() {
    try {
        return { hint: 0, time: 0, joker: 0, ...JSON.parse(localStorage.getItem(UPGRADE_KEY)) };
    } catch (e) {
        return { hint: 0, time: 0, joker: 0 };
    }
}

function saveUpgrades() {
    localStorage.setItem(UPGRADE_KEY, JSON.stringify(upgrades));
}

function getItemCost(item) {
    return Math.round(item.baseCost * Math.pow(item.growth, upgrades[item.id]));
}

function renderShop() {
    shopItemsContainer.innerHTML = "";
    shopItems.forEach((item) => {
        const level = upgrades[item.id];
        const maxed = level >= item.maxLevel;
        const cost = getItemCost(item);
        const canBuy = !maxed && gold >= cost;

        const div = document.createElement("div");
        div.classList.add("shop-item");
        div.innerHTML = `
            <div class="shop-item-info">
                <span class="shop-item-name">${item.icon} ${item.name}</span>
                <span class="shop-item-desc">${item.desc}</span>
                <span class="shop-item-level">Lv. ${level}/${item.maxLevel}</span>
            </div>
            <button class="shop-item-buy" data-id="${item.id}" ${canBuy ? "" : "disabled"}>
                ${maxed ? "MAX" : `${cost} 🪙`}
            </button>
        `;
        shopItemsContainer.appendChild(div);
    });
}

shopItemsContainer.addEventListener("click", (event) => {
    const btn = event.target.closest(".shop-item-buy");
    if (!btn || btn.disabled) return;

    const item = shopItems.find((i) => i.id === btn.dataset.id);
    const cost = getItemCost(item);
    if (upgrades[item.id] >= item.maxLevel || gold < cost) return;

    gold -= cost;
    upgrades[item.id] += 1;
    saveGold();
    saveUpgrades();
    updateGoldLabel();
    renderShop();
});

btnShop.addEventListener("click", () => {
    renderShop();
    shopOverlay.classList.add("open");
});

btnCloseShop.addEventListener("click", () => {
    shopOverlay.classList.remove("open");
});

shopOverlay.addEventListener("click", (event) => {
    if (event.target === shopOverlay) shopOverlay.classList.remove("open");
});

// 디버그 모드: Q, W, O, P 동시 입력
const debugComboKeys = ["q", "w", "o", "p"];
const pressedKeys = new Set();
let debugComboTriggered = false;

document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (!debugComboKeys.includes(key)) return;
    pressedKeys.add(key);

    const allPressed = debugComboKeys.every((k) => pressedKeys.has(k));
    if (allPressed && !debugComboTriggered) {
        debugComboTriggered = true;
        toggleDebugPanel();
    }
});

document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    pressedKeys.delete(key);
    if (!debugComboKeys.every((k) => pressedKeys.has(k))) {
        debugComboTriggered = false;
    }
});

function toggleDebugPanel() {
    if (debugPanel.classList.contains("open")) {
        debugPanel.classList.remove("open");
    } else {
        renderDebugPanel();
        debugPanel.classList.add("open");
    }
}

function renderDebugPanel() {
    inputDebugGold.value = gold;
    chkInfiniteTime.checked = infiniteTime;
    chkInfiniteHint.checked = infiniteHint;

    debugUpgradesContainer.innerHTML = "";
    shopItems.forEach((item) => {
        const level = upgrades[item.id];
        const row = document.createElement("div");
        row.classList.add("debug-upgrade-row");
        row.innerHTML = `
            <span class="debug-upgrade-name">${item.icon} ${item.name}</span>
            <div class="debug-upgrade-controls">
                <button class="debug-dec" data-id="${item.id}" ${level <= 0 ? "disabled" : ""}>-</button>
                <span class="debug-upgrade-level">${level}</span>
                <button class="debug-inc" data-id="${item.id}" ${level >= item.maxLevel ? "disabled" : ""}>+</button>
            </div>
        `;
        debugUpgradesContainer.appendChild(row);
    });
}

debugUpgradesContainer.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn || btn.disabled) return;

    const item = shopItems.find((i) => i.id === btn.dataset.id);
    if (!item) return;

    if (btn.classList.contains("debug-inc") && upgrades[item.id] < item.maxLevel) {
        upgrades[item.id] += 1;
    } else if (btn.classList.contains("debug-dec") && upgrades[item.id] > 0) {
        upgrades[item.id] -= 1;
    } else {
        return;
    }

    saveUpgrades();
    if (item.id === "hint") {
        hintCnt = getMaxHintCnt();
        updateHintLabel();
    }
    renderDebugPanel();
});

btnSetGold.addEventListener("click", () => {
    const value = parseInt(inputDebugGold.value);
    gold = Number.isNaN(value) ? 0 : value;
    saveGold();
    updateGoldLabel();
});

btnCloseDebug.addEventListener("click", () => {
    debugPanel.classList.remove("open");
});

btnDebugReroll.addEventListener("click", () => {
    resetBoard();
});

chkInfiniteTime.addEventListener("change", () => {
    infiniteTime = chkInfiniteTime.checked;
});

chkInfiniteHint.addEventListener("change", () => {
    infiniteHint = chkInfiniteHint.checked;
    updateHintLabel();
});

updateGoldLabel();

// 랜덤 숫자 생성 (1~9)
function getRandomNumber() {
    return Math.floor(Math.random() * 9)+1;
}

// 격자 생성
function createBoard() {
    board.innerHTML = ""; // 기존 보드 초기화
    grid = []; // 기존 데이터 초기화

    for (let r = 0; r < rows; r++) {
        let row = [];
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            board.appendChild(cell);
            row.push(cell);
        }
        grid.push(row);
    }
    resetBoard();
}

function resetBoard() {
    score = 0;
    gameEnded = false;
    lblScore.innerText = score;
    // 숫자 배치
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const newNum = getRandomNumber();
            grid[r][c].textContent = newNum;
            grid[r][c].dataset.value = newNum;
            if(grid[r][c].classList.contains("erased"))
                grid[r][c].classList.remove("erased");
        }
    }
    // 조커 배치
    const jokerCnt = getJokerCnt();
    let randomArr = []
    for(let i=0; i<cols * rows; i++) randomArr.push(i);
    for(let idx = cols*rows; idx>cols*rows-jokerCnt; idx--){
        let randomNum = Math.floor(Math.random() * idx);
        const num = randomArr[randomNum];
        const r = Math.floor(num/cols);
        const c = num%cols;
        grid[r][c].textContent = '';
        grid[r][c].dataset.value = 0;
        randomArr[randomNum] = randomArr[idx];
    }

    gameCnt++;
    const gameTime = getGameTime();
    gameTimer(new Date(Date.now() + gameTime*1000), 1000, gameTime, gameCnt);

    hintCnt = getMaxHintCnt();
    updateHintLabel();
    clearAllHints();
}

// 표시 중인 모든 힌트를 제거
function clearAllHints() {
    hintGroups.forEach((group) => group.forEach((cell) => cell.classList.remove("hint")));
    hintGroups = [];
}

// 힌트 칸 중 일부가 다른 조합으로 지워지면 그 힌트 그룹 전체를 해제
function breakHintGroupsContaining(cells) {
    const cellSet = new Set(cells);
    hintGroups = hintGroups.filter((group) => {
        const touched = group.some((cell) => cellSet.has(cell));
        if (touched) {
            group.forEach((cell) => cell.classList.remove("hint"));
            return false;
        }
        return true;
    });
}

function getHintedCells() {
    return new Set(hintGroups.flat());
}

// 마우스 클릭 시 시작점 저장 & 직사각형 생성
board.addEventListener("mousedown", (event) => {
    if (gameEnded || event.button !== 0) return;
    console.log("mousedown");
    startX = event.clientX;
    startY = event.clientY;

    selectionBox = document.createElement("div");
    selectionBox.classList.add("selection-box");
    document.body.appendChild(selectionBox);

    updateSelectionBox(startX, startY, startX, startY);

    clearHighlights();
});

// 마우스 이동 시 직사각형 크기 업데이트
document.addEventListener("mousemove", (event) => {
    if (!selectionBox) return;
    updateSelectionBox(startX, startY, event.clientX, event.clientY);
    highlightCells(startX, startY, event.clientX, event.clientY);
});

// 마우스 뗄 때 직사각형 확정
document.addEventListener("mouseup", () => {
    if (selectionBox) {
        selectionBox.remove(); // 직사각형 제거
        selectionBox = null;   // 직사각형 객체 초기화
    }
    if(checkSum()){
        eraseHighlights();
    }
    clearHighlights();
});

// 드래그 중 선택 취소
function cancelSelection() {
    if (selectionBox) {
        selectionBox.remove();
        selectionBox = null;
    }
    clearHighlights();
}

// 직사각형 위치 & 크기 업데이트 함수
function updateSelectionBox(x1, y1, x2, y2) {
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x1 - x2);
    const height = Math.abs(y1 - y2);

    selectionBox.style.left = left + "px";
    selectionBox.style.top = top + "px";
    selectionBox.style.width = width + "px";
    selectionBox.style.height = height + "px";
}

function highlightCells(x1, y1, x2, y2) {
    clearHighlights();  // 기존 하이라이트 제거

    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const right = Math.max(x1, x2);
    const bottom = Math.max(y1, y2);

    // 각 격자칸을 순회하며 직사각형 영역 안에 있는지 확인
    const cells = document.querySelectorAll(".cell");
    cells.forEach((cell) => {
        if(cell.classList.contains("erased")) return;
        const rect = cell.getBoundingClientRect();
        if (
            rect.right >= left && rect.bottom >= top &&
            rect.left <= right && rect.top <= bottom
        ) {
            cell.classList.add("highlight"); // 하이라이트 적용
            highlightedCells.push(cell);
        }
    });
}

function eraseHighlights(){
    console.log("eraseHighlights()");
    highlightedCells.forEach((cell)=>{
        cell.classList.add("erased");
        score = score + 1;
    });
    breakHintGroupsContaining(highlightedCells);
    lblScore.innerText = score;

    if (score == rows*cols) {
        gameClear();
    } else if (!hasRemainingJoker() && !findHintRect(new Set())) {
        console.log("남은 조커 없음, 지울 수 있는 조합 없음 - 조기 종료");
        endGame("no-moves");
    }
}

// 지워지지 않은 조커(값이 0인 칸)가 남아있는지 확인
function hasRemainingJoker() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = grid[r][c];
            if (!cell.classList.contains("erased") && cell.dataset.value == 0) return true;
        }
    }
    return false;
}

function checkSum() {
    let flag = false;
    let sum = 0;
    highlightedCells.forEach((cell) =>{
        if(cell.dataset.value==0) flag = true;
        sum = sum + parseInt(cell.dataset.value);
    });
    console.log(`sum: ${sum}`);
    return sum==10 || (flag && sum <=10 && highlightedCells.length >= 2);
}

// 합이 10이 되는(또는 조커 포함 10 이하) 가장 작은 직사각형 영역을 탐색
// excludedCells에 포함된 칸이 하나라도 겹치는 영역은 제외
function findHintRect(excludedCells) {
    // 접두합(prefix sum)으로 임의의 직사각형 합을 O(1)에 계산
    const prefixVal = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
    const prefixJoker = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
    const prefixCnt = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
    const prefixExcluded = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = grid[r][c];
            const erased = cell.classList.contains("erased");
            const val = erased ? 0 : parseInt(cell.dataset.value);
            const isJoker = !erased && val === 0;
            const isExcluded = excludedCells.has(cell);

            prefixVal[r + 1][c + 1] = val + prefixVal[r][c + 1] + prefixVal[r + 1][c] - prefixVal[r][c];
            prefixJoker[r + 1][c + 1] = (isJoker ? 1 : 0) + prefixJoker[r][c + 1] + prefixJoker[r + 1][c] - prefixJoker[r][c];
            prefixCnt[r + 1][c + 1] = (erased ? 0 : 1) + prefixCnt[r][c + 1] + prefixCnt[r + 1][c] - prefixCnt[r][c];
            prefixExcluded[r + 1][c + 1] = (isExcluded ? 1 : 0) + prefixExcluded[r][c + 1] + prefixExcluded[r + 1][c] - prefixExcluded[r][c];
        }
    }

    const rangeSum = (prefix, r1, c1, r2, c2) =>
        prefix[r2 + 1][c2 + 1] - prefix[r1][c2 + 1] - prefix[r2 + 1][c1] + prefix[r1][c1];

    let bestCellCnt = null;
    let candidates = [];
    for (let r1 = 0; r1 < rows; r1++) {
        for (let r2 = r1; r2 < rows; r2++) {
            for (let c1 = 0; c1 < cols; c1++) {
                for (let c2 = c1; c2 < cols; c2++) {
                    const cellCnt = rangeSum(prefixCnt, r1, c1, r2, c2);
                    if (cellCnt === 0) continue;

                    const excludedInRect = rangeSum(prefixExcluded, r1, c1, r2, c2);
                    if (excludedInRect > 0) continue;

                    const sum = rangeSum(prefixVal, r1, c1, r2, c2);
                    const jokerInRect = rangeSum(prefixJoker, r1, c1, r2, c2);
                    const valid = jokerInRect === 0 && sum === 10;
                    if (!valid) continue;

                    if (bestCellCnt === null || cellCnt < bestCellCnt) {
                        bestCellCnt = cellCnt;
                        candidates = [{ r1, c1, r2, c2, cellCnt }];
                    } else if (cellCnt === bestCellCnt) {
                        candidates.push({ r1, c1, r2, c2, cellCnt });
                    }
                }
            }
        }
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

btnHint.addEventListener("click", () => {
    if (gameEnded || (!infiniteHint && hintCnt <= 0)) return;

    const rect = findHintRect(getHintedCells());
    if (!rect) {
        console.log("표시할 새 힌트를 찾을 수 없습니다.");
        flashNoHint();
        return;
    }

    if (!infiniteHint) {
        hintCnt--;
        updateHintLabel();
    }

    const group = [];
    for (let r = rect.r1; r <= rect.r2; r++) {
        for (let c = rect.c1; c <= rect.c2; c++) {
            const cell = grid[r][c];
            if (!cell.classList.contains("erased")) {
                cell.classList.add("hint");
                group.push(cell);
            }
        }
    }
    hintGroups.push(group);
});

function flashNoHint() {
    btnHint.classList.add("shake");
    setTimeout(() => btnHint.classList.remove("shake"), 400);
}

function updateHintLabel() {
    lblHintCount.innerText = infiniteHint ? "∞" : hintCnt;
    btnHint.disabled = !infiniteHint && hintCnt <= 0;
}

function gameTimer(endTime, timeout, time, cnt){
    if(cnt!=gameCnt) return;

    if (infiniteTime) {
        lblTime.innerText = "∞";
        setTimeout(() => {
            gameTimer(new Date(Date.now() + time*1000), timeout, time, cnt);
        }, timeout);
        return;
    }

    const now = Date.now();
    const end = endTime.getTime();
    const timeLeft = end - now;
    console.log(`남은 시간: ${time} s`);
    lblTime.innerText = time;

    if (timeLeft <= 0) {
        console.log('타이머 종료');
        endGame("timeout");
        return;
    }

    setTimeout(() => {
        gameTimer(endTime, timeout, time-1, cnt);
    }, timeout);
}

function calculateReward() {
    let reward = score * 3;
    if (score === rows * cols) reward += 50;
    return reward;
}

function endGame(reason) {
    if (gameEnded) return;
    gameEnded = true;
    cancelSelection();

    const reward = calculateReward();
    addGold(reward);
    console.log(`게임 종료 (${reason}) - 획득 골드: ${reward}`);

    lblFinalScore.innerText = score;
    lblFinalGold.innerText = reward;
    gameoverOverlay.classList.add("open");
}

btnPlayAgain.addEventListener("click", () => {
    gameoverOverlay.classList.remove("open");
    resetBoard();
});

function gameClear() {
    console.log("Game Clear!!");
    endGame("clear");
}

// 하이라이트된 칸들을 초기화
function clearHighlights() {
    highlightedCells.forEach((cell) => {
        cell.classList.remove("highlight");
    });

    highlightedCells = []; // 하이라이트 목록 초기화
}

// 셀 클릭 이벤트 추가
board.addEventListener("click", (event) => {
    if (event.target.classList.contains("cell")) {
        console.log(`클릭한 숫자: ${event.target.dataset.value}`);
    }
});

btnReset.addEventListener("click", (event) => {
    resetBoard();
    console.log("Reset board.");
});

// 게임 시작
createBoard();
