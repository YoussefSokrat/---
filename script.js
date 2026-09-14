// استيراد فايربيس
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAf36-2wJHyT3BcSlhKDvBcwvC_UYKG0F4",
  authDomain: "deacon-2e046.firebaseapp.com",
  projectId: "deacon-2e046",
  storageBucket: "deacon-2e046.firebasestorage.app",
  messagingSenderId: "833125342982",
  appId: "1:833125342982:web:6c5fa5238f4fe07610c887",
  measurementId: "G-V591C5ZGF1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let deacons = [];
let pendingRequests = [];
let attendanceRecords = [];
let followUpRecords = {};
let serviceRecords = [];

// مصفوفة المراحل الدراسية للترقية بالترتيب التصاعدي
const studyYearsHierarchy = [
    "أولى إعدادي", "تانية إعدادي", "تالتة إعدادي",
    "أولى ثانوي", "تانية ثانوي", "تالتة ثانوي", "جامعي"
];

// الاستماع اللحظي للبيانات من Firestore عشان تظهر لأي جهاز في الحال
function initRealtimeListeners() {
    // 1. الشمامسة
    onSnapshot(collection(db, "deacons"), (snapshot) => {
        deacons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAllData();
    });

    // 2. الطلبات المعلقة (دي اللي هتحل مشكلة ظهور التسجيل من تليفون لآخر فوري)
    onSnapshot(collection(db, "pendingRequests"), (snapshot) => {
        pendingRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAllData();
    });

    // 3. الحضور والغياب
    onSnapshot(collection(db, "attendanceRecords"), (snapshot) => {
        attendanceRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAllData();
    });

    // 4. سجل الخدمات
    onSnapshot(collection(db, "serviceRecords"), (snapshot) => {
        serviceRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAllData();
    });

    // 5. الافتقاد
    onSnapshot(collection(db, "followUpRecords"), (snapshot) => {
        followUpRecords = {};
        snapshot.forEach(doc => {
            followUpRecords[doc.id] = doc.data();
        });
        renderAllData();
    });
}

// دالة الترقية التلقائية سنوياً فى عيد النيروز (11 سبتمبر)
function checkNairouzPromotion() {
    let now = new Date();
    let currentYear = now.getFullYear();
    let nairouzDateStr = `${currentYear}-09-11`; 
    let lastCheckedYear = localStorage.getItem('lastNairouzPromotionYear');

    if(now >= new Date(nairouzDateStr) && lastCheckedYear !== String(currentYear)) {
        let promoted = false;
        deacons.forEach(async (d) => {
            let currentIndex = studyYearsHierarchy.indexOf(d.studyYear);
            if(currentIndex !== -1 && currentIndex < studyYearsHierarchy.length - 1) {
                d.studyYear = studyYearsHierarchy[currentIndex + 1];
                promoted = true;
                if(d.id) {
                    await updateDoc(doc(db, "deacons", d.id), { studyYear: d.studyYear });
                }
            } else if(currentIndex === studyYearsHierarchy.length - 1) {
                d.studyYear = "جامعي";
            }
        });
        localStorage.setItem('lastNairouzPromotionYear', String(currentYear));
    }
}

checkNairouzPromotion();
initRealtimeListeners();

const ADMIN_PASS = "2864";
const attendDateInput = document.getElementById('attenddate');
if(attendDateInput) attendDateInput.valueAsDate = new Date();

function openServantLogin() { 
    document.getElementById('welcomeHomeOverlay').style.display = 'none'; 
    document.getElementById('loginOverlay').style.display = 'flex';
    setTimeout(() => { document.getElementById('adminPassword').focus(); }, 100);
}
function closeServantLogin() { 
    document.getElementById('loginOverlay').style.display = 'none'; 
    document.getElementById('welcomeHomeOverlay').style.display = 'flex'; 
}
function openPublicRegister() { 
    document.getElementById('welcomeHomeOverlay').style.display = 'none'; 
    document.getElementById('publicRegisterModal').style.display = 'flex';
    setTimeout(() => { document.getElementById('pubName').focus(); }, 100);
}
function closePublicRegister() { 
    document.getElementById('publicRegisterModal').style.display = 'none'; 
    document.getElementById('welcomeHomeOverlay').style.display = 'flex'; 
}
function checkAdminLogin() {
    if(document.getElementById('adminPassword').value === ADMIN_PASS) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainPlatform').style.display = 'flex';
        renderAllData();
    } else { alert('كلمة المرور غير صحيحة!'); }
}
function logoutSystem() { document.getElementById('mainPlatform').style.display = 'none'; document.getElementById('welcomeHomeOverlay').style.display = 'flex'; }

function togglePubOrd(el) { 
    let show = (el.value === 'مرسوم');
    document.getElementById('pubOrdGroup').style.display = show ? 'block' : 'none';
    document.getElementById('pubOrdDateGroup').style.display = show ? 'block' : 'none';
}
function toggleEditOrd(el) { 
    let show = (el.value === 'مرسوم');
    document.getElementById('editOrdGroup').style.display = show ? 'block' : 'none';
    document.getElementById('editOrdDateGroup').style.display = show ? 'block' : 'none';
}

function submitPublicApplication() {
    const name = document.getElementById('pubName').value.trim();
    const dob = document.getElementById('pubDob').value;
    const studyYear = document.getElementById('pubStudyYear').value;
    const confessionFather = document.getElementById('pubConfessionFather').value.trim();
    const status = document.getElementById('pubStatus').value;
    const ordination = document.getElementById('pubOrdination').value;
    const ordinationDate = document.getElementById('pubOrdDate').value;
    const phone = document.getElementById('pubPhone').value.trim();
    const photoInput = document.getElementById('pubPhoto');

    if(!name || !dob || !studyYear || !confessionFather || !phone) { alert('يرجى ملء كافة الحقول الأساسية!'); return; }
    let reader = new FileReader();
    if(photoInput.files && photoInput.files[0]) {
        reader.readAsDataURL(photoInput.files[0]);
        reader.onload = function(e) { saveReq(name, dob, studyYear, confessionFather, status, ordination, ordinationDate, phone, e.target.result); }
    } else { saveReq(name, dob, studyYear, confessionFather, status, ordination, ordinationDate, phone, 'https://via.placeholder.com/100'); }
}

async function saveReq(name, dob, studyYear, confessionFather, status, ordination, ordinationDate, phone, photo) {
    try {
        await addDoc(collection(db, "pendingRequests"), { 
            name, dob, studyYear, confessionFather, status, 
            ordination: status==='مرسوم'?ordination:'-', 
            ordinationDate: status==='مرسوم'?ordinationDate:'-', 
            phone, photo, createdAt: Date.now() 
        });
        alert('تم إرسال الطلب بنجاح!'); 
        closePublicRegister();
    } catch (error) {
        alert('حدث خطأ أثناء إرسال الطلب، تأكد من الاتصال بالإنترنت.');
    }
}

function switchView(viewId, btn) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active-btn'));
    document.getElementById(viewId).classList.add('active');
    if(btn) btn.classList.add('active-btn');
    renderAllData();
    if(viewId === 'viewAttendance') {
        setTimeout(() => { document.getElementById('scanInput').focus(); }, 100);
    }
}

function renderAllData() {
    document.getElementById('reqBadge').innerText = pendingRequests.length;
    renderRequestsTable();
    renderMainDatabase();
    renderIdCards();
    renderFollowUpTable();
    renderAttendanceTable();
    renderServiceDeaconsList();
    renderServiceLogTable();
}

async function approveRequest(index) {
    let req = pendingRequests[index];
    let customCode = prompt(`أدخل الكود التعريفي للش شماس (${req.name}):`, "");
    if(!customCode) return;
    customCode = customCode.trim();

    if(deacons.find(d => d.code === customCode)) {
        alert('هذا الكود مستخدم بالفعل لش شماس آخر!');
        return;
    }

    try {
        // إضافة الشماس لقاعدة البيانات الرئيسية
        await addDoc(collection(db, "deacons"), { 
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

        // حذف الطلب من الطلبات المعلقة
        await deleteDoc(doc(db, "pendingRequests", req.id));
        alert('تم قبول الشماس وتكويده بنجاح!');
    } catch (e) {
        alert('حدث خطأ أثناء عملية القبول.');
    }
}

async function rejectRequest(index) { 
    if(confirm('متأكد من الرفض؟')) { 
        let req = pendingRequests[index];
        try {
            await deleteDoc(doc(db, "pendingRequests", req.id));
        } catch (e) {
            alert('حدث خطأ أثناء الرفض.');
        }
    } 
}

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

function renderMainDatabase() {
    const q = document.getElementById('searchDatabaseInput') ? document.getElementById('searchDatabaseInput').value.toLowerCase() : '';
    const tb = document.getElementById('deaconsMainTable'); 
    if(!tb) return;
    tb.innerHTML = '';
    deacons.filter(d => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.phone.includes(q)).forEach(d => {
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
}

function openEditModal(code) {
    let d = deacons.find(x => x.code === code);
    if(!d) return;
    document.getElementById('editOriginalCode').value = d.id; // نخزن الـ Firestore ID هنا لتسهيل التعديل
    document.getElementById('editCode').value = d.code;
    document.getElementById('editName').value = d.name;
    document.getElementById('editDob').value = d.dob || '';
    document.getElementById('editStudyYear').value = d.studyYear;
    document.getElementById('editConfessionFather').value = d.confessionFather || '';
    document.getElementById('editStatus').value = d.status || 'غير مرسوم';
    toggleEditOrd(document.getElementById('editStatus'));
    document.getElementById('editOrdination').value = d.ordination !== '-' ? d.ordination : '';
    document.getElementById('editOrdDate').value = d.ordinationDate !== '-' ? d.ordinationDate : '';
    document.getElementById('editPhone').value = d.phone || '';
    document.getElementById('editPhoto').value = '';
    document.getElementById('editDeaconModal').style.display = 'flex';
}

function closeEditModal() { document.getElementById('editDeaconModal').style.display = 'none'; }

async function saveEditedDeacon() {
    let docId = document.getElementById('editOriginalCode').value;
    let d = deacons.find(x => x.id === docId);
    if(d) {
        let newCode = document.getElementById('editCode').value.trim();
        if(newCode !== d.code && deacons.find(x => x.code === newCode)) {
            alert('هذا الكود الجديد مستخدم بالفعل لش شماس آخر!');
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
                await updateDoc(doc(db, "deacons", docId), updatedData);
                closeEditModal(); renderAllData(); alert('تم الحفظ بنجاح!');
            }
        } else {
            await updateDoc(doc(db, "deacons", docId), updatedData);
            closeEditModal(); renderAllData(); alert('تم الحفظ بنجاح!');
        }
    }
}

async function deleteDeacon(docId) { 
    if(confirm('حذف نهائي؟')) { 
        try {
            await deleteDoc(doc(db, "deacons", docId));
        } catch (e) {
            alert('حدث خطأ أثناء الحذف.');
        }
    } 
}

function renderServiceDeaconsList() {
    const yearElement = document.getElementById('serviceYearFilter');
    if(!yearElement) return;
    const year = yearElement.value;
    const tb = document.getElementById('serviceDeaconsTableBody'); 
    if(!tb) return;
    tb.innerHTML = '';
    deacons.filter(d => d.studyYear === year).forEach(d => {
        tb.innerHTML += `<tr>
            <td><img src="${d.photo}" class="deacon-avatar"></td>
            <td class="ltr-text">${d.code}</td>
            <td>${d.name}</td>
            <td><button class="btn-action btn-church" onclick="assignService('${d.code}', 'خدمة قراءات')">تعيين قراءات</button></td>
            <td><button class="btn-action btn-success" onclick="assignService('${d.code}', 'خدمة مسبح')">تعيين مسبح</button></td>
        </tr>`;
    });
}

async function assignService(code, serviceType) {
    let now = new Date();
    let lastServ = serviceRecords.slice().reverse().find(s => s.code === code && s.serviceType === serviceType);
    
    if(lastServ) {
        let lastDate = new Date(lastServ.date);
        let diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);
        if(diffDays < 30) {
            if(!confirm(`تحذير: هذا الشماس خدم (${serviceType}) منذ أقل من شهر (${lastServ.date})! هل تريد المتابعة؟`)) return;
        }
    }

    let dateStr = now.toISOString().split('T')[0];
    try {
        await addDoc(collection(db, "serviceRecords"), { code, serviceType, date: dateStr });
        alert(`تم تسجيل (${serviceType}) بنجاح!`);
    } catch (e) {
        alert('حدث خطأ أثناء حفظ الخدمة.');
    }
}

function renderServiceLogTable() {
    const tb = document.getElementById('serviceLogTableBody'); 
    if(!tb) return;
    tb.innerHTML = '';
    serviceRecords.forEach((s) => {
        let d = deacons.find(x => x.code === s.code);
        tb.innerHTML += `<tr><td class="ltr-text">${s.code}</td><td>${d ? d.name : 'غير معروف'}</td><td>${s.serviceType}</td><td>${s.date}</td><td><button class="btn-action btn-danger" onclick="deleteServiceRecord('${s.id}')">حذف</button></td></tr>`;
    });
}

async function deleteServiceRecord(docId) { 
    try {
        await deleteDoc(doc(db, "serviceRecords", docId));
    } catch (e) {
        alert('حدث خطأ أثناء الحذف.');
    }
}

async function processScan(type) {
    const val = document.getElementById('scanInput').value.trim();
    const date = document.getElementById('attenddate').value;
    const alertBox = document.getElementById('scanResultAlert');
    if(!val || !date) { alert('أدخل الكود أو الاسم وتاريخ الحضور!'); return; }

    let deacon = deacons.find(d => d.code.toLowerCase() === val.toLowerCase() || d.name.toLowerCase() === val.toLowerCase());
    if(!deacon) {
        alertBox.style.display = 'block'; alertBox.style.background = '#f8d7da'; alertBox.style.color = '#721c24';
        alertBox.innerText = 'خطأ: الشماس غير مسجل!'; return;
    }

    let rec = attendanceRecords.find(r => r.code === deacon.code && r.date === date);
    try {
        if(!rec) {
            let newRec = { code: deacon.code, date, classStatus: type === 'class' ? 'حاضر' : 'غائب', massStatus: type === 'mass' ? 'حاضر' : 'غائب' };
            await addDoc(collection(db, "attendanceRecords"), newRec);
        } else {
            let updatePayload = {};
            if(type === 'class') updatePayload.classStatus = 'حاضر';
            if(type === 'mass') updatePayload.massStatus = 'حاضر';
            await updateDoc(doc(db, "attendanceRecords", rec.id), updatePayload);
        }

        alertBox.style.display = 'block'; alertBox.style.background = '#d4edda'; alertBox.style.color = '#155724';
        alertBox.innerText = `تم تسجيل حضور (${type==='class'?'حصة':'قداس'}) للشماس: ${deacon.name}`;
        document.getElementById('scanInput').value = '';
        document.getElementById('scanInput').focus();
    } catch (e) {
        alert('حدث خطأ أثناء تسجيل الحضور.');
    }
}

function renderAttendanceTable() {
    const tb = document.getElementById('attendanceTableBody'); 
    if(!tb) return;
    tb.innerHTML = '';
    attendanceRecords.forEach((r) => {
        let d = deacons.find(x => x.code === r.code);
        tb.innerHTML += `<tr><td class="ltr-text">${r.code}</td><td>${d?d.name:'غير معروف'}</td><td>${r.date}</td><td>${r.classStatus}</td><td>${r.massStatus}</td><td><button class="btn-action btn-danger" onclick="deleteAtt('${r.id}')">حذف</button></td></tr>`;
    });
}

async function deleteAtt(docId) { 
    try {
        await deleteDoc(doc(db, "attendanceRecords", docId));
    } catch (e) {
        alert('حدث خطأ أثناء الحذف.');
    }
}

function renderIdCards() {
    const c = document.getElementById('idCardsContainer'); 
    if(!c) return;
    c.innerHTML = '';
    deacons.forEach(d => {
        c.innerHTML += `
            <div class="id-card">
                <h4>خدمة الشهيد كيرياكوس</h4>
                <div class="card-body">
                    <img src="${d.photo}" class="card-img">
                    <div style="font-size:10.5px; line-height: 1.3;">
                        <strong>الاسم:</strong> ${d.name}<br>
                        <strong>الكود:</strong> <span class="ltr-text">${d.code}</span><br>
                        <strong>المرحلة:</strong> ${d.studyYear}
                    </div>
                </div>
                <div class="barcode-box">
                    <svg id="barcode-${d.code}"></svg>
                </div>
            </div>
        `;
    });

    setTimeout(() => {
        deacons.forEach(d => {
            try {
                JsBarcode(`#barcode-${d.code}`, d.code, { format: "CODE128", height: 20, displayValue: true, fontSize: 8, margin: 0 });
            } catch(err) {}
        });
    }, 100);
}

function printIdCards() { renderIdCards(); setTimeout(() => { window.print(); }, 400); }

function renderFollowUpTable() {
    const tb = document.getElementById('followUpTableBody'); 
    if(!tb) return;
    tb.innerHTML = '';
    deacons.forEach(d => {
        let attCount = attendanceRecords.filter(r => r.code === d.code && (r.classStatus==='حاضر'||r.massStatus==='حاضر')).length;
        let st = followUpRecords[d.code] ? followUpRecords[d.code].status : 'يحتاج افتقاد';
        tb.innerHTML += `<tr><td><img src="${d.photo}" class="deacon-avatar"></td><td class="ltr-text">${d.code}</td><td>${d.name}</td><td>${d.studyYear}</td><td><b>${attCount}</b></td><td>${st}</td><td><button class="btn-action btn-success" onclick="markFollow('${d.code}')">تم</button></td></tr>`;
    });
}

async function markFollow(code) {
    let followData = { status: 'تم الافتقاد', date: new Date().toISOString().split('T')[0] };
    try {
        await setDoc(doc(db, "followUpRecords", code), followData);
    } catch (e) {
        alert('حدث خطأ أثناء حفظ الافتقاد.');
    }
}

function exportTableToCSV(filename, rows) {
    let csvContent = "\uFEFF";
    rows.forEach(row => {
        let rowString = row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(",");
        csvContent += rowString + "\r\n";
    });
    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportDatabaseExcel() {
    let rows = [["الكود", "الاسم", "تاريخ الميلاد", "المرحلة الدراسية", "أب الاعتراف", "الحالة", "الرتبة", "تاريخ الرسامة", "رقم الهاتف"]];
    deacons.forEach(d => {
        rows.push([d.code, d.name, d.dob, d.studyYear, d.confessionFather, d.status, d.ordination, d.ordinationDate, d.phone]);
    });
    exportTableToCSV("قاعدة_بيانات_الشمامسة.csv", rows);
}

function exportAttendanceExcel() {
    let rows = [["الكود", "اسم الشماس", "التاريخ", "الحصة", "القداس"]];
    attendanceRecords.forEach(r => {
        let d = deacons.find(x => x.code === r.code);
        rows.push([r.code, d ? d.name : "غير معروف", r.date, r.classStatus, r.massStatus]);
    });
    exportTableToCSV("سجل_الحضور_والغياب.csv", rows);
}

function exportServiceExcel() {
    let rows = [["الكود", "اسم الشماس", "نوع الخدمة", "التاريخ"]];
    serviceRecords.forEach(s => {
        let d = deacons.find(x => x.code === s.code);
        rows.push([s.code, d ? d.name : "غير معروف", s.serviceType, s.date]);
    });
    exportTableToCSV("سجل_توزيع_الخدمات.csv", rows);
}

function exportFollowUpExcel() {
    let rows = [["الكود", "اسم الشماس", "المرحلة الدراسية", "عدد مرات الحضور", "حالة الافتقاد"]];
    deacons.forEach(d => {
        let attCount = attendanceRecords.filter(r => r.code === d.code && (r.classStatus==='حاضر'||r.massStatus==='حاضر')).length;
        let st = followUpRecords[d.code] ? followUpRecords[d.code].status : 'يحتاج افتقاد';
        rows.push([d.code, d.name, d.studyYear, attCount, st]);
    });
    exportTableToCSV("سجل_متابعة_الافتقاد.csv", rows);
}

// ربط الدوال بالـ window عشان تفضل شغالين مع الأزرار في الـ HTML
window.openServantLogin = openServantLogin;
window.closeServantLogin = closeServantLogin;
window.openPublicRegister = openPublicRegister;
window.closePublicRegister = closePublicRegister;
window.checkAdminLogin = checkAdminLogin;
window.logoutSystem = logoutSystem;
window.togglePubOrd = togglePubOrd;
window.toggleEditOrd = toggleEditOrd;
window.submitPublicApplication = submitPublicApplication;
window.switchView = switchView;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveEditedDeacon = saveEditedDeacon;
window.deleteDeacon = deleteDeacon;
window.assignService = assignService;
window.deleteServiceRecord = deleteServiceRecord;
window.processScan = processScan;
window.deleteAtt = deleteAtt;
window.printIdCards = printIdCards;
window.markFollow = markFollow;
window.exportDatabaseExcel = exportDatabaseExcel;
window.exportAttendanceExcel = exportAttendanceExcel;
window.exportServiceExcel = exportServiceExcel;
window.exportFollowUpExcel = exportFollowUpExcel;