/* =====================================================
   BACKGROUND PARTICLES
===================================================== */
(function() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, shapes = [];

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);

  const COLORS = ['rgba(168,230,207,0.35)','rgba(255,211,182,0.35)','rgba(255,170,165,0.3)','rgba(160,206,217,0.35)','rgba(212,165,245,0.25)'];
  for(let i=0;i<18;i++) {
    shapes.push({
      x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight,
      r: 20+Math.random()*60, vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.25,
      color: COLORS[i%COLORS.length], type: Math.random()<0.5?'circle':'star',
      angle: Math.random()*Math.PI*2, va:(Math.random()-0.5)*0.005
    });
  }

  function drawStar(ctx,x,y,r,angle) {
    ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
    ctx.beginPath();
    for(let i=0;i<5;i++){
      ctx.lineTo(Math.cos((18+i*72)*Math.PI/180)*r, -Math.sin((18+i*72)*Math.PI/180)*r);
      ctx.lineTo(Math.cos((54+i*72)*Math.PI/180)*r*0.4, -Math.sin((54+i*72)*Math.PI/180)*r*0.4);
    }
    ctx.closePath(); ctx.fillStyle = shapes[0].color; ctx.fill(); ctx.restore();
  }

  function loop() {
    ctx.clearRect(0,0,W,H);
    shapes.forEach(s => {
      s.x+=s.vx; s.y+=s.vy; s.angle+=s.va;
      if(s.x<-s.r) s.x=W+s.r; if(s.x>W+s.r) s.x=-s.r;
      if(s.y<-s.r) s.y=H+s.r; if(s.y>H+s.r) s.y=-s.r;
      ctx.fillStyle = s.color;
      if(s.type==='circle') { ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); }
      else { drawStar(ctx,s.x,s.y,s.r,s.angle); }
    });
    requestAnimationFrame(loop);
  }
  loop();
})();

/* =====================================================
   PARTICLE BURST SYSTEM
===================================================== */
const pCanvas = document.getElementById('particle-canvas');
const pCtx = pCanvas.getContext('2d');
pCanvas.width = window.innerWidth; pCanvas.height = window.innerHeight;
window.addEventListener('resize', () => { pCanvas.width=window.innerWidth; pCanvas.height=window.innerHeight; });

let particles = [];
function spawnParticles(x, y, count=12) {
  const COLORS=['#FF6B6B','#FFD93D','#6BCB77','#A0CED9','#FF8C94','#d4a5f5'];
  for(let i=0;i<count;i++) {
    const angle = (Math.PI*2/count)*i + Math.random()*0.4;
    const speed = 80+Math.random()*120;
    particles.push({
      x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
      r: 4+Math.random()*5, color: COLORS[Math.floor(Math.random()*COLORS.length)],
      life: 1, decay: 0.025+Math.random()*0.02
    });
  }
}
function animParticles() {
  pCtx.clearRect(0,0,pCanvas.width,pCanvas.height);
  particles = particles.filter(p => p.life>0);
  particles.forEach(p => {
    p.x+=p.vx*0.016; p.y+=p.vy*0.016; p.vy+=120*0.016;
    p.life-=p.decay; p.r*=0.98;
    pCtx.globalAlpha=Math.max(0,p.life);
    pCtx.fillStyle=p.color;
    pCtx.beginPath(); pCtx.arc(p.x,p.y,p.r,0,Math.PI*2); pCtx.fill();
  });
  pCtx.globalAlpha=1;
  requestAnimationFrame(animParticles);
}
animParticles();

/* =====================================================
   SCREEN NAVIGATION
===================================================== */
let currentGame = null;
function showGame(game) {
  document.querySelectorAll('.screen, .game-screen').forEach(s=>{ s.classList.remove('active'); s.style.display='none'; });
  currentGame = game;
  if(game==='memory') {
    const el = document.getElementById('memory-game');
    el.classList.add('active'); el.style.display='block';
    initMemory();
  } else if(game==='ttt') {
    const el = document.getElementById('ttt-game');
    el.classList.add('active'); el.style.display='block';
    initTTT();
  } else if(game==='penalty') {
    const el = document.getElementById('penalty-game');
    el.classList.add('active'); el.style.display='block';
    initPenalty();
  }
}
function showHome() {
  document.querySelectorAll('.screen, .game-screen').forEach(s=>{ s.style.display='none'; s.classList.remove('active'); });
  const home = document.getElementById('home');
  home.style.display='block'; home.classList.add('active');
  closeModal(); currentGame=null;
  clearInterval(memTimer);
}

/* ===== MODAL ===== */
function showModal(emoji, title, subtitle, stats, restartFn) {
  document.getElementById('modal-emoji').textContent = emoji;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-subtitle').textContent = subtitle;
  const statsEl = document.getElementById('modal-stats');
  statsEl.innerHTML = stats.map(s=>`<div class="stat-box"><div class="stat-label">${s.label}</div><div class="stat-val">${s.val}</div></div>`).join('');
  document.getElementById('modal-restart').onclick = () => { closeModal(); restartFn(); };
  document.getElementById('modal').classList.add('show');
}
function closeModal() { document.getElementById('modal').classList.remove('show'); }

function animScore(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }

/* =====================================================
   GAME 1: MEMORY MATCH
===================================================== */
const EMOJIS = ['🐶','🐼','🐷','🐸','🦋','🌸','🍦','🎈','🤖','🎵','🍩','🦄','⚽️','🍕','🎮','🚀','🌺','💎'];
let memCards=[], memFlipped=[], memMatched=0, memCurrent=0, memScores=[0,0], memMoves=0, memTimerVal=0, memTimer=null, memBusy=false;

function initMemory() {
  clearInterval(memTimer);
  memCards=[]; memFlipped=[]; memMatched=0; memCurrent=0; memScores=[0,0]; memMoves=0; memTimerVal=0; memBusy=false;
  document.getElementById('mem-score1').textContent='0';
  document.getElementById('mem-score2').textContent='0';
  document.getElementById('mem-moves').textContent='0';
  document.getElementById('mem-timer').textContent='0:00';
  highlightMemPlayer();

  const pairs = [...EMOJIS,...EMOJIS].sort(()=>Math.random()-0.5);
  const grid = document.getElementById('memory-grid');
  grid.innerHTML='';
  pairs.forEach((emoji, i) => {
    const card = document.createElement('div');
    card.className='mem-card'; card.dataset.emoji=emoji; card.dataset.idx=i;
    card.innerHTML=`<div class="mem-front"></div><div class="mem-back">${emoji}</div>`;
    card.addEventListener('click', ()=>flipCard(card));
    grid.appendChild(card);
    memCards.push(card);
  });
}

function startMemTimer() {
  if(memTimer) return;
  memTimer = setInterval(()=>{
    memTimerVal++;
    const m=Math.floor(memTimerVal/60), s=memTimerVal%60;
    document.getElementById('mem-timer').textContent=`${m}:${s<10?'0':''}${s}`;
  },1000);
}

function flipCard(card) {
  if(memBusy || card.classList.contains('flipped') || card.classList.contains('matched')) return;
  startMemTimer();
  card.classList.add('flipped');
  memFlipped.push(card);
  if(memFlipped.length===2) {
    memBusy=true; memMoves++;
    document.getElementById('mem-moves').textContent=memMoves;
    const [a,b]=memFlipped;
    if(a.dataset.emoji===b.dataset.emoji) {
      setTimeout(()=>{
        a.classList.add('matched'); b.classList.add('matched');
        memScores[memCurrent]++;
        const scoreEl = document.getElementById(`mem-score${memCurrent+1}`);
        scoreEl.textContent=memScores[memCurrent];
        animScore(scoreEl);
        const rect=a.getBoundingClientRect();
        spawnParticles(rect.left+rect.width/2, rect.top+rect.height/2, 10);
        const rect2=b.getBoundingClientRect();
        spawnParticles(rect2.left+rect2.width/2, rect2.top+rect2.height/2, 8);
        memFlipped=[]; memMatched++; memBusy=false;
        if(memMatched===18) endMemory();
      },400);
    } else {
      setTimeout(()=>{
        a.classList.remove('flipped'); b.classList.remove('flipped');
        memFlipped=[]; memBusy=false;
        memCurrent=memCurrent===0?1:0;
        highlightMemPlayer();
      },900);
    }
  }
}

function highlightMemPlayer() {
  document.getElementById('mem-p1').classList.toggle('active', memCurrent===0);
  document.getElementById('mem-p2').classList.toggle('active', memCurrent===1);
}

function endMemory() {
  clearInterval(memTimer);
  const winner = memScores[0]>memScores[1]?'🔵 Player 1 Wins!'
    : memScores[1]>memScores[0]?'🔴 Player 2 Wins!'
    : "🤝 It's a Draw!";
  const m=Math.floor(memTimerVal/60), s=memTimerVal%60;
  setTimeout(()=>{
    spawnParticles(window.innerWidth/2, window.innerHeight/2, 30);
    showModal('🏆',winner,'Amazing Memory!',
      [{label:'P1 Pairs',val:memScores[0]},{label:'P2 Pairs',val:memScores[1]},
       {label:'Moves',val:memMoves},{label:'Time',val:`${m}:${s<10?'0':''}${s}`}],
      initMemory);
  },600);
}

/* =====================================================
   GAME 2: TIC TAC TOE
===================================================== */
let tttBoard=Array(9).fill(null), tttCurrent=0, tttMode='pvp', tttScores=[0,0], tttGameOver=false;
const MARKS=['❌','⭕'], NAMES=['❌ Player 1','⭕ Player 2'];
const WIN_COMBOS=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function initTTT() {
  tttBoard=Array(9).fill(null); tttCurrent=0; tttGameOver=false;
  document.getElementById('ttt-turn').textContent=`${NAMES[0]}'s Turn`;
  highlightTTTPlayer();
  renderTTTBoard();
}

function setTTTMode(mode) {
  tttMode=mode;
  document.getElementById('pvp-btn').classList.toggle('active',mode==='pvp');
  document.getElementById('ai-btn').classList.toggle('active',mode==='ai');
  if(mode==='ai') {
    document.getElementById('ttt-p2').querySelector('.player-name').textContent='🤖 AI';
  } else {
    document.getElementById('ttt-p2').querySelector('.player-name').textContent='⭕ Player 2';
  }
  initTTT();
}

function renderTTTBoard() {
  const board = document.getElementById('ttt-board');
  board.innerHTML='';
  tttBoard.forEach((v,i)=>{
    const cell=document.createElement('div');
    cell.className='ttt-cell';
    if(v) cell.innerHTML=`<span class="mark">${MARKS[v-1]}</span>`;
    cell.addEventListener('click',()=>tttClick(i));
    board.appendChild(cell);
  });
}

function tttClick(i) {
  if(tttGameOver || tttBoard[i] || (tttMode==='ai'&&tttCurrent===1)) return;
  makeMove(i);
  if(tttMode==='ai' && !tttGameOver && tttCurrent===1) {
    document.getElementById('ttt-board').style.pointerEvents='none';
    setTimeout(()=>{ aiMove(); document.getElementById('ttt-board').style.pointerEvents=''; },600);
  }
}

function makeMove(i) {
  tttBoard[i]=tttCurrent+1;
  renderTTTBoard();
  const win=checkWin();
  if(win) { highlightWin(win); endTTT(tttCurrent); return; }
  if(tttBoard.every(v=>v)) { endTTT(-1); return; }
  tttCurrent=tttCurrent===0?1:0;
  document.getElementById('ttt-turn').textContent=`${tttMode==='ai'&&tttCurrent===1?'🤖 AI':NAMES[tttCurrent]}'s Turn`;
  highlightTTTPlayer();
}

function highlightTTTPlayer() {
  document.getElementById('ttt-p1').classList.toggle('active',tttCurrent===0);
  document.getElementById('ttt-p2').classList.toggle('active',tttCurrent===1);
}

function checkWin() {
  for(const combo of WIN_COMBOS) {
    const [a,b,c]=combo;
    if(tttBoard[a]&&tttBoard[a]===tttBoard[b]&&tttBoard[b]===tttBoard[c]) return combo;
  }
  return null;
}

function highlightWin(combo) {
  const cells=document.getElementById('ttt-board').children;
  combo.forEach(i=>cells[i].classList.add('winner-cell'));
}

function endTTT(winner) {
  tttGameOver=true;
  if(winner===-1) {
    setTimeout(()=>showModal('🤝','Draw!','So close!',
      [{label:'P1 Wins',val:tttScores[0]},{label:'P2 Wins',val:tttScores[1]}],initTTT),700);
    return;
  }
  tttScores[winner]++;
  const scoreEl=document.getElementById(`ttt-score${winner+1}`);
  scoreEl.textContent=tttScores[winner]; animScore(scoreEl);
  spawnParticles(window.innerWidth/2,window.innerHeight/2,20);
  const label=tttMode==='ai'&&winner===1?'🤖 AI Wins!':winner===0?'❌ Player 1 Wins!':'⭕ Player 2 Wins!';
  setTimeout(()=>showModal('🏆',label,'Great match!',
    [{label:'P1 Wins',val:tttScores[0]},{label:'P2 Wins',val:tttScores[1]}],initTTT),700);
}

/* Minimax AI */
function aiMove() {
  let best=-Infinity, bestIdx=4;
  if(!tttBoard[4]) { makeMove(4); return; }
  for(let i=0;i<9;i++) {
    if(!tttBoard[i]) {
      tttBoard[i]=2;
      const v=minimax(tttBoard,0,false);
      tttBoard[i]=null;
      if(v>best){best=v;bestIdx=i;}
    }
  }
  makeMove(bestIdx);
}
function minimax(board,depth,isMax) {
  for(const [a,b,c] of WIN_COMBOS) {
    if(board[a]&&board[a]===board[b]&&board[b]===board[c])
      return board[a]===2?10-depth:depth-10;
  }
  if(board.every(v=>v)) return 0;
  if(isMax) {
    let best=-Infinity;
    for(let i=0;i<9;i++) if(!board[i]){board[i]=2;best=Math.max(best,minimax(board,depth+1,false));board[i]=null;}
    return best;
  } else {
    let best=Infinity;
    for(let i=0;i<9;i++) if(!board[i]){board[i]=1;best=Math.min(best,minimax(board,depth+1,true));board[i]=null;}
    return best;
  }
}

/* =====================================================
   GAME 3: PENALTY TAKER
===================================================== */
let penScores=[0,0], penRound=1, penCurrent=0, penKicking=false;
let penZone=null, penPower=null;
// Track kicks: [{player,scored}]
let penKickHistory=[];
const TOTAL_ROUNDS=5; // 5 kicks each

function initPenalty() {
  penScores=[0,0]; penRound=1; penCurrent=0; penKicking=false;
  penZone=null; penPower=null; penKickHistory=[];
  document.getElementById('pen-score1').textContent='0';
  document.getElementById('pen-score2').textContent='0';
  document.getElementById('pen-round').textContent='1';
  document.getElementById('pen-whose-turn').textContent='🔵 Player 1 shoots!';
  resetBallPosition();
  resetGoalkeeper();
  clearZonePower();
  clearKickDots();
  highlightPenPlayer();
  document.getElementById('kick-btn').disabled=false;
  document.getElementById('penalty-result').classList.remove('show','goal-res','miss-res');
}

function resetBallPosition() {
  const ball=document.getElementById('penalty-ball');
  ball.style.transition='none';
  ball.style.left='50%'; ball.style.bottom='16px'; ball.style.transform='translateX(-50%)';
}

function resetGoalkeeper() {
  const gk=document.getElementById('goalkeeper');
  gk.style.left='50%'; gk.style.transform='translateX(-50%)';
}

function clearZonePower() {
  penZone=null; penPower=null;
  document.querySelectorAll('.zone-btn,.power-btn').forEach(b=>b.classList.remove('selected'));
}

function clearKickDots() {
  document.getElementById('kicks-p1').innerHTML='';
}

function buildKickDots() {
  const container=document.getElementById('kicks-p1');
  container.innerHTML='';
  // Show kicks for current player
  const playerKicks=penKickHistory.filter(k=>k.player===penCurrent);
  for(let i=0;i<TOTAL_ROUNDS;i++) {
    const dot=document.createElement('div');
    dot.className='kick-dot';
    if(i<playerKicks.length) dot.classList.add(playerKicks[i].scored?'scored':'missed');
    container.appendChild(dot);
  }
}

function selectZone(z) {
  if(penKicking) return;
  penZone=z;
  document.querySelectorAll('.zone-btn').forEach(b=>b.classList.remove('selected'));
  document.getElementById(`zone-${z}`).classList.add('selected');
}

function selectPower(p) {
  if(penKicking) return;
  penPower=p;
  document.querySelectorAll('.power-btn').forEach(b=>b.classList.remove('selected'));
  event.target.closest('.power-btn').classList.add('selected');
}

function highlightPenPlayer() {
  document.getElementById('pen-p1').classList.toggle('active',penCurrent===0);
  document.getElementById('pen-p2').classList.toggle('active',penCurrent===1);
}

function takeKick() {
  if(penKicking) return;
  if(!penZone) { selectZone(['left','center','right'][Math.floor(Math.random()*3)]); }
  if(!penPower) { 
    const powers=['low','medium','high'];
    selectPower(powers[Math.floor(Math.random()*3)]);
    document.querySelectorAll('.power-btn').forEach((b,i)=>{
      if(powers[i]===penPower) b.classList.add('selected');
    });
    penPower = penPower || 'medium';
  }
  penKicking=true;
  document.getElementById('kick-btn').disabled=true;

  // GK decides where to dive
  const gkDir=['left','center','right'][Math.floor(Math.random()*3)];
  const powerBonus = penPower==='high'?0.3:penPower==='medium'?0.2:0.1;
  // Probability of goal
  let goalProb=0.55+powerBonus;
  if(penZone===gkDir) goalProb-=0.45;
  const scored=Math.random()<goalProb;

  // Animate GK
  const gk=document.getElementById('goalkeeper');
  const field=document.getElementById('penalty-field');
  const fw=field.offsetWidth;
  if(gkDir==='left') { gk.style.left=(fw*0.25)+'px'; gk.style.transform='translateX(-50%)'; }
  else if(gkDir==='right') { gk.style.left=(fw*0.75)+'px'; gk.style.transform='translateX(-50%)'; }
  else { gk.style.left='50%'; gk.style.transform='translateX(-50%)'; }

  // Animate Ball
  const ball=document.getElementById('penalty-ball');
  let targetX;
  if(penZone==='left') targetX=fw*0.22;
  else if(penZone==='right') targetX=fw*0.78;
  else targetX=fw*0.5;

  ball.style.transition='left 0.55s cubic-bezier(0.2,0.8,0.3,1), bottom 0.55s cubic-bezier(0.2,1.2,0.4,1)';
  ball.style.left=targetX+'px';
  ball.style.bottom=(field.offsetHeight*0.55)+'px';
  ball.style.transform='translateX(-50%)';

  setTimeout(()=>{
    const resultEl=document.getElementById('penalty-result');
    if(scored) {
      resultEl.textContent='⚽ GOAL!'; resultEl.className='penalty-result show goal-res';
      penScores[penCurrent]++;
      const scoreEl=document.getElementById(`pen-score${penCurrent+1}`);
      scoreEl.textContent=penScores[penCurrent]; animScore(scoreEl);
      const rect=field.getBoundingClientRect();
      spawnParticles(rect.left+rect.width/2, rect.top+rect.height/2, 20);
    } else {
      resultEl.textContent='❌ Miss!'; resultEl.className='penalty-result show miss-res';
      // Shake goalposts
      field.querySelector('.goal-post').classList.add('shake');
      setTimeout(()=>field.querySelector('.goal-post').classList.remove('shake'),600);
    }

    penKickHistory.push({player:penCurrent, scored});
    buildKickDots();

    setTimeout(()=>{
      resultEl.classList.remove('show');
      resetBallPosition();
      resetGoalkeeper();
      clearZonePower();
      advancePenalty();
    },1500);
  },700);
}

function advancePenalty() {
  const totalKicks=penKickHistory.length;
  if(totalKicks>=TOTAL_ROUNDS*2) {
    endPenalty(); return;
  }
  penCurrent=totalKicks%2===0?0:1;
  if(penCurrent===0) penRound++;
  document.getElementById('pen-round').textContent=Math.min(penRound,TOTAL_ROUNDS);
  document.getElementById('pen-whose-turn').textContent=
    `${penCurrent===0?'🔵 Player 1':'🔴 Player 2'} shoots!`;
  highlightPenPlayer();
  buildKickDots();
  penKicking=false;
  document.getElementById('kick-btn').disabled=false;
}

function endPenalty() {
  penKicking=false;
  const winner=penScores[0]>penScores[1]?'🔵 Player 1 Wins!'
    :penScores[1]>penScores[0]?'🔴 Player 2 Wins!'
    :"🤝 It's a Draw!";
  const p0kicks=penKickHistory.filter(k=>k.player===0);
  const p1kicks=penKickHistory.filter(k=>k.player===1);
  spawnParticles(window.innerWidth/2,window.innerHeight/3,25);
  setTimeout(()=>showModal('🏆',winner,'Penalty Shootout Complete!',
    [{label:'P1 Goals',val:penScores[0]},{label:'P2 Goals',val:penScores[1]},
     {label:'P1 Accuracy',val:Math.round(p0kicks.filter(k=>k.scored).length/p0kicks.length*100)+'%'},
     {label:'P2 Accuracy',val:Math.round(p1kicks.filter(k=>k.scored).length/p1kicks.length*100)+'%'}],
    initPenalty),600);
}

/* Init home */
document.getElementById('home').style.display='block';
document.getElementById('home').classList.add('active');