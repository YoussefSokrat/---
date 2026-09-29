/* ==================================================================
   Firebase (نسخة Compat) — سكريبتات عادية بدل ES Modules
   أضمن وأكثر توافقًا مع كل بيئات التشغيل (Live Server، الاستضافة، إلخ)
   ================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyAf36-2wJHyT3BcSlhKDvBcwvC_UYKG0F4",
  authDomain: "deacon-2e046.firebaseapp.com",
  projectId: "deacon-2e046",
  storageBucket: "deacon-2e046.firebasestorage.app",
  messagingSenderId: "833125342982",
  appId: "1:833125342982:web:6c5fa5238f4fe07610c887",
  measurementId: "G-V591C5ZGF1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let deacons = [];
let pendingRequests = [];
let attendanceRecords = [];
let followUpRecords = {};
let serviceRecords = [];

let html5QrCode = null;

const studyYearsHierarchy = [
    "أولى ابتدائي", "تانية ابتدائي", "تالتة ابتدائي",
    "رابعة ابتدائي", "خامسة ابتدائي", "سادسة ابتدائي",
    "أولى إعدادي", "تانية إعدادي", "تالتة إعدادي",
    "أولى ثانوي", "تانية ثانوي", "تالتة ثانوي", "جامعي"
];

// ملء قوائم السنوات الدراسية من مصدر واحد (الترتيب من أولى ابتدائي إلى جامعي)
function populateYearSelects() {
    ['pubStudyYear', 'editStudyYear', 'serviceYearFilter'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = studyYearsHierarchy.map(y => `<option value="${y}">${y}</option>`).join('');
    });
}
populateYearSelects();

function sortDeaconsByCode(arr) {
    return arr.sort((a, b) => {
        let numA = parseFloat(a.code);
        let numB = parseFloat(b.code);
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }
        return a.code.localeCompare(b.code, 'ar', { numeric: true });
    });
}

function initRealtimeListeners() {
    db.collection("deacons").onSnapshot((snapshot) => {
        deacons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        sortDeaconsByCode(deacons);
        renderAllData();
        hideGoldenLoader();
    });

    db.collection("pendingRequests").onSnapshot((snapshot) => {
        pendingRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAllData();
    });

    db.collection("attendanceRecords").onSnapshot((snapshot) => {
        attendanceRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAllData();
    });

    db.collection("serviceRecords").onSnapshot((snapshot) => {
        serviceRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAllData();
    });

    db.collection("followUpRecords").onSnapshot((snapshot) => {
        followUpRecords = {};
        snapshot.forEach(doc => {
            followUpRecords[doc.id] = doc.data();
        });
        renderAllData();
    });
}

initRealtimeListeners();

/* ==================================================================
   1) الإشعارات الذكية الفريدة — The Mystic Toast
   ================================================================== */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if(!container) { window.alert(message); return; }

    const duration = 2600;
    const toast = document.createElement('div');
    toast.className = `mystic-toast mystic-toast-${type}`;
    const iconPath = type === 'success'
        ? '<path d="M6 17 L13 24 L26 9"></path>'
        : '<path d="M9 9 L23 23 M23 9 L9 23"></path>';
    toast.innerHTML = `
        <div class="toast-icon"><svg viewBox="0 0 32 32">${iconPath}</svg></div>
        <div class="toast-message">${message}</div>
        <div class="toast-bar"><i style="animation-duration:${duration}ms;"></i></div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('toast-show')));

    if(type === 'error') {
        setTimeout(() => toast.classList.add('toast-shake'), 200);
    }

    const removeToast = () => {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 260);
    };

    const timeoutId = setTimeout(removeToast, duration);
    toast.addEventListener('click', () => { clearTimeout(timeoutId); removeToast(); });
}

/* ==================================================================
   1-ب) نافذة تأكيد / إدخال متحركة في منتصف الصفحة (بديل confirm و prompt)
   ================================================================== */
function showDialog({ message, icon = '!', danger = false, okText = 'تأكيد', cancelText = 'إلغاء', input = false, placeholder = '' }) {
    return new Promise(resolve => {
        const back = document.createElement('div');
        back.className = 'confirm-backdrop';
        back.innerHTML = `
            <div class="confirm-box ${danger ? 'cf-danger' : ''}">
                <div class="confirm-icon">${icon}</div>
                <div class="confirm-msg"></div>
                ${input ? `<input type="text" class="confirm-input" placeholder="${placeholder}">` : ''}
                <div class="confirm-actions">
                    <button class="btn-action ${danger ? 'btn-danger' : 'btn-church'} cf-ok">${okText}</button>
                    <button class="btn-action btn-secondary-back cf-cancel">${cancelText}</button>
                </div>
            </div>`;
        back.querySelector('.confirm-msg').textContent = message;
        document.body.appendChild(back);
        requestAnimationFrame(() => requestAnimationFrame(() => back.classList.add('cf-show')));

        const inputEl = back.querySelector('.confirm-input');
        if (inputEl) setTimeout(() => inputEl.focus(), 150);

        const close = (result) => {
            back.classList.remove('cf-show');
            setTimeout(() => back.remove(), 250);
            document.removeEventListener('keydown', onKey);
            resolve(result);
        };
        const okValue = () => input ? inputEl.value : true;
        const onKey = (e) => {
            if (e.key === 'Escape') close(input ? null : false);
            if (e.key === 'Enter') close(okValue());
        };
        document.addEventListener('keydown', onKey);
        back.querySelector('.cf-ok').addEventListener('click', () => close(okValue()));
        back.querySelector('.cf-cancel').addEventListener('click', () => close(input ? null : false));
    });
}
const askConfirm = (message, opts = {}) => showDialog({ message, ...opts });
const askInput = (message, placeholder = '') => showDialog({ message, icon: '✎', input: true, placeholder, okText: 'حفظ' });

/* ==================================================================
   2) شاشة التحميل — إخفاء المذبح الذهبي بعد جاهزية البيانات
   ================================================================== */
let goldenLoaderHidden = false;
function hideGoldenLoader() {
    if(goldenLoaderHidden) return;
    goldenLoaderHidden = true;
    const loader = document.getElementById('goldenLoader');
    if(loader) loader.classList.add('loader-hidden');
}
setTimeout(hideGoldenLoader, 4000);

/* ==================================================================
   3) الوضع الليلي السينمائي — Ripple Dark Mode
   ================================================================== */
window.toggleDarkMode = function(evt) {
    const overlay = document.getElementById('rippleOverlay');
    const isDark = document.body.classList.contains('dark-mode');
    const x = evt && evt.clientX ? evt.clientX : window.innerWidth / 2;
    const y = evt && evt.clientY ? evt.clientY : window.innerHeight / 2;
    const maxRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) * 2;

    overlay.style.left = x + 'px';
    overlay.style.top = y + 'px';
    overlay.style.width = maxRadius + 'px';
    overlay.style.height = maxRadius + 'px';

    overlay.classList.remove('ripple-reverse');
    void overlay.offsetWidth; // إعادة تشغيل الأنيميشن
    overlay.classList.add('ripple-active');

    setTimeout(() => {
        if(isDark) {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('deaconAppTheme', 'light');
        } else {
            document.body.classList.add('dark-mode');
            localStorage.setItem('deaconAppTheme', 'dark');
        }
        overlay.classList.remove('ripple-active');
        overlay.classList.add('ripple-reverse');
    }, 650);
};

(function initSavedTheme() {
    if(localStorage.getItem('deaconAppTheme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
})();

const ADMIN_PASS = "5654";
const attendDateInput = document.getElementById('attenddate');
if(attendDateInput) attendDateInput.valueAsDate = new Date();

window.openServantLogin = function() { 
    document.getElementById('welcomeHomeOverlay').style.display = 'none'; 
    document.getElementById('loginOverlay').style.display = 'flex';
    setTimeout(() => { document.getElementById('adminPassword').focus(); }, 100);
};

window.closeServantLogin = function() { 
    document.getElementById('loginOverlay').style.display = 'none'; 
    document.getElementById('welcomeHomeOverlay').style.display = 'flex'; 
};

window.openPublicRegister = function() { 
    document.getElementById('welcomeHomeOverlay').style.display = 'none'; 
    document.getElementById('publicRegisterModal').style.display = 'flex';
    setTimeout(() => { document.getElementById('pubName').focus(); }, 100);
};

window.closePublicRegister = function() { 
    document.getElementById('publicRegisterModal').style.display = 'none'; 
    document.getElementById('welcomeHomeOverlay').style.display = 'flex'; 
};

window.checkAdminLogin = function() {
    if(document.getElementById('adminPassword').value === ADMIN_PASS) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainPlatform').style.display = 'flex';
        document.getElementById('adminPassword').value = '';
        renderAllData();
        showToast('تم تسجيل الدخول بنجاح', 'success');
        checkNayrouzPromotion();
    } else { 
        showToast('كلمة المرور غير صحيحة!', 'error'); 
    }
};

window.logoutSystem = function() { 
    // نحمي الخروج من أي خطأ في إيقاف الكاميرا حتى لا يتعطل الزرار
    try { stopScanner(); } catch (e) {}
    document.getElementById('mainPlatform').style.display = 'none'; 
    document.getElementById('welcomeHomeOverlay').style.display = 'flex'; 
    showToast('تم تسجيل الخروج بنجاح', 'success');
};

window.togglePubOrd = function(el) { 
    let show = (el.value === 'مرسوم');
    document.getElementById('pubOrdGroup').style.display = show ? 'block' : 'none';
    document.getElementById('pubOrdDateGroup').style.display = show ? 'block' : 'none';
};

window.toggleEditOrd = function(el) { 
    let show = (el.value === 'مرسوم');
    document.getElementById('editOrdGroup').style.display = show ? 'block' : 'none';
    document.getElementById('editOrdDateGroup').style.display = show ? 'block' : 'none';
};

window.submitPublicApplication = function() {
    const name = document.getElementById('pubName').value.trim();
    const dob = document.getElementById('pubDob').value;
    const studyYear = document.getElementById('pubStudyYear').value;
    const confessionFather = document.getElementById('pubConfessionFather').value.trim();
    const status = document.getElementById('pubStatus').value;
    const ordination = document.getElementById('pubOrdination').value;
    const ordinationDate = document.getElementById('pubOrdDate').value;
    const phone = document.getElementById('pubPhone').value.trim();
    const photoInput = document.getElementById('pubPhoto');

    if(!name || !dob || !studyYear || !confessionFather || !phone) { showToast('يرجى ملء كافة الحقول الأساسية!', 'error'); return; }
    let reader = new FileReader();
    if(photoInput.files && photoInput.files[0]) {
        reader.readAsDataURL(photoInput.files[0]);
        reader.onload = function(e) { saveReq(name, dob, studyYear, confessionFather, status, ordination, ordinationDate, phone, e.target.result); };
    } else { saveReq(name, dob, studyYear, confessionFather, status, ordination, ordinationDate, phone, 'https://via.placeholder.com/100'); }
};

async function saveReq(name, dob, studyYear, confessionFather, status, ordination, ordinationDate, phone, photo) {
    try {
        await db.collection("pendingRequests").add({ 
            name, dob, studyYear, confessionFather, status, 
            ordination: status==='مرسوم'?ordination:'-', 
            ordinationDate: status==='مرسوم'?ordinationDate:'-', 
            phone, photo, createdAt: Date.now() 
        });
        showToast('تم إرسال الطلب بنجاح!', 'success'); 
        window.closePublicRegister();
    } catch (error) {
        showToast('حدث خطأ أثناء إرسال الطلب.', 'error');
    }
}

window.switchView = function(viewId, btn) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active-btn'));
    document.getElementById(viewId).classList.add('active');
    if(btn) btn.classList.add('active-btn');
    renderAllData();
    if(viewId === 'viewAttendance') {
        setTimeout(() => { document.getElementById('scanInput').focus(); }, 100);
    } else {
        stopScanner();
    }
};

function renderAllData() {
    const badge = document.getElementById('reqBadge');
    if(badge) badge.innerText = pendingRequests.length;
    renderRequestsTable();
    renderMainDatabase();
    renderIdCards();
    renderFollowUpTable();
    renderAttendanceTable();
    renderServiceDeaconsList();
    renderServiceLogTable();
}

window.approveRequest = async function(index) {
    let req = pendingRequests[index];
    let customCode = await askInput(`أدخل الكود التعريفي للشماس (${req.name}):`, 'الكود');
    if(!customCode) return;
    customCode = customCode.trim();

    if(deacons.find(d => d.code === customCode)) {
        showToast('هذا الكود مستخدم بالفعل لشماس آخر!', 'error');
        return;
    }

    try {
        await db.collection("deacons").add({ 
            code: customCode, 
            name: req.name, 
            dob: req.dob, 
            studyYear: req.studyYear, 
            confessionFather: req.confessionFather, 
            status: req.status, 
            ordination: req.ordination, 
            ordinationDate: req.ordinationDate, 
            phone: req.phone, 
            photo: req.photo 
        });

        await db.collection("pendingRequests").doc(req.id).delete();
        showToast('تم قبول الشماس وتكويده بنجاح!', 'success');
    } catch (e) {
        showToast('حدث خطأ أثناء عملية القبول.', 'error');
    }
};

window.rejectRequest = async function(index) { 
    if(await askConfirm('متأكد من رفض هذا الطلب؟', { danger: true, icon: '✕', okText: 'رفض' })) { 
        let req = pendingRequests[index];
        try {
            await db.collection("pendingRequests").doc(req.id).delete();
            showToast('تم رفض الطلب بنجاح!', 'success');
        } catch (e) {
            showToast('حدث خطأ أثناء الرفض.', 'error');
        }
    } 
};

function renderRequestsTable() {
    const tb = document.getElementById('requestsTableBody'); 
    if(!tb) return;
    tb.innerHTML = '';
    pendingRequests.forEach((r, i) => {
        tb.innerHTML += `<tr>
            <td><img src="${r.photo}" class="deacon-avatar"></td>
            <td>${r.name}</td><td>${r.dob}</td><td>${r.studyYear}</td><td>${r.confessionFather}</td>
            <td>${r.status} ${r.ordination!=='-'? '('+r.ordination+' - '+r.ordinationDate+')':''}</td>
            <td class="ltr-text">${r.phone}</td>
            <td><button class="btn-action btn-success" onclick="approveRequest(${i})">قبول</button> <button class="btn-action btn-danger" onclick="rejectRequest(${i})">رفض</button></td>
        </tr>`;
    });
}

/* ==================================================================
   5) البحث الذكي الفوري + فلترة حسب المرحلة الدراسية
   ================================================================== */
let currentDatabaseFilter = 'الكل';

function renderDatabaseFilterChips() {
    const chipsRow = document.getElementById('databaseFilterChips');
    if(!chipsRow) return;

    const categories = ['الكل', ...studyYearsHierarchy];
    chipsRow.innerHTML = categories.map(cat => `
        <button type="button" class="filter-chip ${cat === currentDatabaseFilter ? 'active-chip' : ''}" onclick="setDatabaseFilter('${cat}', this)">${cat}</button>
    `).join('');
}

window.setDatabaseFilter = function(category, btn) {
    currentDatabaseFilter = category;
    document.querySelectorAll('#databaseFilterChips .filter-chip').forEach(c => c.classList.remove('active-chip'));
    if(btn) btn.classList.add('active-chip');
    window.renderMainDatabase();
};

window.renderMainDatabase = function() {
    const q = document.getElementById('searchDatabaseInput') ? document.getElementById('searchDatabaseInput').value.toLowerCase().trim() : '';
    const tb = document.getElementById('deaconsMainTable'); 
    if(!tb) return;

    renderDatabaseFilterChips();
    tb.innerHTML = '';
    
    let filtered = deacons.filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.phone.includes(q);
        const matchesCategory = currentDatabaseFilter === 'الكل' || d.studyYear === currentDatabaseFilter;
        return matchesSearch && matchesCategory;
    });
    sortDeaconsByCode(filtered);

    if(filtered.length === 0) {
        tb.innerHTML = `<tr class="no-results-row"><td colspan="8">لا توجد نتائج مطابقة للبحث أو الفلترة الحالية</td></tr>`;
        return;
    }

    filtered.forEach(d => {
        tb.innerHTML += `<tr>
            <td><img src="${d.photo}" class="deacon-avatar"></td>
            <td><b class="ltr-text">${d.code}</b></td>
            <td>${d.name}</td>
            <td>${d.studyYear}</td>
            <td>${d.confessionFather}</td>
            <td>${d.status} ${d.ordination!=='-'? '<br><small>('+d.ordination+' / '+d.ordinationDate+')</small>':''}</td>
            <td class="ltr-text">${d.phone}</td>
            <td>
                <button class="btn-action btn-church" style="padding:4px 8px;" onclick="openEditModal('${d.code}')">تعديل</button>
                <button class="btn-action btn-danger" style="padding:4px 8px;" onclick="deleteDeacon('${d.id}')">حذف</button>
            </td>
        </tr>`;
    });
};

window.openEditModal = function(code) {
    let d = deacons.find(x => x.code === code);
    if(!d) return;
    document.getElementById('editOriginalCode').value = d.id;
    document.getElementById('editCode').value = d.code;
    document.getElementById('editName').value = d.name;
    document.getElementById('editDob').value = d.dob || '';
    document.getElementById('editStudyYear').value = d.studyYear;
    document.getElementById('editConfessionFather').value = d.confessionFather || '';
    document.getElementById('editStatus').value = d.status || 'غير مرسوم';
    window.toggleEditOrd(document.getElementById('editStatus'));
    document.getElementById('editOrdination').value = d.ordination !== '-' ? d.ordination : '';
    document.getElementById('editOrdDate').value = d.ordinationDate !== '-' ? d.ordinationDate : '';
    document.getElementById('editPhone').value = d.phone || '';
    document.getElementById('editPhoto').value = '';
    document.getElementById('editDeaconModal').style.display = 'flex';
};

window.closeEditModal = function() { document.getElementById('editDeaconModal').style.display = 'none'; };

window.saveEditedDeacon = async function() {
    let docId = document.getElementById('editOriginalCode').value;
    let d = deacons.find(x => x.id === docId);
    if(d) {
        let newCode = document.getElementById('editCode').value.trim();
        if(newCode !== d.code && deacons.find(x => x.code === newCode)) {
            showToast('هذا الكود الجديد مستخدم بالفعل لشماس آخر!', 'error');
            return;
        }

        let updatedData = {
            code: newCode,
            name: document.getElementById('editName').value,
            dob: document.getElementById('editDob').value,
            studyYear: document.getElementById('editStudyYear').value,
            confessionFather: document.getElementById('editConfessionFather').value,
            status: document.getElementById('editStatus').value,
            ordination: document.getElementById('editStatus').value === 'مرسوم' ? document.getElementById('editOrdination').value : '-',
            ordinationDate: document.getElementById('editStatus').value === 'مرسوم' ? document.getElementById('editOrdDate').value : '-',
            phone: document.getElementById('editPhone').value
        };

        let photoInput = document.getElementById('editPhoto');
        if(photoInput.files && photoInput.files[0]) {
            let reader = new FileReader();
            reader.readAsDataURL(photoInput.files[0]);
            reader.onload = async function(e) {
                updatedData.photo = e.target.result;
                await db.collection("deacons").doc(docId).update(updatedData);
                window.closeEditModal(); renderAllData(); showToast('تم الحفظ بنجاح!', 'success');
            };
        } else {
            await db.collection("deacons").doc(docId).update(updatedData);
            window.closeEditModal(); renderAllData(); showToast('تم الحفظ بنجاح!', 'success');
        }
    }
};

window.deleteDeacon = async function(docId) { 
    if(await askConfirm('هل تريد حذف هذا الشماس نهائيًا؟', { danger: true, icon: '🗑', okText: 'حذف' })) { 
        try {
            await db.collection("deacons").doc(docId).delete();
            showToast('تم الحذف بنجاح!', 'success');
        } catch (e) {
            showToast('حدث خطأ أثناء الحذف.', 'error');
        }
    } 
};

window.renderServiceDeaconsList = function() {
    const yearElement = document.getElementById('serviceYearFilter');
    if(!yearElement) return;
    const year = yearElement.value;
    const tb = document.getElementById('serviceDeaconsTableBody'); 
    if(!tb) return;
    tb.innerHTML = '';
    
    let filtered = deacons.filter(d => d.studyYear === year);
    sortDeaconsByCode(filtered);

    filtered.forEach(d => {
        tb.innerHTML += `<tr>
            <td><img src="${d.photo}" class="deacon-avatar"></td>
            <td class="ltr-text">${d.code}</td>
            <td>${d.name}</td>
            <td><button class="btn-action btn-church" onclick="assignService('${d.code}', 'خدمة قراءات')">تعيين قراءات</button></td>
            <td><button class="btn-action btn-success" onclick="assignService('${d.code}', 'خدمة مسبح')">تعيين مسبح</button></td>
        </tr>`;
    });
};

window.assignService = async function(code, serviceType) {
    let now = new Date();
    let lastServ = serviceRecords.slice().reverse().find(s => s.code === code && s.serviceType === serviceType);
    
    if(lastServ) {
        let lastDate = new Date(lastServ.date);
        let diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);
        if(diffDays < 30) {
            if(!(await askConfirm(`تنبيه: هذا الشماس خدم (${serviceType}) منذ أقل من شهر (${lastServ.date}). هل تريد المتابعة؟`, { okText: 'متابعة' }))) return;
        }
    }

    let dateStr = now.toISOString().split('T')[0];
    try {
        await db.collection("serviceRecords").add({ code, serviceType, date: dateStr });
        showToast(`تم تسجيل (${serviceType}) بنجاح!`, 'success');
    } catch (e) {
        showToast('حدث خطأ أثناء حفظ الخدمة.', 'error');
    }
};

function renderServiceLogTable() {
    const tb = document.getElementById('serviceLogTableBody'); 
    if(!tb) return;
    tb.innerHTML = '';
    serviceRecords.forEach((s) => {
        let d = deacons.find(x => x.code === s.code);
        tb.innerHTML += `<tr><td class="ltr-text">${s.code}</td><td>${d ? d.name : 'غير معروف'}</td><td>${s.serviceType}</td><td>${s.date}</td><td><button class="btn-action btn-danger" onclick="deleteServiceRecord('${s.id}')">حذف</button></td></tr>`;
    });
}

window.deleteServiceRecord = async function(docId) { 
    try {
        await db.collection("serviceRecords").doc(docId).delete();
        showToast('تم الحذف بنجاح!', 'success');
    } catch (e) {
        showToast('حدث خطأ أثناء الحذف.', 'error');
    }
};

window.startScanner = function() {
    const readerDiv = document.getElementById('reader');
    readerDiv.style.display = 'block';
    document.getElementById('stopScannerBtn').style.display = 'inline-block';

    html5QrCode = new Html5Qrcode("reader");
    
    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 250, height: 100 } },
        (decodedText) => {
            const scanInput = document.getElementById('scanInput');
            if(scanInput) { scanInput.value = decodedText; }
            window.stopScanner();
        },
        (errorMessage) => {}
    ).catch((err) => {
        showToast("فشل تشغيل الكاميرا: " + err, 'error');
    });
};

window.stopScanner = function() {
    const readerDiv = document.getElementById('reader');
    const stopBtn = document.getElementById('stopScannerBtn');
    const hideUI = () => {
        if (readerDiv) readerDiv.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'none';
    };
    if (!html5QrCode) { hideUI(); return; }
    const scanner = html5QrCode;
    html5QrCode = null;
    try {
        // stop() قد ترمي خطأ مباشرة لو الكاميرا مش شغالة، فبنحميها
        Promise.resolve(scanner.stop()).then(hideUI).catch(hideUI);
    } catch (e) {
        hideUI();
    }
};

window.processScan = async function(type) {
    const val = document.getElementById('scanInput').value.trim();
    const date = document.getElementById('attenddate').value;
    const alertBox = document.getElementById('scanResultAlert');
    if(!val || !date) { showToast('أدخل الكود أو الاسم وتاريخ الحضور!', 'error'); return; }

    let deacon = deacons.find(d => d.code.toLowerCase() === val.toLowerCase() || d.name.toLowerCase() === val.toLowerCase());
    if(!deacon) {
        alertBox.style.display = 'block'; alertBox.style.background = '#f8d7da'; alertBox.style.color = '#721c24';
        alertBox.innerText = 'خطأ: الشماس غير مسجل!'; return;
    }

    let rec = attendanceRecords.find(r => r.code === deacon.code && r.date === date);
    try {
        if(!rec) {
            let newRec = { code: deacon.code, date, classStatus: type === 'class' ? 'حاضر' : 'غائب', massStatus: type === 'mass' ? 'حاضر' : 'غائب' };
            await db.collection("attendanceRecords").add(newRec);
        } else {
            let updatePayload = {};
            if(type === 'class') updatePayload.classStatus = 'حاضر';
            if(type === 'mass') updatePayload.massStatus = 'حاضر';
            await db.collection("attendanceRecords").doc(rec.id).update(updatePayload);
        }

        alertBox.style.display = 'block'; alertBox.style.background = '#d4edda'; alertBox.style.color = '#155724';
        alertBox.innerText = `تم تسجيل حضور (${type==='class'?'حصة':'قداس'}) للشماس: ${deacon.name}`;
        document.getElementById('scanInput').value = '';
        document.getElementById('scanInput').focus();
    } catch (e) {
        showToast('حدث خطأ أثناء تسجيل الحضور.', 'error');
    }
};

function renderAttendanceTable() {
    const tb = document.getElementById('attendanceTableBody'); 
    if(!tb) return;
    tb.innerHTML = '';
    
    let sortedAttendance = [...attendanceRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedAttendance.forEach((r) => {
        let d = deacons.find(x => x.code === r.code);
        tb.innerHTML += `<tr><td class="ltr-text">${r.code}</td><td>${d?d.name:'غير معروف'}</td><td>${r.date}</td><td>${r.classStatus}</td><td>${r.massStatus}</td><td><button class="btn-action btn-danger" onclick="deleteAtt('${r.id}')">حذف</button></td></tr>`;
    });
}

window.deleteAtt = async function(docId) { 
    try {
        await db.collection("attendanceRecords").doc(docId).delete();
        showToast('تم الحذف بنجاح!', 'success');
    } catch (e) {
        showToast('حدث خطأ أثناء الحذف.', 'error');
    }
};

function renderFollowUpTable() {
    const tb = document.getElementById('followUpTableBody');
    if(!tb) return;
    tb.innerHTML = '';
    
    let sortedDeacons = [...deacons];
    sortDeaconsByCode(sortedDeacons);

    sortedDeacons.forEach(d => {
        let attCount = attendanceRecords.filter(r => r.code === d.code && (r.classStatus === 'حاضر' || r.massStatus === 'حاضر')).length;
        let followData = followUpRecords[d.code];
        
        let statusText = `<span style="color: #c0392b;">لم يتم الافتقاد</span>`;
        if (followData) {
            let parts = [];
            if (followData.lastVisited) parts.push(`<span style="color: #27ae60; font-weight: bold;">آخر افتقاد: ${followData.lastVisited}</span>`);
            if (followData.excuse) parts.push(`<span style="color: #2980b9; font-weight: bold;">العذر: ${followData.excuse}</span>`);
            if (parts.length > 0) statusText = parts.join('<br>');
        }

        tb.innerHTML += `<tr>
            <td><img src="${d.photo}" class="deacon-avatar"></td>
            <td class="ltr-text">${d.code}</td>
            <td>${d.name}</td>
            <td>${d.studyYear}</td>
            <td>${attCount} مرات</td>
            <td>${statusText}</td>
            <td>
                <div style="display: flex; gap: 5px; align-items: center; justify-content: center; flex-wrap: wrap;">
                    <button class="btn-action btn-church" style="padding: 6px 10px;" onclick="markFollowUp('${d.code}')" title="تم الافتقاد">الافتقاد</button>
                    <button class="btn-action" style="background: #27ae60; color: white; padding: 6px 10px;" onclick="callDeaconPhone('${d.phone}')" title="الاتصال بالهاتف">📞</button>
                    <button class="btn-action" style="background: #e67e22; color: white; padding: 6px 10px;" onclick="openExcuseModal('${d.code}', '${d.name}')" title="كتابة عذر">عذر</button>
                    <button class="btn-action btn-danger" style="padding: 6px 10px;" onclick="deleteFollowUp('${d.code}')" title="حذف سجل الافتقاد">حذف</button>
                </div>
            </td>
        </tr>`;
    });
}

window.markFollowUp = async function(code) {
    let now = new Date();
    let dateStr = now.toISOString().split('T')[0] + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
        let current = followUpRecords[code] || {};
        current.lastVisited = dateStr;
        current.updatedAt = Date.now();
        await db.collection("followUpRecords").doc(code).set(current);
        showToast('تم تسجيل الافتقاد بنجاح!', 'success');
    } catch (e) {
        showToast('حدث خطأ أثناء حفظ الافتقاد.', 'error');
    }
};

window.callDeaconPhone = function(phone) {
    if(!phone) { showToast('لا يوجد رقم هاتف مسجل لهذا الشماس!', 'error'); return; }
    navigator.clipboard.writeText(phone).then(() => {
        showToast(`تم نسخ رقم الهاتف (${phone}) إلى الحافظة بنجاح!`, 'success');
        // محاولة فتح تطبيق الاتصال مباشرة
        window.location.href = `tel:${phone}`;
    }).catch(err => {
        window.location.href = `tel:${phone}`;
    });
};

window.openExcuseModal = function(code, name) {
    document.getElementById('excuseDeaconCode').value = code;
    document.getElementById('excuseDeaconName').innerText = `الشماس: ${name}`;
    let current = followUpRecords[code];
    document.getElementById('excuseReasonText').value = (current && current.excuse) ? current.excuse : '';
    document.getElementById('excuseModal').style.display = 'flex';
    setTimeout(() => { document.getElementById('excuseReasonText').focus(); }, 100);
};

window.closeExcuseModal = function() {
    document.getElementById('excuseModal').style.display = 'none';
};

window.saveDeaconExcuse = async function() {
    let code = document.getElementById('excuseDeaconCode').value;
    let excuseText = document.getElementById('excuseReasonText').value.trim();
    if(!excuseText) { showToast('يرجى كتابة العذر أولاً!', 'error'); return; }

    try {
        let current = followUpRecords[code] || {};
        current.excuse = excuseText;
        current.updatedAt = Date.now();
        await db.collection("followUpRecords").doc(code).set(current);
        window.closeExcuseModal();
        showToast('تم حفظ العذر بنجاح!', 'success');
    } catch (e) {
        showToast('حدث خطأ أثناء حفظ العذر.', 'error');
    }
};

window.deleteFollowUp = async function(code) {
    if(await askConfirm('هل تريد مسح سجل الافتقاد والعذر لهذا الشماس؟', { danger: true, icon: '🗑', okText: 'مسح' })) {
        try {
            await db.collection("followUpRecords").doc(code).delete();
            showToast('تم الحذف بنجاح!', 'success');
        } catch (e) {
            showToast('حدث خطأ أثناء الحذف.', 'error');
        }
    }
};

function renderIdCards() {
    const c = document.getElementById('idCardsContainer'); 
    if(!c) return;
    c.innerHTML = '';
    
    let sortedDeacons = [...deacons];
    sortDeaconsByCode(sortedDeacons);

    sortedDeacons.forEach(d => {
        c.innerHTML += `
            <div class="id-card">
                <h4>كنيسة السيدة العذراء مريم</h4>
                <div class="card-body-row">
                    <img src="${d.photo}" class="card-img-side">
                    <div class="card-info">
                        <div class="card-name-line"><span class="card-label">الاسم :</span> ${d.name}</div>
                    </div>
                </div>
                <div class="barcode-box">
                    <svg id="barcode-${d.code}"></svg>
                </div>
            </div>
        `;
    });

    setTimeout(() => {
        sortedDeacons.forEach(d => {
            try {
                JsBarcode(`#barcode-${d.code}`, d.code, { 
                    format: "CODE128", 
                    height: 26, 
                    displayValue: true,
                    fontSize: 11,
                    font: "Cairo",
                    textMargin: 2,
                    margin: 2 
                });
            } catch(e) {}
        });
    }, 100);
}

window.printIdCards = function() {
    window.print();
};

function exportToExcel(data, fileName) {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + data.map(e => e.join(",")).join("\n");
    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.exportDatabaseExcel = function() {
    let data = [["الكود", "الاسم", "السنة الدراسية", "أب الاعتراف", "الحالة", "الرتبة", "تاريخ الرسامة", "الهاتف"]];
    let sorted = [...deacons];
    sortDeaconsByCode(sorted);
    sorted.forEach(d => {
        data.push([d.code, d.name, d.studyYear, d.confessionFather, d.status, d.ordination, d.ordinationDate, d.phone]);
    });
    exportToExcel(data, "قاعدة_بيانات_الشمامسة");
};

window.exportAttendanceExcel = function() {
    let data = [["الكود", "الاسم", "التاريخ", "الحصة", "القداس"]];
    let sortedAttendance = [...attendanceRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
    sortedAttendance.forEach(r => {
        let d = deacons.find(x => x.code === r.code);
        data.push([r.code, d ? d.name : "غير معروف", r.date, r.classStatus, r.massStatus]);
    });
    exportToExcel(data, "سجل_الحضور");
};

window.exportFollowUpExcel = function() {
    let data = [["الكود", "الاسم", "المرحلة", "آخر تاريخ افتقاد", "العذر"]];
    let sorted = [...deacons];
    sortDeaconsByCode(sorted);
    sorted.forEach(d => {
        let followData = followUpRecords[d.code];
        let lastVisit = followData && followData.lastVisited ? followData.lastVisited : 'لم يتم الافتقاد';
        let excuse = followData && followData.excuse ? followData.excuse : 'لا يوجد';
        data.push([d.code, d.name, d.studyYear, lastVisit, excuse]);
    });
    exportToExcel(data, "متابعة_الافتقاد_والعذار");
};

window.exportServiceExcel = function() {
    let data = [["الكود", "الاسم", "نوع الخدمة", "التاريخ"]];
    serviceRecords.forEach(s => {
        let d = deacons.find(x => x.code === s.code);
        data.push([s.code, d ? d.name : "غير معروف", s.serviceType, s.date]);
    });
    exportToExcel(data, "سجل_الخدمات");
};

/* ==================================================================
   الترقية السنوية في عيد النيروز (رأس السنة القبطية)
   - النيروز: 11 سبتمبر، أو 12 سبتمبر لو السنة الميلادية التالية كبيسة.
   - بتتنفذ مرة واحدة فقط لكل نيروز (محفوظ في Firestore: settings/promotion)
     وتنقل كل شماس للسنة الدراسية التالية. الجامعي يفضل جامعي.
   - أول مرة تشتغل بس بتسجل النيروز الحالي كنقطة بداية بدون ما ترقّي حد.
   ================================================================== */
function getNayrouzDate(gregorianYear) {
    const day = ((gregorianYear + 1) % 4 === 0) ? 12 : 11;
    return new Date(gregorianYear, 8, day);
}

function getCurrentNayrouzCycle() {
    const now = new Date();
    const y = now.getFullYear();
    return now >= getNayrouzDate(y) ? y : y - 1;
}

function nextStudyYear(current) {
    const i = studyYearsHierarchy.indexOf(current);
    if (i === -1 || i >= studyYearsHierarchy.length - 1) return current;
    return studyYearsHierarchy[i + 1];
}

async function checkNayrouzPromotion() {
    try {
        const cycle = getCurrentNayrouzCycle();
        const ref = db.collection("settings").doc("promotion");

        // نحجز الدورة داخل transaction عشان لو مسؤولين دخلوا مع بعض ما تتكررش الترقية
        const claim = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) {
                tx.set(ref, { lastPromotedNayrouz: cycle, updatedAt: Date.now() });
                return { steps: 0, previous: null };
            }
            const last = snap.data().lastPromotedNayrouz;
            if (typeof last !== 'number' || last >= cycle) return { steps: 0, previous: last };
            tx.update(ref, { lastPromotedNayrouz: cycle, updatedAt: Date.now() });
            return { steps: cycle - last, previous: last };
        });

        if (claim.steps <= 0) return;

        try {
            const snap = await db.collection("deacons").get();
            let batch = db.batch(), n = 0, changed = 0;
            for (const doc of snap.docs) {
                let year = doc.data().studyYear;
                for (let s = 0; s < claim.steps; s++) year = nextStudyYear(year);
                if (year !== doc.data().studyYear) {
                    batch.update(doc.ref, { studyYear: year });
                    n++; changed++;
                    if (n === 400) { await batch.commit(); batch = db.batch(); n = 0; }
                }
            }
            if (n > 0) await batch.commit();
            setTimeout(() => showToast('كل سنة وأنتم طيبين! تم ترقية الشمامسة للسنة الدراسية الجديدة بمناسبة عيد النيروز', 'success'), 3000);
        } catch (err) {
            // لو فشلت الترقية نرجع الحجز عشان تتعاد المحاولة في الدخول القادم
            await ref.update({ lastPromotedNayrouz: claim.previous });
            showToast('تعذّرت الترقية التلقائية، سيتم المحاولة عند الدخول القادم.', 'error');
        }
    } catch (e) {
        console.error('Nayrouz promotion check failed:', e);
    }
}
