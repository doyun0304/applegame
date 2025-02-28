const board = document.getElementById("game-board");
const btnReset = document.getElementById("btnReset");
const lblScore = document.getElementById("lblScore");
const lblTime = document.getElementById("lblTime");
const rows = 9;
const cols = 18;
const gameTime = 120;
const jokerCnt = 5;
let gameCnt = 0;
let score = 0;
let grid = [];
let selectionBox = null;
let startX = 0, startY = 0; 
let highlightedCells = [];

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
    lblScore.innerText = `score: ${score}`;
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
    gameTimer(new Date(Date.now() + gameTime*1000), 1000, gameTime, gameCnt);
}

// 마우스 클릭 시 시작점 저장 & 직사각형 생성
board.addEventListener("mousedown", (event) => {
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
    lblScore.innerText = `score: ${score}`;
    if(score==rows*cols) gameClear();
}

function checkSum() {
    let flag = false;
    let sum = 0;
    highlightedCells.forEach((cell) =>{
        if(cell.dataset.value==0) flag = true;
        sum = sum + parseInt(cell.dataset.value);
    });
    console.log(`sum: ${sum}`);
    return sum==10 || (flag && sum <=10);
}

function gameTimer(endTime, timeout, time, cnt){
    if(cnt!=gameCnt) return;
    const now = Date.now();
    const end = endTime.getTime();
    const timeLeft = end - now;
    console.log(`남은 시간: ${time} s`);
    lblTime.innerText = `time: ${time}`;

    if (timeLeft <= 0) {
        console.log('타이머 종료');
        return;
    }

    setTimeout(() => {
        gameTimer(endTime, timeout, time-1, cnt);
    }, timeout);
}


function gameClear() {
    console.log("Game Clear!!");
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
