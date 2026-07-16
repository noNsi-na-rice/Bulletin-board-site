(function(){
  const STORAGE_KEY = 'citizen_science_posts_v1';

  // ---------- 行動タイプの定義 ----------
  const ACTION_TYPES = [
    { value: 'straw',     label: 'ストローを断った',           icon: '🥤', grams: 3 },
    { value: 'bag',       label: 'マイバッグを使った',          icon: '👜', grams: 10 },
    { value: 'bottle',    label: 'ペットボトルを買わなかった',    icon: '🧴', grams: 25 },
    { value: 'container', label: '使い捨て容器・カトラリーを断った', icon: '🍴', grams: 8 },
    { value: 'cleanup',   label: 'ビーチや川でゴミ拾いをした',     icon: '🧹', grams: null },
    { value: 'other',     label: 'その他のエコ活動',            icon: '🌱', grams: 5 }
  ];
  function getActionConfig(value){
    return ACTION_TYPES.find(a => a.value === value) || ACTION_TYPES[ACTION_TYPES.length - 1];
  }

  // ---------- 要素取得 ----------
  const tabBtns = document.querySelectorAll('.tab-btn');
  const pages = document.querySelectorAll('.page');
  const ctaBtn = document.getElementById('cta-btn');

  const nameInput = document.getElementById('name-input');
  const actionSelect = document.getElementById('action-select');
  const customGramsField = document.getElementById('custom-grams-field');
  const gramsInput = document.getElementById('grams-input');
  const bodyInput = document.getElementById('body-input');
  const charCount = document.getElementById('char-count');
  const photoInput = document.getElementById('photo-input');
  const photoPreviewWrap = document.getElementById('photo-preview-wrap');
  const postBtn = document.getElementById('post-btn');
  const errorMsg = document.getElementById('error-msg');
  const timelineEl = document.getElementById('timeline');
  const emptyMsg = document.getElementById('empty-msg');

  const counterNumber = document.getElementById('counter-number');
  const counterSub = document.getElementById('counter-sub');
  const statPosts = document.getElementById('stat-posts');
  const statPeople = document.getElementById('stat-people');

  const scene = document.getElementById('ocean-scene');
  const turtleSvg = document.getElementById('turtle-svg');
  const sceneStatus = document.getElementById('scene-status');
  const sceneCounter = document.getElementById('scene-counter');
  const toast = document.getElementById('toast');

  const trashItems = Array.from(document.querySelectorAll('.trash-item'));
  const decorFish1 = document.querySelector('.decor.fish1');
  const decorFish2 = document.querySelector('.decor.fish2');
  const decorCoral = document.querySelector('.decor.coral');
  const decorSun = document.querySelector('.decor.sun');
  const decorSparkle = document.querySelector('.decor.sparkle');
  const decorWeed = document.querySelector('.decor.weed');

  let currentPhoto = null; // 選択中の写真(dataURL)

  // ---------- タブ切り替え ----------
  function showTab(name){
    tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
    pages.forEach(p => p.classList.toggle('active', p.id === `page-${name}`));
  }
  tabBtns.forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
  ctaBtn.addEventListener('click', () => {
    showTab('timeline');
    nameInput.focus();
  });

  // ---------- 行動セレクト初期化 ----------
  ACTION_TYPES.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.value;
    opt.textContent = `${a.icon} ${a.label}`;
    actionSelect.appendChild(opt);
  });
  actionSelect.addEventListener('change', () => {
    customGramsField.style.display = actionSelect.value === 'cleanup' ? 'block' : 'none';
  });

  // ---------- 写真選択 ----------
  photoInput.addEventListener('change', () => {
    const file = photoInput.files[0];
    if(!file) return;

    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const maxW = 480;
        const scaleRatio = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scaleRatio);
        const h = Math.round(img.height * scaleRatio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        currentPhoto = canvas.toDataURL('image/jpeg', 0.72);
        renderPhotoPreview();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  function renderPhotoPreview(){
    photoPreviewWrap.innerHTML = '';
    if(!currentPhoto) return;
    const wrap = document.createElement('div');
    wrap.className = 'photo-preview';
    wrap.innerHTML = `
      <img src="${currentPhoto}" alt="プレビュー">
      <br><button type="button" class="photo-remove" id="photo-remove-btn">✕ 写真を削除</button>
    `;
    photoPreviewWrap.appendChild(wrap);
    document.getElementById('photo-remove-btn').addEventListener('click', () => {
      currentPhoto = null;
      photoInput.value = '';
      renderPhotoPreview();
    });
  }

  // ---------- 海のステージ定義（合計削減量[g]で判定） ----------
  const stages = [
    { min: 0,     mood: 0, group: 'sad',     trash: 5, decor: [],                                              grad: ['#5c5230', '#3a4a42'], label: 'ゴミだらけの海…カメさんも元気がない' },
    { min: 300,   mood: 1, group: 'sad',     trash: 4, decor: [],                                              grad: ['#556b4a', '#2f4e52'], label: 'すこしずつ、変わりはじめた' },
    { min: 1000,  mood: 2, group: 'neutral', trash: 3, decor: ['weed'],                                        grad: ['#2f6b5e', '#1f4e63'], label: '水が澄んできたみたい' },
    { min: 3000,  mood: 3, group: 'neutral', trash: 2, decor: ['weed', 'fish1'],                               grad: ['#238a86', '#155a78'], label: 'お魚が戻ってきたよ' },
    { min: 7000,  mood: 4, group: 'happy',   trash: 1, decor: ['weed', 'fish1', 'coral'],                      grad: ['#17a3a0', '#0d5f86'], label: 'サンゴも顔を出したよ' },
    { min: 15000, mood: 5, group: 'happy',   trash: 0, decor: ['weed', 'fish1', 'fish2', 'coral', 'sun'],      grad: ['#22c1c9', '#0f6fa0'], label: '海がどんどん豊かになってきた!' },
    { min: 30000, mood: 6, group: 'happy',   trash: 0, decor: ['weed', 'fish1', 'fish2', 'coral', 'sun', 'sparkle'], grad: ['#37e0d6', '#1382b8'], label: '海がすっかり元気になった!' }
  ];
  const decorMap = { fish1: decorFish1, fish2: decorFish2, coral: decorCoral, sun: decorSun, sparkle: decorSparkle, weed: decorWeed };

  function getStage(totalGrams){
    let current = stages[0];
    for(const s of stages){ if(totalGrams >= s.min) current = s; }
    return current;
  }

  function applyStage(totalGrams, postCount){
    const stage = getStage(totalGrams);
    turtleSvg.setAttribute('data-mood', stage.mood);
    turtleSvg.setAttribute('data-mood-group', stage.group);

    trashItems.forEach((item, i) => {
      item.classList.toggle('gone', i >= stage.trash);
    });
    Object.keys(decorMap).forEach(key => {
      const el = decorMap[key];
      if(!el) return;
      el.classList.toggle('show', stage.decor.includes(key));
    });

    scene.style.setProperty('--grad-top', stage.grad[0]);
    scene.style.setProperty('--grad-bottom', stage.grad[1]);
    sceneStatus.textContent = stage.label;
    sceneCounter.textContent = `記録件数 ${postCount} 件`;
  }

  function celebrate(){
    scene.classList.remove('celebrate');
    void scene.offsetWidth;
    scene.classList.add('celebrate');
    toast.classList.add('show');
    setTimeout(() => {
      scene.classList.remove('celebrate');
      toast.classList.remove('show');
    }, 1300);
  }

  // ---------- カウンターのカウントアップ ----------
  let displayedTotal = 0;
  function animateCounterTo(target){
    const start = displayedTotal;
    const diff = target - start;
    if(diff === 0){ updateCounterText(target); return; }
    const duration = 900;
    const startTime = performance.now();

    function frame(now){
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(start + diff * eased);
      updateCounterText(value);
      if(t < 1){ requestAnimationFrame(frame); }
      else{ displayedTotal = target; }
    }
    requestAnimationFrame(frame);
  }
  function updateCounterText(value){
    counterNumber.textContent = value.toLocaleString();
    if(value >= 1000){
      counterSub.textContent = `= 約 ${(value/1000).toFixed(1)} kg のプラスチックを削減`;
    }else if(value > 0){
      counterSub.textContent = 'これからも記録を続けよう!';
    }else{
      counterSub.textContent = 'まだ記録がありません';
    }
  }

  // ---------- データ ----------
  function loadPosts(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function savePosts(posts){ localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); }

  function formatTime(ts){
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function escapeHtml(str){
    return str.replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
  }

  function render(){
    const posts = loadPosts();

    // タイムライン描画
    timelineEl.innerHTML = '';
    if(posts.length === 0){
      emptyMsg.style.display = 'block';
    }else{
      emptyMsg.style.display = 'none';
      posts.slice().reverse().forEach(post => {
        const action = getActionConfig(post.actionType);
        const entry = document.createElement('div');
        entry.className = 'entry';
        entry.innerHTML = `
          <div class="entry-card">
            <button class="delete" title="この記録を削除" data-id="${post.id}">✕</button>
            ${post.photo ? `<img src="${post.photo}" alt="投稿写真">` : ''}
            <div class="entry-top">
              <span class="entry-badge">${action.icon} ${escapeHtml(action.label)}</span>
              <span class="entry-grams">-${post.grams}g</span>
            </div>
            <div class="entry-name">${escapeHtml(post.name)}</div>
            <div class="entry-time">${formatTime(post.time)}</div>
            <div class="entry-comment">${escapeHtml(post.comment)}</div>
          </div>
        `;
        timelineEl.appendChild(entry);
      });
      timelineEl.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const remaining = loadPosts().filter(p => String(p.id) !== id);
          savePosts(remaining);
          render();
        });
      });
    }

    // トップページ更新
    const totalGrams = posts.reduce((sum, p) => sum + (p.grams || 0), 0);
    const uniquePeople = new Set(posts.map(p => p.name)).size;
    statPosts.textContent = posts.length;
    statPeople.textContent = uniquePeople;
    applyStage(totalGrams, posts.length);
    animateCounterTo(totalGrams);
  }

  function updateCharCount(){
    charCount.textContent = `${bodyInput.value.length} / 300`;
  }

  function submitPost(){
    const rawName = nameInput.value.trim();
    const comment = bodyInput.value.trim();
    const actionValue = actionSelect.value;
    const action = getActionConfig(actionValue);

    if(!comment){
      errorMsg.textContent = 'コメントを入力してください。';
      bodyInput.focus();
      return;
    }

    let grams;
    if(action.value === 'cleanup'){
      const parsed = parseInt(gramsInput.value, 10);
      grams = (!isNaN(parsed) && parsed > 0) ? parsed : 100;
    }else{
      grams = action.grams;
    }

    const name = rawName || '匿名パトロール隊';
    const posts = loadPosts();
    posts.push({
      id: Date.now() + Math.floor(Math.random()*1000),
      name,
      actionType: action.value,
      grams,
      comment,
      photo: currentPhoto,
      time: Date.now()
    });
    savePosts(posts);

    bodyInput.value = '';
    gramsInput.value = '';
    currentPhoto = null;
    renderPhotoPreview();
    updateCharCount();
    errorMsg.textContent = '';
    render();
    celebrate();
  }

  postBtn.addEventListener('click', submitPost);
  bodyInput.addEventListener('input', updateCharCount);
  bodyInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){ submitPost(); }
  });

  updateCharCount();
  render();
})();