/* ── Config ── */
const ATPT = 'B10';
const SCHOOL = '7011505';
const ALLERGY_LIST = [
    {id:1,name:'난류'},{id:2,name:'우유'},{id:3,name:'메밀'},{id:4,name:'땅콩'},{id:5,name:'대두'},
    {id:6,name:'밀'},{id:7,name:'고등어'},{id:8,name:'게'},{id:9,name:'새우'},{id:10,name:'돼지고기'},
    {id:11,name:'복숭아'},{id:12,name:'토마토'},{id:13,name:'아황산염'},{id:14,name:'호두'},{id:15,name:'닭고기'},
    {id:16,name:'쇠고기'},{id:17,name:'오징어'},{id:18,name:'조개류'},{id:19,name:'잣'}
];
const RATING_MSG = ['', '😫 최악','😕 별로','😐 보통','😋 맛있어!','🤩 최고!!'];

/* ── State ── */
let selectedDate = new Date(); // currently displayed date
let today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth(); // month for bottom sheet calendar
let myAllergies = JSON.parse(localStorage.getItem('myAllergies')||'[]');
let myRatings  = JSON.parse(localStorage.getItem('mealRatings')||'{}');

/* ── DOM refs ── */
const $dateLabel   = document.getElementById('date-label');
const $lunchStatus = document.getElementById('lunch-status');
const $mealList    = document.getElementById('meal-list');
const $mealTitle   = document.querySelector('.meal-title');
const $calBadge    = document.getElementById('cal-badge');
const $ratingSec   = document.getElementById('rating-section');
const $ratingMsg   = document.getElementById('rating-msg');
const $chips       = document.getElementById('allergy-chips');
const $allergyHint = document.getElementById('allergy-hint');
const $allergyToggle = document.getElementById('allergy-toggle');
const $bottomSheet = document.getElementById('bottom-sheet');
const $sheetMonth   = document.getElementById('sheet-month-label');
const $sheetGrid    = document.getElementById('bottom-calendar-grid');

/* ── Init ── */
(function init(){
    // top nav buttons
    document.getElementById('prev-day').onclick = () => changeDay(-1);
    document.getElementById('next-day').onclick = () => changeDay(1);
    document.getElementById('open-calendar').onclick = openSheet;
    document.getElementById('sheet-close').onclick = closeSheet;

    // rating stars
    document.querySelectorAll('.star').forEach(st=>{
        st.onclick = ()=>setRating(parseInt(st.dataset.value));
    });

    // allergy toggle
    let allergyOpen = false;
    $allergyToggle.onclick = () => {
        allergyOpen = !allergyOpen;
        $chips.style.display = allergyOpen ? 'flex' : 'none';
        $allergyHint.style.display = allergyOpen ? 'block' : 'none';
        $allergyToggle.textContent = allergyOpen ? '접기' : '펼치기';
    };

    renderAllergy();
    renderTopDate();
    loadMeal();
    updateLunchStatus();
    setInterval(updateLunchStatus,30000);
})();

/* ── Top date navigation ── */
function changeDay(delta){
    selectedDate.setDate(selectedDate.getDate()+delta);
    renderTopDate();
    loadMeal();
}

function renderTopDate(){
    const opts = { year:'numeric', month:'2-digit', day:'2-digit', weekday:'short'};
    // Example: 2026. 06. 12 (월)
    const parts = selectedDate.toLocaleDateString('ko-KR', opts).split('.');
    // parts: ["2026", " 06", " 12 (월)"]
    const year = parts[0];
    const month = parts[1].trim();
    const dayWeek = parts[2].trim();
    $dateLabel.textContent = `${year}. ${month}. ${dayWeek}`;
}

/* ── Lunch status ── */
function updateLunchStatus(){
    const now = new Date();
    const mins = now.getHours()*60+now.getMinutes();
    if(mins>=740 && mins<=790){
        $lunchStatus.textContent='🍽️ 현재 점심시간!';
        $lunchStatus.className='lunch-status active';
    }else{
        $lunchStatus.textContent='점심 12:20~13:10';
        $lunchStatus.className='lunch-status inactive';
    }
}

/* ── Meal fetching ── */
async function loadMeal(){
    const ymd = formatYMD(selectedDate);
    $mealList.innerHTML = '<div class="loader">불러오는 중...</div>';
    $calBadge.textContent='';

    try{
        const res = await fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&ATPT_OFCDC_SC_CODE=${ATPT}&SD_SCHUL_CODE=${SCHOOL}&MLSV_YMD=${ymd}`);
        const data = await res.json();
        if(data.mealServiceDietInfo){
            const row = data.mealServiceDietInfo[1].row[0];
            renderMeal(row.DDISH_NM);
            $calBadge.textContent = row.CAL_INFO||'';
            $ratingSec.style.display='';
            renderStars();
        }else{
            $mealList.innerHTML='<div class="empty">급식 정보가 없습니다 😢</div>';
            $ratingSec.style.display='none';
        }
    }catch(e){
        console.error(e);
        $mealList.innerHTML='<div class="empty">데이터 로드 실패</div>';
        $ratingSec.style.display='none';
    }
}

function renderMeal(raw){
    $mealList.innerHTML='';
    const items = raw.split('<br/>').map(s=>s.trim()).filter(Boolean);
    items.forEach(item=>{
        let clean = item.replace(/^\*+/,'').trim();
        let name = clean, nums=[];
        const m = clean.match(/(.+?)\s*\(([\d.]+)\)\s*$/);
        if(m){ name=m[1].trim(); nums=m[2].split('.').map(Number).filter(n=>!isNaN(n)); }
        const hit = myAllergies.filter(id=>nums.includes(id));
        const div = document.createElement('div');
        div.className='meal-item'+(hit.length?' allergy':'');
        if(hit.length){
            const names = ALLERGY_LIST.filter(a=>hit.includes(a.id)).map(a=>a.name).join(', ');
            div.textContent = `${name} ⚠️ (${names})`;
        }else{ div.textContent=name; }
        $mealList.appendChild(div);
    });
}

/* ── Rating ── */
function setRating(v){
    const key = formatYMD(selectedDate);
    myRatings[key]=v;
    localStorage.setItem('mealRatings',JSON.stringify(myRatings));
    renderStars();
    renderBottomCalendar(); // update rating dot
}

function renderStars(){
    const key = formatYMD(selectedDate);
    const val = myRatings[key]||0;
    document.querySelectorAll('.star').forEach(st=>{
        st.classList.toggle('active', parseInt(st.dataset.value)<=val);
    });
    $ratingMsg.textContent = RATING_MSG[val]||'별점을 눌러 주세요';
}

/* ── Allergy ── */
function renderAllergy(){
    $chips.innerHTML='';
    ALLERGY_LIST.forEach(a=>{
        const el=document.createElement('div');
        el.className='chip'+(myAllergies.includes(a.id)?' on':'');
        el.textContent=a.name;
        el.onclick=()=>{toggleAllergy(a.id,el);};
        $chips.appendChild(el);
    });
}
function toggleAllergy(id,el){
    const idx=myAllergies.indexOf(id);
    if(idx===-1){ myAllergies.push(id); el.classList.add('on'); }
    else{ myAllergies.splice(idx,1); el.classList.remove('on'); }
    localStorage.setItem('myAllergies',JSON.stringify(myAllergies));
    loadMeal();
}

/* ── Bottom sheet calendar ── */
function openSheet(){
    $bottomSheet.classList.add('open');
    renderBottomCalendar();
}
function closeSheet(){
    $bottomSheet.classList.remove('open');
}

function renderBottomCalendar(){
    $sheetMonth.textContent = `${viewYear}년 ${viewMonth+1}월`;
    $sheetGrid.innerHTML='';
    const first = new Date(viewYear, viewMonth,1);
    const startDow = first.getDay();
    const lastDay = new Date(viewYear, viewMonth+1,0).getDate();
    // previous month filler
    const prevLast = new Date(viewYear, viewMonth,0).getDate();
    for(let i=startDow-1;i>=0;i--){
        const el=makeCalDay(prevLast-i,true);
        $sheetGrid.appendChild(el);
    }
    // current month
    for(let d=1; d<=lastDay; d++){
        const date=new Date(viewYear, viewMonth, d);
        const el=makeCalDay(d,false);
        if(isSameDay(date, today)) el.classList.add('today');
        if(isSameDay(date, selectedDate)) el.classList.add('selected');
        const key=formatYMD(date);
        if(myRatings[key]) el.classList.add('has-rating');
        el.onclick=()=>{selectedDate=new Date(viewYear, viewMonth, d); renderTopDate(); loadMeal(); closeSheet();};
        $sheetGrid.appendChild(el);
    }
    // next month filler
    const total = startDow + lastDay;
    const remain = (7 - total%7)%7;
    for(let i=1;i<=remain;i++){
        const el=makeCalDay(i,true);
        $sheetGrid.appendChild(el);
    }
}

function makeCalDay(num,other){
    const div=document.createElement('div');
    div.className='cal-day'+(other?' other':'');
    div.textContent=num;
    return div;
}

function formatYMD(d){
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,'0');
    const day=String(d.getDate()).padStart(2,'0');
    return `${y}${m}${day}`;
}
function isSameDay(a,b){return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();}
