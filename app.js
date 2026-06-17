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
const $calendarPage = document.getElementById('page-calendar');
const $calBackBtn   = document.getElementById('cal-back-btn');
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
    document.getElementById('open-calendar').onclick = showCalendarPage;
    $calBackBtn.onclick                              = hideCalendarPage;
    document.getElementById('cal-prev-month').onclick = () => { viewMonth--; if(viewMonth<0){viewMonth=11;viewYear--;} renderBottomCalendar(); };
    document.getElementById('cal-next-month').onclick = () => { viewMonth++; if(viewMonth>11){viewMonth=0;viewYear++;} renderBottomCalendar(); };

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
    setInterval(updateLunchStatus, 1000);
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
function isDateAllowed(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const curToday = new Date();
    
    // First day of current month
    const firstOfCurrentMonth = new Date(curToday.getFullYear(), curToday.getMonth(), 1);
    
    // 2 weeks ago (14 days)
    const twoWeeksAgo = new Date(curToday.getFullYear(), curToday.getMonth(), curToday.getDate() - 14);
    
    // End of current month
    const lastOfCurrentMonth = new Date(curToday.getFullYear(), curToday.getMonth() + 1, 0);
    
    // Min Date: earlier of 1st day of month or 14 days ago
    const minDate = new Date(Math.min(firstOfCurrentMonth, twoWeeksAgo));
    const maxDate = lastOfCurrentMonth;
    
    return d >= minDate && d <= maxDate;
}
function getNextLunchTime(now) {
    const target = new Date(now);
    target.setHours(12, 20, 0, 0);
    while (target <= now || target.getDay() === 0 || target.getDay() === 6) {
        target.setDate(target.getDate() + 1);
    }
    return target;
}

/* ── Date Navigation ── */
function changeDay(delta) {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + delta);
    if (!isDateAllowed(nextDate)) return;

    selectedDate = nextDate;
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

    // Disable prev/next buttons if outside allowed range
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    document.getElementById('prev-day').disabled = !isDateAllowed(prevDate);

    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    document.getElementById('next-day').disabled = !isDateAllowed(nextDate);

    const weekend = isWeekend(selectedDate);
    $weekendBanner.style.display = weekend ? 'block' : 'none';
    $app.classList.toggle('weekend', weekend);
}

/* ── Lunch Status ── */
function updateLunchStatus() {
    const now  = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    
    // Lunch time: 12:20 (740 mins) ~ 13:10 (790 mins) on weekdays
    if (!isWeekend(now) && mins >= 740 && mins <= 790) {
        $lunchStatus.textContent = '🍽️ 현재 점심시간!';
        $lunchStatus.className   = 'lunch-status active';
    } else {
        const nextLunch = getNextLunchTime(now);
        const diffMs = nextLunch - now;
        const diffSec = Math.floor(diffMs / 1000);
        const hours = Math.floor(diffSec / 3600);
        const minutes = Math.floor((diffSec % 3600) / 60);
        const seconds = diffSec % 60;
        
        let countdownText = '';
        if (hours > 0) {
            countdownText += `${hours}시간 `;
        }
        countdownText += `${minutes}분 ${seconds}초`;
        
        $lunchStatus.innerHTML = `점심시간이 아닙니다! <span style="font-weight: 600; color: var(--primary);">⏳ ${countdownText} 남음</span>`;
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

    // Weekend Check
    if (isWeekend(selectedDate)) {
        $mealList.innerHTML = '<div class="empty">학교를 안 나오는 날 <br><span class="reason">(주말)</span></div>';
        $calBadge.textContent = '';
        $weekendBanner.style.display = 'block';
        $weekendBanner.textContent = '📭 학교를 안 나오는 날 (주말)';
        $app.classList.add('weekend');
        document.getElementById('main-image').classList.add('hidden');
        hideSkeleton();
        return;
    }

            showSkeleton();
    $calBadge.textContent = '';
    $weekendBanner.style.display = 'none';
    $app.classList.remove('weekend');

    try {
        const mealUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&ATPT_OFCDC_SC_CODE=${ATPT}&SD_SCHUL_CODE=${SCHOOL}&MLSV_YMD=${ymd}`;
        const scheduleUrl = `https://open.neis.go.kr/hub/SchoolSchedule?Type=json&ATPT_OFCDC_SC_CODE=${ATPT}&SD_SCHUL_CODE=${SCHOOL}&AA_YMD=${ymd}`;
        
        const [mealRes, scheduleRes] = await Promise.all([
            fetch(mealUrl).catch(() => null),
            fetch(scheduleUrl).catch(() => null)
        ]);

        let mealData = null;
        let scheduleData = null;

        if (mealRes) mealData = await mealRes.json().catch(() => null);
        if (scheduleRes) scheduleData = await scheduleRes.json().catch(() => null);

        // Check for holiday / off day
        let isSchoolOffDay = false;
        let offDayReason = '';

        if (scheduleData && scheduleData.SchoolSchedule) {
            const rows = scheduleData.SchoolSchedule[1].row;
            for (const row of rows) {
                const sbtrNm = row.SBTR_DD_SC_NM || '';
                if (sbtrNm && sbtrNm !== '해당없음') {
                    isSchoolOffDay = true;
                    offDayReason = row.EVENT_NM || sbtrNm;
                    break;
                }
            }
        }

        if (isSchoolOffDay) {
                        $mealList.innerHTML = `
                <div class="empty">
                    학교를 안 나오는 날 📭
                    <span class="reason">(${offDayReason})</span>
                </div>
            `;
            document.getElementById('main-image').classList.add('hidden');
            hideSkeleton();
            $weekendBanner.style.display = 'block';
            $weekendBanner.textContent = `📭 학교를 안 나오는 날 (${offDayReason})`;
            $app.classList.add('weekend');
            return;
        }

        if (mealData && mealData.mealServiceDietInfo) {
            const row = mealData.mealServiceDietInfo[1].row[0];
                        renderMeal(row.DDISH_NM);
            setMainImage(row.DDISH_NM);
            hideSkeleton();
            $calBadge.textContent = row.CAL_INFO || '';
        } else {
            $mealList.innerHTML = '<div class="empty">급식 정보가 없습니다 😢</div>';
            document.getElementById('main-image').classList.add('hidden');
            hideSkeleton();
        }
    } catch(e) {
        console.error(e);
                    $mealList.innerHTML = '<div class="empty">데이터 로드 실패</div>';
            hideSkeleton();
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

/* ── Main Image ── */
function setMainImage(raw) {
  // Extract first line (main dish) from raw menu string
  const firstLine = raw.split('<br/>')[0].trim();
  const cleanName = firstLine.replace(/^\*+/, '').trim();
  // Keyword list for common main dishes (Korean)
  const keywords = ['돈까스','스파게티','김밥','떡볶이','라면','비빔밥','샌드위치','피자','햄버거','냉면'];
  let matched = '';
  for (const kw of keywords) {
    if (cleanName.includes(kw)) { matched = kw; break; }
  }
  // Use matched keyword if any, otherwise fallback to cleaned name
  const query = encodeURIComponent(matched || cleanName);
  const $img = document.getElementById('main-image');
  const unsplashUrl = `https://source.unsplash.com/featured/400x300?${query}`;
  const fallbackUrl = `https://picsum.photos/seed/${query}/400/300`;
  $img.innerHTML = `<img src="${unsplashUrl}" alt="${matched || cleanName}" onerror="this.onerror=null;this.src='${fallbackUrl}'"/>`;
  $img.classList.remove('hidden');
}




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
   Calendar Page Navigation & Rendering
   ══════════════════════════════════════ */
function showCalendarPage() {
    // Hide main screen sections
    document.querySelector('.date-nav-section').style.display = 'none';
    document.querySelector('.tab-bar').style.display = 'none';
    document.getElementById('page-meal').style.display = 'none';
    document.getElementById('page-review').style.display = 'none';

    // Show calendar page
    $calendarPage.style.display = 'flex';

    viewYear  = selectedDate.getFullYear();
    viewMonth = selectedDate.getMonth();
    renderBottomCalendar();
}

function hideCalendarPage() {
    // Show main screen sections
    document.querySelector('.date-nav-section').style.display = 'block';
    document.querySelector('.tab-bar').style.display = 'flex';

    // Show the active tab page
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    switchTab(activeTab);

    // Hide calendar page
    $calendarPage.style.display = 'none';
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
        const el   = makeCalDay(d, false, date);
        
        const allowed = isDateAllowed(date);
        if (!allowed) {
            el.classList.add('disabled');
        } else {
            if (isSameDay(date, today))         el.classList.add('today');
            if (isSameDay(date, selectedDate))  el.classList.add('selected');
            if (myRatings[key])                 el.classList.add('has-rating');
            if (isWeekend(date))                el.classList.add('weekend-day');
            el.onclick = () => {
                selectedDate = new Date(viewYear, viewMonth, d);
                renderTopDate();
                loadMeal();
                renderReviewPage();
                hideCalendarPage();
            };
        }
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
/* ── Main Image ── */
function setMainImage(raw) {
  // Extract first line (main dish) from raw menu string
  const firstLine = raw.split('<br/>')[0].trim();
  const cleanName = firstLine.replace(/^\*+/, '').trim();
  // Keyword list for common main dishes (Korean)
  const keywords = ['돈까스','스파게티','김밥','떡볶이','라면','비빔밥','샌드위치','피자','햄버거','냉면'];
  let matched = '';
  for (const kw of keywords) {
    if (cleanName.includes(kw)) { matched = kw; break; }
  }
  // Use matched keyword if any, otherwise fallback to cleaned name
  const query = encodeURIComponent(matched || cleanName);
  const $img = document.getElementById('main-image');
  const unsplashUrl = `https://source.unsplash.com/featured/400x300?${query}`;
  const fallbackUrl = `https://picsum.photos/seed/${query}/400/300`;
  $img.innerHTML = `<img src="${unsplashUrl}" alt="${matched || cleanName}" onerror="this.onerror=null;this.src='${fallbackUrl}'"/>`;
  $img.classList.remove('hidden');
}




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
   Calendar Page Navigation & Rendering
   ══════════════════════════════════════ */
function showCalendarPage() {
    // Hide main screen sections
    document.querySelector('.date-nav-section').style.display = 'none';
    document.querySelector('.tab-bar').style.display = 'none';
    document.getElementById('page-meal').style.display = 'none';
    document.getElementById('page-review').style.display = 'none';

    // Show calendar page
    $calendarPage.style.display = 'flex';

    viewYear  = selectedDate.getFullYear();
    viewMonth = selectedDate.getMonth();
    renderBottomCalendar();
}

function hideCalendarPage() {
    // Show main screen sections
    document.querySelector('.date-nav-section').style.display = 'block';
    document.querySelector('.tab-bar').style.display = 'flex';

    // Show the active tab page
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    switchTab(activeTab);

    // Hide calendar page
    $calendarPage.style.display = 'none';
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
        const el   = makeCalDay(d, false, date);
        
        const allowed = isDateAllowed(date);
        if (!allowed) {
            el.classList.add('disabled');
        } else {
            if (isSameDay(date, today))         el.classList.add('today');
            if (isSameDay(date, selectedDate))  el.classList.add('selected');
            if (myRatings[key])                 el.classList.add('has-rating');
            if (isWeekend(date))                el.classList.add('weekend-day');
            el.onclick = () => {
                selectedDate = new Date(viewYear, viewMonth, d);
                renderTopDate();
                loadMeal();
                renderReviewPage();
                hideCalendarPage();
            };
        }
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

/* ══════════════════════════════════════
   Skeleton UI
══════════════════════════════════════ */
function showSkeleton() {
    const $skeletonContainer = document.getElementById('skeleton-meal');
    const $mealList = document.getElementById('meal-list');
    $mealList.classList.add('hidden');
    $skeletonContainer.classList.remove('hidden');
    $skeletonContainer.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        const item = document.createElement('div');
        item.className = 'skeleton skeleton-meal-item pulse';
        $skeletonContainer.appendChild(item);
    }
}

function hideSkeleton() {
    const $skeletonContainer = document.getElementById('skeleton-meal');
    const $mealList = document.getElementById('meal-list');
    $skeletonContainer.classList.add('hidden');
    $mealList.classList.remove('hidden');
}
