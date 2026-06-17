/* ── Config ── */
const ATPT   = 'B10';
const SCHOOL = '7011505';
const ALLERGY_LIST = [
    {id:1,name:'난류'},{id:2,name:'우유'},{id:3,name:'메밀'},{id:4,name:'땅콩'},{id:5,name:'대두'},
    {id:6,name:'밀'},{id:7,name:'고등어'},{id:8,name:'게'},{id:9,name:'새우'},{id:10,name:'돼지고기'},
    {id:11,name:'복숭아'},{id:12,name:'토마토'},{id:13,name:'아황산염'},{id:14,name:'호두'},{id:15,name:'닭고기'},
    {id:16,name:'쇠고기'},{id:17,name:'오징어'},{id:18,name:'조개류'},{id:19,name:'잣'}
];
const RATING_MSG = ['', '😫 최악', '😕 별로', '😐 보통', '😋 맛있어!', '🤩 최고!!'];
const DAYS_KO    = ['일', '월', '화', '수', '목', '금', '토'];

/* ── State ── */
let selectedDate  = new Date();
let today         = new Date();
let viewYear      = today.getFullYear();
let viewMonth     = today.getMonth();
let myAllergies   = JSON.parse(localStorage.getItem('myAllergies') || '[]');
let myRatings     = JSON.parse(localStorage.getItem('mealRatings') || '{}');
let myReviews     = JSON.parse(localStorage.getItem('mealReviews') || '{}');

/* ── DOM refs ── */
const $app          = document.getElementById('app');
const $dateLabel    = document.getElementById('date-label');
const $lunchStatus  = document.getElementById('lunch-status');
const $mealList     = document.getElementById('meal-list');
const $calBadge     = document.getElementById('cal-badge');
const $chips        = document.getElementById('allergy-chips');
const $allergyHint  = document.getElementById('allergy-hint');
const $allergyToggle= document.getElementById('allergy-toggle');
const $weekendBanner= document.getElementById('weekend-banner');
const $bottomSheet  = document.getElementById('bottom-sheet');
const $sheetOverlay = document.getElementById('sheet-overlay');
const $sheetMonth   = document.getElementById('sheet-month-label');
const $sheetGrid    = document.getElementById('bottom-calendar-grid');
// Review tab
const $stars        = document.querySelectorAll('.star');
const $ratingMsg    = document.getElementById('rating-msg');
const $reviewText   = document.getElementById('review-text');
const $charCount    = document.getElementById('char-count');
const $saveBtn      = document.getElementById('save-review');
const $savedReview  = document.getElementById('saved-review');
const $savedText    = document.getElementById('saved-text');
const $reviewDateSub= document.getElementById('review-date-sub');

/* ══════════════════════════════════════
   Init
══════════════════════════════════════ */
(function init() {
    // Date navigation
    document.getElementById('prev-day').onclick    = () => changeDay(-1);
    document.getElementById('next-day').onclick    = () => changeDay(1);
    document.getElementById('open-calendar').onclick = openSheet;
    document.getElementById('sheet-close').onclick  = closeSheet;
    document.getElementById('cal-prev-month').onclick = () => { viewMonth--; if(viewMonth<0){viewMonth=11;viewYear--;} renderBottomCalendar(); };
    document.getElementById('cal-next-month').onclick = () => { viewMonth++; if(viewMonth>11){viewMonth=0;viewYear++;} renderBottomCalendar(); };
    document.getElementById('go-today').onclick = () => {
        selectedDate = new Date();
        renderTopDate();
        loadMeal();
        renderReviewPage();
        closeSheet();
    };
    $sheetOverlay.onclick = closeSheet;

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => switchTab(btn.dataset.tab);
    });

    // Rating stars
    $stars.forEach(st => {
        st.onclick = () => {
            if (isWeekend(selectedDate)) return;
            setRating(parseInt(st.dataset.value));
        };
    });

    // Review textarea character count
    $reviewText.addEventListener('input', () => {
        $charCount.textContent = $reviewText.value.length;
    });

    // Save review button
    $saveBtn.onclick = saveReview;

    // Allergy toggle
    let allergyOpen = false;
    $allergyToggle.onclick = () => {
        allergyOpen = !allergyOpen;
        $chips.style.display       = allergyOpen ? 'flex'  : 'none';
        $allergyHint.style.display = allergyOpen ? 'block' : 'none';
        $allergyToggle.textContent = allergyOpen ? '접기'  : '펼치기';
    };

    renderAllergy();
    renderTopDate();
    loadMeal();
    renderReviewPage();
    updateLunchStatus();
    setInterval(updateLunchStatus, 30000);
})();

/* ══════════════════════════════════════
   Helpers
══════════════════════════════════════ */
function formatYMD(d) {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${dy}`;
}
function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
}
function isWeekend(d) {
    const dow = d.getDay();
    return dow === 0 || dow === 6; // 일=0, 토=6
}

/* ══════════════════════════════════════
   Date Navigation
══════════════════════════════════════ */
function changeDay(delta) {
    selectedDate = new Date(selectedDate);
    selectedDate.setDate(selectedDate.getDate() + delta);
    renderTopDate();
    loadMeal();
    renderReviewPage();
}

function renderTopDate() {
    const dow = DAYS_KO[selectedDate.getDay()];
    const y   = selectedDate.getFullYear();
    const m   = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d   = String(selectedDate.getDate()).padStart(2, '0');
    $dateLabel.textContent = `${y}. ${m}. ${d} (${dow})`;

    const weekend = isWeekend(selectedDate);
    $weekendBanner.style.display = weekend ? 'block' : 'none';
    $app.classList.toggle('weekend', weekend);
}

/* ══════════════════════════════════════
   Lunch Status
══════════════════════════════════════ */
function updateLunchStatus() {
    const now  = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    // 점심 12:20(740) ~ 13:10(790)
    if (mins >= 740 && mins <= 790) {
        $lunchStatus.textContent = '🍽️ 현재 점심시간!';
        $lunchStatus.className   = 'lunch-status active';
    } else {
        $lunchStatus.textContent = '점심 12:20 ~ 13:10';
        $lunchStatus.className   = 'lunch-status inactive';
    }
}

/* ══════════════════════════════════════
   Tab Switching
══════════════════════════════════════ */
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.getElementById('page-meal').style.display   = tab === 'meal'   ? 'flex' : 'none';
    document.getElementById('page-review').style.display = tab === 'review' ? 'flex' : 'none';
}

/* ══════════════════════════════════════
   Meal Fetching
══════════════════════════════════════ */
async function loadMeal() {
    const ymd = formatYMD(selectedDate);

    // Weekend: skip API call
    if (isWeekend(selectedDate)) {
        $mealList.innerHTML = '<div class="empty">📭 주말에는 급식 정보가 없습니다.</div>';
        $calBadge.textContent = '';
        return;
    }

    $mealList.innerHTML = '<div class="loader">불러오는 중...</div>';
    $calBadge.textContent = '';

    try {
        const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&ATPT_OFCDC_SC_CODE=${ATPT}&SD_SCHUL_CODE=${SCHOOL}&MLSV_YMD=${ymd}`;
        const res  = await fetch(url);
        const data = await res.json();
        if (data.mealServiceDietInfo) {
            const row = data.mealServiceDietInfo[1].row[0];
            renderMeal(row.DDISH_NM);
            $calBadge.textContent = row.CAL_INFO || '';
        } else {
            $mealList.innerHTML = '<div class="empty">급식 정보가 없습니다 😢</div>';
        }
    } catch(e) {
        console.error(e);
        $mealList.innerHTML = '<div class="empty">데이터 로드 실패</div>';
    }
}

function renderMeal(raw) {
    $mealList.innerHTML = '';
    const items = raw.split('<br/>').map(s => s.trim()).filter(Boolean);
    items.forEach(item => {
        let clean = item.replace(/^\*+/, '').trim();
        let name  = clean;
        let nums  = [];
        const m = clean.match(/(.+?)\s*\(([\d.]+)\)\s*$/);
        if (m) { name = m[1].trim(); nums = m[2].split('.').map(Number).filter(n => !isNaN(n)); }
        const hit = myAllergies.filter(id => nums.includes(id));
        const div = document.createElement('div');
        div.className = 'meal-item' + (hit.length ? ' allergy' : '');
        if (hit.length) {
            const names = ALLERGY_LIST.filter(a => hit.includes(a.id)).map(a => a.name).join(', ');
            div.textContent = `${name} ⚠️ (${names})`;
        } else {
            div.textContent = name;
        }
        $mealList.appendChild(div);
    });
}

/* ══════════════════════════════════════
   Rating & Review
══════════════════════════════════════ */
function setRating(v) {
    const key      = formatYMD(selectedDate);
    myRatings[key] = v;
    localStorage.setItem('mealRatings', JSON.stringify(myRatings));
    renderStars();
    renderBottomCalendar();
}

function renderStars() {
    const key     = formatYMD(selectedDate);
    const val     = myRatings[key] || 0;
    const weekend = isWeekend(selectedDate);
    $stars.forEach(st => {
        st.classList.toggle('active', parseInt(st.dataset.value) <= val);
        st.classList.toggle('disabled', weekend);
    });
    $ratingMsg.textContent = weekend
        ? '주말에는 리뷰를 작성할 수 없습니다.'
        : (RATING_MSG[val] || '별점을 눌러 주세요');
}

function saveReview() {
    if (isWeekend(selectedDate)) return;
    const key         = formatYMD(selectedDate);
    const text        = $reviewText.value.trim();
    myReviews[key]    = text;
    localStorage.setItem('mealReviews', JSON.stringify(myReviews));
    renderSavedReview();
    // brief visual feedback
    $saveBtn.textContent = '저장됐어요 ✅';
    setTimeout(() => { $saveBtn.textContent = '저장하기 💾'; }, 1500);
}

function renderSavedReview() {
    const key  = formatYMD(selectedDate);
    const text = myReviews[key] || '';
    if (text) {
        $savedReview.style.display = 'block';
        $savedText.textContent     = text;
    } else {
        $savedReview.style.display = 'none';
    }
}

function renderReviewPage() {
    const key     = formatYMD(selectedDate);
    const weekend = isWeekend(selectedDate);

    // sub date label
    const dow = DAYS_KO[selectedDate.getDay()];
    const y   = selectedDate.getFullYear();
    const m   = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d   = String(selectedDate.getDate()).padStart(2, '0');
    $reviewDateSub.textContent = `${y}. ${m}. ${d} (${dow})`;

    renderStars();

    // load saved review text
    $reviewText.value      = myReviews[key] || '';
    $charCount.textContent = $reviewText.value.length;

    // disable inputs on weekend
    $reviewText.disabled = weekend;
    $saveBtn.disabled    = weekend;

    renderSavedReview();
}

/* ══════════════════════════════════════
   Allergy
══════════════════════════════════════ */
function renderAllergy() {
    $chips.innerHTML = '';
    ALLERGY_LIST.forEach(a => {
        const el = document.createElement('div');
        el.className = 'chip' + (myAllergies.includes(a.id) ? ' on' : '');
        el.textContent = a.name;
        el.onclick = () => toggleAllergy(a.id, el);
        $chips.appendChild(el);
    });
}
function toggleAllergy(id, el) {
    const idx = myAllergies.indexOf(id);
    if (idx === -1) { myAllergies.push(id); el.classList.add('on'); }
    else            { myAllergies.splice(idx, 1); el.classList.remove('on'); }
    localStorage.setItem('myAllergies', JSON.stringify(myAllergies));
    loadMeal();
}

/* ══════════════════════════════════════
   Bottom Sheet Calendar
══════════════════════════════════════ */
function openSheet() {
    viewYear  = selectedDate.getFullYear();
    viewMonth = selectedDate.getMonth();
    $bottomSheet.classList.add('open');
    $sheetOverlay.classList.add('active');
    renderBottomCalendar();
}
function closeSheet() {
    $bottomSheet.classList.remove('open');
    $sheetOverlay.classList.remove('active');
}

function renderBottomCalendar() {
    $sheetMonth.textContent = `${viewYear}년 ${viewMonth + 1}월`;
    $sheetGrid.innerHTML = '';

    const first    = new Date(viewYear, viewMonth, 1);
    const startDow = first.getDay();
    const lastDay  = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevLast = new Date(viewYear, viewMonth, 0).getDate();

    // prev month filler
    for (let i = startDow - 1; i >= 0; i--) {
        $sheetGrid.appendChild(makeCalDay(prevLast - i, true, null));
    }
    // current month
    for (let d = 1; d <= lastDay; d++) {
        const date = new Date(viewYear, viewMonth, d);
        const key  = formatYMD(date);
        const dow  = date.getDay();
        const el   = makeCalDay(d, false, date);
        if (isSameDay(date, today))         el.classList.add('today');
        if (isSameDay(date, selectedDate))  el.classList.add('selected');
        if (myRatings[key])                 el.classList.add('has-rating');
        if (dow === 0) el.classList.add('is-sun');
        if (dow === 6) el.classList.add('is-sat');
        el.onclick = () => {
            selectedDate = new Date(viewYear, viewMonth, d);
            renderTopDate();
            loadMeal();
            renderReviewPage();
            closeSheet();
        };
        $sheetGrid.appendChild(el);
    }
    // next month filler
    const total  = startDow + lastDay;
    const remain = (7 - total % 7) % 7;
    for (let i = 1; i <= remain; i++) {
        $sheetGrid.appendChild(makeCalDay(i, true, null));
    }
}

function makeCalDay(num, other, date) {
    const div = document.createElement('div');
    div.className = 'cal-day' + (other ? ' other' : '');
    div.textContent = num;
    return div;
}
