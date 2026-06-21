// ========================================
// ゲーム状態管理
// ========================================

const COLORS = {
    RED: { name: '赤', emoji: '🔴', trait: '不屈' },
    BLUE: { name: '青', emoji: '🔵', trait: '堅守' },
    YELLOW: { name: '黄', emoji: '🟡', trait: '迅速' },
    GREEN: { name: '緑', emoji: '🟢', trait: '回復' },
    PURPLE: { name: '紫', emoji: '🟣', trait: '神秘' }
};

const JOBS = {
    WARRIOR: {
        name: '勇者',
        baseHP: 30,
        baseATK: 15,
        baseDEF: 10,
        skills: ['通常攻撃', 'パワースラッシュ']
    },
    MAGE: {
        name: '魔法使い',
        baseHP: 20,
        baseATK: 18,
        baseDEF: 5,
        skills: ['通常攻撃', '魔法弾']
    },
    PRIEST: {
        name: '僧侶',
        baseHP: 25,
        baseATK: 10,
        baseDEF: 12,
        skills: ['通常攻撃', 'ヒール']
    }
};

let gameState = {
    currentScreen: 'title',
    party: [],
    currentCharacterIndex: 0,
    enemies: [],
    currentBattle: null,
    dungeonLevel: 0,
    floor: 1,
    isPaused: false,
    battleLog: []
};

// ========================================
// ユーティリティ関数
// ========================================

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenName).classList.add('active');
    gameState.currentScreen = screenName;
}

function addBattleLog(text) {
    gameState.battleLog.push(text);
    const battleLog = document.getElementById('battle-log');
    battleLog.innerHTML += `<p>${text}</p>`;
    battleLog.scrollTop = battleLog.scrollHeight;
}

function getColorModifier(color) {
    const modifiers = {
        [COLORS.RED.name]: { hp: 1.1, atk: 1.0, def: 0.9 },      // HP+, DEF-
        [COLORS.BLUE.name]: { hp: 1.0, atk: 0.9, def: 1.2 },     // DEF+
        [COLORS.YELLOW.name]: { hp: 0.9, atk: 1.1, def: 1.0 },   // ATK+, HP-
        [COLORS.GREEN.name]: { hp: 1.05, atk: 0.95, def: 1.05 }, // 回復特性
        [COLORS.PURPLE.name]: { hp: 0.95, atk: 1.2, def: 0.9 }   // 魔法+
    };
    return modifiers[color] || { hp: 1.0, atk: 1.0, def: 1.0 };
}

// ========================================
// スクリーン管理
// ========================================

function goToTitle() {
    gameState.party = [];
    gameState.currentCharacterIndex = 0;
    showScreen('title-screen');
}

function startNewGame() {
    gameState.party = [];
    gameState.currentCharacterIndex = 0;
    gameState.dungeonLevel = 0;
    gameState.floor = 1;
    showCharacterSelection();
}

function loadGame() {
    const savedGame = localStorage.getItem('RPG_SAVE');
    if (savedGame) {
        const save = JSON.parse(savedGame);
        gameState = save;
        startBattle();
    } else {
        alert('セーブデータがありません');
    }
}

function showCharacterSelection() {
    displayCharacterOptions();
    showScreen('character-select-screen');
}

function displayCharacterOptions() {
    const grid = document.getElementById('character-grid');
    grid.innerHTML = '';

    const colorEntries = Object.entries(COLORS);
    
    colorEntries.forEach(([key, color]) => {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.innerHTML = `
            <div class="stick-figure">${color.emoji}</div>
            <h3>${color.name}</h3>
            <p>${color.trait}</p>
            <small>職業を選ぶ</small>
        `;
        card.onclick = () => selectColor(color);
        grid.appendChild(card);
    });

    updateCharacterSelectInfo();
}

function selectColor(color) {
    const jobEntries = Object.entries(JOBS);
    
    Swal.fire({
        title: `${color.name}色の職業を選ぶ`,
        html: jobEntries.map(([key, job]) => 
            `<button class="job-option" onclick="selectJob('${color.name}', '${job.name}')">${job.name}</button>`
        ).join(''),
        didOpen: () => {
            document.querySelectorAll('.job-option').forEach(btn => {
                btn.style.cssText = `
                    padding: 10px 20px;
                    margin: 5px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                `;
            });
        },
        showConfirmButton: false
    });
}

function selectJob(color, job) {
    showNameInputScreen(color, job);
    Swal.close();
}

function showNameInputScreen(color, job) {
    const colorObj = Object.values(COLORS).find(c => c.name === color);
    gameState.selectedColor = color;
    gameState.selectedJob = job;

    document.getElementById('name-input-title').textContent = 
        `キャラクター${gameState.currentCharacterIndex + 1}の名前を入力`;
    document.getElementById('character-preview').textContent = colorObj.emoji;
    document.getElementById('name-input').value = '';
    document.getElementById('name-input').focus();

    showScreen('name-input-screen');
}

function confirmCharacterName() {
    const name = document.getElementById('name-input').value.trim();
    if (!name) {
        alert('名前を入力してください');
        return;
    }

    const colorObj = Object.values(COLORS).find(c => c.name === gameState.selectedColor);
    const job = Object.values(JOBS).find(j => j.name === gameState.selectedJob);
    const modifier = getColorModifier(gameState.selectedColor);

    const character = {
        name: name,
        color: gameState.selectedColor,
        job: gameState.selectedJob,
        emoji: colorObj.emoji,
        maxHP: Math.floor(job.baseHP * modifier.hp),
        hp: Math.floor(job.baseHP * modifier.hp),
        atk: Math.floor(job.baseATK * modifier.atk),
        def: Math.floor(job.baseDEF * modifier.def),
        skills: job.skills,
        level: 1,
        exp: 0
    };

    gameState.party.push(character);
    gameState.currentCharacterIndex++;

    if (gameState.currentCharacterIndex < 4) {
        updateCharacterSelectInfo();
        showCharacterSelection();
    } else {
        startGame();
    }
}

function backToCharacterSelect() {
    showCharacterSelection();
}

function nextCharacter() {
    if (gameState.currentCharacterIndex < 4) {
        updateCharacterSelectInfo();
        showCharacterSelection();
    }
}

function updateCharacterSelectInfo() {
    const info = document.getElementById('char-select-info');
    info.textContent = `キャラクター${gameState.currentCharacterIndex + 1}/4を選択`;
    
    const nextBtn = document.getElementById('next-btn');
    if (gameState.currentCharacterIndex >= 4) {
        nextBtn.style.display = 'block';
    }
}

// ========================================
// ゲーム開始
// ========================================

function startGame() {
    gameState.dungeonLevel = 0;
    gameState.floor = 1;
    startBattle();
}

function startBattle() {
    // パーティーのHPをリセット
    gameState.party.forEach(char => {
        char.hp = char.maxHP;
    });

    // 敵を生成
    generateEnemies();
    gameState.battleLog = [];

    showScreen('main-screen');
    updateBattleUI();
    addBattleLog('戦闘開始！');
}

function generateEnemies() {
    const dungeonNames = ['森', 'しぐれの塔', '炎の城', '氷の洞窟', '暗黒の遺跡'];
    gameState.enemyDungeonName = dungeonNames[gameState.dungeonLevel] || '謎の地';
    
    const enemyCount = 2 + gameState.floor;
    gameState.enemies = [];

    for (let i = 0; i < enemyCount; i++) {
        const colorKeys = Object.keys(COLORS);
        const randomColor = colorKeys[Math.floor(Math.random() * colorKeys.length)];
        const colorObj = COLORS[randomColor];
        
        const jobKeys = Object.keys(JOBS);
        const randomJobKey = jobKeys[Math.floor(Math.random() * jobKeys.length)];
        const job = JOBS[randomJobKey];
        
        const modifier = getColorModifier(colorObj.name);
        
        const enemy = {
            name: `${colorObj.name}${job.name}`,
            color: colorObj.name,
            job: job.name,
            emoji: colorObj.emoji,
            maxHP: Math.floor((job.baseHP + gameState.floor * 2) * modifier.hp),
            hp: Math.floor((job.baseHP + gameState.floor * 2) * modifier.hp),
            atk: Math.floor((job.baseATK + gameState.floor) * modifier.atk),
            def: Math.floor(job.baseDEF * modifier.def),
            exp: 10 + gameState.floor * 5
        };
        
        gameState.enemies.push(enemy);
    }

    document.getElementById('dungeon-title').textContent = `ダンジョン: ${gameState.enemyDungeonName}`;
    document.getElementById('floor-info').textContent = `フロア: ${gameState.floor}/${5}`;
    document.getElementById('enemy-info').textContent = `敵の数: ${gameState.enemies.length}`;
}

function updateBattleUI() {
    // 敵の表示
    const enemyList = document.getElementById('enemy-list');
    enemyList.innerHTML = gameState.enemies.map((enemy, idx) => `
        <div class="enemy-status">
            <div class="status-name">${enemy.emoji} ${enemy.name}</div>
            <div class="status-hp">HP: ${enemy.hp}/${enemy.maxHP}</div>
        </div>
    `).join('');

    // パーティーの表示
    const partyList = document.getElementById('party-list');
    partyList.innerHTML = gameState.party.map((char, idx) => `
        <div class="character-status">
            <div class="status-name">${char.emoji} ${char.name}</div>
            <div class="status-hp">HP: ${char.hp}/${char.maxHP}</div>
        </div>
    `).join('');
}

// ========================================
// 戦闘システム
// ========================================

function attackEnemy() {
    if (gameState.isPaused) return;

    // プレイヤーターン
    let playerAlive = gameState.party.some(c => c.hp > 0);
    if (!playerAlive) {
        gameOver();
        return;
    }

    // 生きている最初のキャラクターが攻撃
    const attacker = gameState.party.find(c => c.hp > 0);
    if (!attacker) return;

    // 敵を選択（生きている敵から）
    const aliveEnemies = gameState.enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) {
        clearDungeon();
        return;
    }

    const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    
    // ダメージ計算
    const damage = Math.floor(attacker.atk + Math.random() * 5 - 2);
    const actualDamage = Math.max(1, damage - Math.floor(target.def / 2));
    
    target.hp = Math.max(0, target.hp - actualDamage);
    addBattleLog(`${attacker.name}が${target.name}に${actualDamage}ダメージ！`);

    if (target.hp <= 0) {
        addBattleLog(`${target.name}は倒された！`);
    }

    updateBattleUI();

    // 敵がまだいるなら、敵ターン
    if (gameState.enemies.some(e => e.hp > 0)) {
        setTimeout(enemyTurn, 1000);
    } else {
        setTimeout(clearDungeon, 1500);
    }
}

function enemyTurn() {
    const aliveEnemies = gameState.enemies.filter(e => e.hp > 0);
    const aliveParty = gameState.party.filter(c => c.hp > 0);

    if (aliveEnemies.length === 0 || aliveParty.length === 0) return;

    // ランダムな敵が攻撃
    const attacker = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];

    const damage = Math.floor(attacker.atk + Math.random() * 5 - 2);
    const actualDamage = Math.max(1, damage - Math.floor(target.def / 2));

    target.hp = Math.max(0, target.hp - actualDamage);
    addBattleLog(`${attacker.name}が${target.name}に${actualDamage}ダメージを与えた！`);

    if (target.hp <= 0) {
        addBattleLog(`${target.name}は倒された...`);
    }

    updateBattleUI();

    // ゲームオーバーチェック
    if (gameState.party.every(c => c.hp <= 0)) {
        setTimeout(gameOver, 1500);
    }
}

function useSkill() {
    addBattleLog('スキルシステムは近日実装予定...');
}

function useItem() {
    addBattleLog('アイテムシステムは近日実装予定...');
}

function clearDungeon() {
    gameState.floor++;
    if (gameState.floor > 5) {
        completeDungeon();
    } else {
        addBattleLog('全ての敵を倒した！');
        setTimeout(() => {
            document.getElementById('clear-message').textContent = `フロア${gameState.floor - 1}をクリアした！`;
            showScreen('clear-screen');
        }, 500);
    }
}

function nextDungeon() {
    gameState.dungeonLevel++;
    gameState.floor = 1;
    
    if (gameState.dungeonLevel >= 5) {
        showGameComplete();
    } else {
        startBattle();
    }
}

function completeDungeon() {
    showScreen('clear-screen');
    document.getElementById('clear-message').textContent = 'ダンジョンをクリアした！';
    document.getElementById('reward-info').innerHTML = `
        <p>すべてのフロアをクリアしました！</p>
        <p>経験値を獲得しました！</p>
    `;
}

function gameOver() {
    showScreen('gameover-screen');
}

function showGameComplete() {
    showScreen('gameover-screen');
    document.getElementById('gameover-title').textContent = 'ゲームクリア！';
    document.getElementById('gameover-message').textContent = 'すべてのダンジョンをクリアしました！';
}

// ========================================
// ゲーム管理
// ========================================

function pauseGame() {
    gameState.isPaused = true;
    showScreen('pause-screen');
}

function resumeGame() {
    gameState.isPaused = false;
    showScreen('main-screen');
}

function saveGame() {
    const saveData = JSON.stringify(gameState);
    localStorage.setItem('RPG_SAVE', saveData);
    alert('ゲームをセーブしました！');
    resumeGame();
}

// ========================================
// 初期化
// ========================================

window.addEventListener('DOMContentLoaded', () => {
    showScreen('title-screen');
    
    // SweetAlert2ライブラリの読み込み
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
    document.head.appendChild(script);
});
