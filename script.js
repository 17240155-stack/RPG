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

const DUNGEONS = [
    { name: '森', emoji: '🌲' },
    { name: 'しぐれの塔', emoji: '🗼' },
    { name: '炎の城', emoji: '🔥' },
    { name: '氷の洞窟', emoji: '❄️' },
    { name: '暗黒の遺跡', emoji: '🏚️' }
];

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
    showTown();
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

function showTown() {
    gameState.currentCharacterIndex = 0;
    displayTownScreen();
    showScreen('town-screen');
}

function displayTownScreen() {
    // 色のグリッドを表示
    const grid = document.getElementById('town-character-grid');
    grid.innerHTML = '';

    const colorEntries = Object.entries(COLORS);
    
    colorEntries.forEach(([key, color]) => {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.innerHTML = `
            <div class="stick-figure">${color.emoji}</div>
            <h3>${color.name}</h3>
            <p>${color.trait}</p>
        `;
        card.onclick = () => selectColorInTown(color);
        grid.appendChild(card);
    });

    updateTownScreen();
}

function selectColorInTown(color) {
    const jobEntries = Object.entries(JOBS);
    
    // Simple job selection dialog
    let jobHtml = jobEntries.map(([key, job]) => 
        `<button class="job-select-btn" onclick="selectJobInTown('${color.name}', '${job.name}')" style="display: block; width: 100%; padding: 10px; margin: 5px 0; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1em;">${job.name}</button>`
    ).join('');
    
    // Create modal-like display
    const modal = document.createElement('div');
    modal.id = 'job-selection-modal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 300px;">
                <h3 style="color: #333; margin-bottom: 20px;">${color.name}色の職業を選ぶ</h3>
                <div id="job-buttons">${jobHtml}</div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function selectJobInTown(color, job) {
    const modal = document.getElementById('job-selection-modal');
    if (modal) modal.remove();
    
    const colorObj = Object.values(COLORS).find(c => c.name === color);
    const jobObj = Object.values(JOBS).find(j => j.name === job);
    const modifier = getColorModifier(color);

    const character = {
        name: `${colorObj.emoji}${job}`,
        color: color,
        job: job,
        emoji: colorObj.emoji,
        maxHP: Math.floor(jobObj.baseHP * modifier.hp),
        hp: Math.floor(jobObj.baseHP * modifier.hp),
        atk: Math.floor(jobObj.baseATK * modifier.atk),
        def: Math.floor(jobObj.baseDEF * modifier.def),
        skills: jobObj.skills,
        level: 1,
        exp: 0
    };

    gameState.party.push(character);
    gameState.currentCharacterIndex++;

    if (gameState.currentCharacterIndex < 4) {
        updateTownScreen();
        displayTownScreen();
    } else {
        goDungeon();
    }
}

function backToTown() {
    showTown();
}

function updateTownScreen() {
    const info = document.getElementById('town-message');
    info.textContent = `仲間を集めてダンジョンに出かけよう！（${gameState.currentCharacterIndex}/4）`;
    
    // 選択したパーティーを表示
    const partyList = document.getElementById('selected-party-list');
    partyList.innerHTML = gameState.party.map((char, idx) => `
        <div class="party-member-badge">
            <span>${char.emoji}</span>
            <span>${char.job}</span>
        </div>
    `).join('');

    // ダンジョンへ出発ボタンの表示/非表示
    const btn = document.getElementById('go-dungeon-btn');
    if (gameState.currentCharacterIndex >= 4) {
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
    }
}

function goDungeon() {
    gameState.dungeonLevel = 0;
    gameState.floor = 1;
    startBattle();
}

// ========================================
// ゲーム開始
// ========================================

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
    const dungeonData = DUNGEONS[gameState.dungeonLevel] || DUNGEONS[0];
    gameState.enemyDungeonName = dungeonData.name;
    gameState.enemyDungeonEmoji = dungeonData.emoji;
    
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

    document.getElementById('dungeon-title').textContent = `${gameState.enemyDungeonEmoji} ${gameState.enemyDungeonName}`;
    document.getElementById('floor-info').textContent = `フロア: ${gameState.floor}/5`;
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
            <div class="status-name">${char.emoji} ${char.job}</div>
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
    addBattleLog(`${attacker.job}が${target.name}に${actualDamage}ダメージ！`);

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
    addBattleLog(`${attacker.name}が${target.job}に${actualDamage}ダメージを与えた！`);

    if (target.hp <= 0) {
        addBattleLog(`${target.job}は倒された...`);
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
});
