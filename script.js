let deacons = JSON.parse(localStorage.getItem('deacons')) || [];
let pendingRequests = JSON.parse(localStorage.getItem('pendingRequests')) || [];
let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
let followUpRecords = JSON.parse(localStorage.getItem('followUpRecords')) || {};
let serviceRecords = JSON.parse(localStorage.getItem('serviceRecords')) || [];

// مصفوفة المراحل الدراسية للترقية بالترتيب التصاعدي
const studyYearsHierarchy = [
    "أولى إعدادي",
    "تانية إعدادي",
    "تالتة إعدادي",
    "أولى ثانوي",
    "تانية ثانوي",
    "تالتة ثانوي",
    "جامعي"
];

// دالة الترقية التلقائية سنوياً فى عيد النيروز (11 سبتمبر)
function checkNairouzPromotion() {
    let now = new Date();
    let currentYear = now.getFullYear();
    let nairouzDateStr = `${currentYear}-09-11`; // تاريخ عيد النيروز
    let lastCheckedYear = localStorage.getItem('lastNairouzPromotionYear');

    // إذا دخلنا يوم 11 سبتمبر أو بعده ولم يتم ترقية الشمامسة في هذه السنة بعد
    if(now >= new Date(nairouzDateStr) && lastCheckedYear !== String(currentYear)) {
        let promoted = false;
        deacons.forEach(d => {
            let currentIndex = studyYearsHierarchy.indexOf(d.studyYear);
            // إذا وجدنا الشماس في مرحلة أقل من الأخيرة، يتم نقله للمرحلة التالية تلقائياً
            if(currentIndex !== -1 && currentIndex < studyYearsHierarchy.length - 1) {
                d.studyYear = studyYearsHierarchy[currentIndex + 1];
                promoted = true;
            } else if(currentIndex === studyYearsHierarchy.length - 1) {
                // من كان جامعياً يبقى جامعياً أو يتم التعامل معه حسب رغبتك
                d.studyYear = "جامعي";
            }
        });

        if(promoted) {
            localStorage.setItem('deacons', JSON.stringify(deacons));
        }
        localStorage.setItem('lastNairouzPromotionYear', String(currentYear));
    }
}

// تنفيذ فحص الترقية فور تحميل السكريبت
checkNairouzPromotion();

const ADMIN_PASS = "8264";
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

function saveReq(name, dob, studyYear, confessionFather, status, ordination, ordinationDate, phone, photo) {
    pendingRequests.push({ 
        id: Date.now(), name, dob, studyYear, confessionFather, status, 
        ordination: status==='مرسوم'?ordination:'-', 
        ordinationDate: status==='مرسوم'?ordinationDate:'-', 
        phone, photo 
    });
    localStorage.setItem('pendingRequests', JSON.stringify(pendingRequests));
    alert('تم إرسال الطلب بنجاح!'); closePublicRegister();
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

function approveRequest(idx) {
    let req = pendingRequests[idx];
    let customCode = prompt(`أدخل الكود التعريفي للش شماس (${req.name}):`, "");
    if(!customCode) return;
    customCode = customCode.trim();

    if(deacons.find(d => d.code === customCode)) {
        alert('هذا الكود مستخدم بالفعل لش شماس آخر!');
        return;
    }

    deacons.push({ code: customCode, ...req });
    pendingRequests.splice(idx, 1);
    localStorage.setItem('deacons', JSON.stringify(deacons));
    localStorage.setItem('pendingRequests', JSON.stringify(pendingRequests));
    renderAllData();
    alert('تم قبول الشماس وتكويده بنجاح!');
}

function rejectRequest(idx) { if(confirm('متأكد من الرفض؟')) { pendingRequests.splice(idx, 1); localStorage.setItem('pendingRequests', JSON.stringify(pendingRequests)); renderAllData(); } }

function renderRequestsTable() {
    const tb = document.getElementById('requestsTableBody'); tb.innerHTML = '';
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
    const tb = document.getElementById('deaconsMainTable'); tb.innerHTML = '';
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
                <button class="btn-action btn-danger" style="padding:4px 8px;" onclick="deleteDeacon('${d.code}')">حذف</button>
            </td>
        </tr>`;
    });
}

function openEditModal(code) {
    let d = deacons.find(x => x.code === code);
    if(!d) return;
    document.getElementById('editOriginalCode').value = d.code;
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

function saveEditedDeacon() {
    let origCode = document.getElementById('editOriginalCode').value;
    let d = deacons.find(x => x.code === origCode);
    if(d) {
        let newCode = document.getElementById('editCode').value.trim();
        if(newCode !== origCode && deacons.find(x => x.code === newCode)) {
            alert('هذا الكود الجديد مستخدم بالفعل لش شماس آخر!');
            return;
        }

        d.code = newCode;
        d.name = document.getElementById('editName').value;
        d.dob = document.getElementById('editDob').value;
        d.studyYear = document.getElementById('editStudyYear').value;
        d.confessionFather = document.getElementById('editConfessionFather').value;
        d.status = document.getElementById('editStatus').value;
        d.ordination = d.status === 'مرسوم' ? document.getElementById('editOrdination').value : '-';
        d.ordinationDate = d.status === 'مرسوم' ? document.getElementById('editOrdDate').value : '-';
        d.phone = document.getElementById('editPhone').value;

        let photoInput = document.getElementById('editPhoto');
        if(photoInput.files && photoInput.files[0]) {
            let reader = new FileReader();
            reader.readAsDataURL(photoInput.files[0]);
            reader.onload = function(e) {
                d.photo = e.target.result;
                localStorage.setItem('deacons', JSON.stringify(deacons));
                closeEditModal(); renderAllData(); alert('تم الحفظ بنجاح!');
            }
        } else {
            localStorage.setItem('deacons', JSON.stringify(deacons));
            closeEditModal(); renderAllData(); alert('تم الحفظ بنجاح!');
        }
    }
}

function deleteDeacon(code) { 
    if(confirm('حذف نهائي؟')) { 
        deacons = deacons.filter(d => d.code !== code); 
        localStorage.setItem('deacons', JSON.stringify(deacons)); 
        renderAllData(); 
    } 
}

function renderServiceDeaconsList() {
    const year = document.getElementById('serviceYearFilter').value;
    const tb = document.getElementById('serviceDeaconsTableBody'); tb.innerHTML = '';
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

function assignService(code, serviceType) {
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
    serviceRecords.push({ id: Date.now(), code, serviceType, date: dateStr });
    localStorage.setItem('serviceRecords', JSON.stringify(serviceRecords));
    renderServiceLogTable();
    alert(`تم تسجيل (${serviceType}) بنجاح!`);
}

function renderServiceLogTable() {
    const tb = document.getElementById('serviceLogTableBody'); tb.innerHTML = '';
    serviceRecords.forEach((s, idx) => {
        let d = deacons.find(x => x.code === s.code);
        tb.innerHTML += `<tr><td class="ltr-text">${s.code}</td><td>${d ? d.name : 'غير معروف'}</td><td>${s.serviceType}</td><td>${s.date}</td><td><button class="btn-action btn-danger" onclick="deleteServiceRecord(${idx})">حذف</button></td></tr>`;
    });
}
function deleteServiceRecord(idx) { serviceRecords.splice(idx, 1); localStorage.setItem('serviceRecords', JSON.stringify(serviceRecords)); renderServiceLogTable(); }

function processScan(type) {
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
    if(!rec) { rec = { code: deacon.code, date, classStatus: 'غائب', massStatus: 'غائب' }; attendanceRecords.push(rec); }
    if(type === 'class') rec.classStatus = 'حاضر';
    if(type === 'mass') rec.massStatus = 'حاضر';

    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
    alertBox.style.display = 'block'; alertBox.style.background = '#d4edda'; alertBox.style.color = '#155724';
    alertBox.innerText = `تم تسجيل حضور (${type==='class'?'حصة':'قداس'}) للشماس: ${deacon.name}`;
    document.getElementById('scanInput').value = '';
    document.getElementById('scanInput').focus();
    renderAttendanceTable();
}

function renderAttendanceTable() {
    const tb = document.getElementById('attendanceTableBody'); tb.innerHTML = '';
    attendanceRecords.forEach((r, idx) => {
        let d = deacons.find(x => x.code === r.code);
        tb.innerHTML += `<tr><td class="ltr-text">${r.code}</td><td>${d?d.name:'غير معروف'}</td><td>${r.date}</td><td>${r.classStatus}</td><td>${r.massStatus}</td><td><button class="btn-action btn-danger" onclick="deleteAtt(${idx})">حذف</button></td></tr>`;
    });
}
function deleteAtt(idx) { attendanceRecords.splice(idx, 1); localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords)); renderAttendanceTable(); }

function renderIdCards() {
    const c = document.getElementById('idCardsContainer'); c.innerHTML = '';
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
    const tb = document.getElementById('followUpTableBody'); tb.innerHTML = '';
    deacons.forEach(d => {
        let attCount = attendanceRecords.filter(r => r.code === d.code && (r.classStatus==='حاضر'||r.massStatus==='حاضر')).length;
        let st = followUpRecords[d.code] ? followUpRecords[d.code].status : 'يحتاج افتقاد';
        tb.innerHTML += `<tr><td><img src="${d.photo}" class="deacon-avatar"></td><td class="ltr-text">${d.code}</td><td>${d.name}</td><td>${d.studyYear}</td><td><b>${attCount}</b></td><td>${st}</td><td><button class="btn-action btn-success" onclick="markFollow('${d.code}')">تم</button></td></tr>`;
    });
}
function markFollow(code) {
    followUpRecords[code] = { status: 'تم الافتقاد', date: new Date().toISOString().split('T')[0] };
    localStorage.setItem('followUpRecords', JSON.stringify(followUpRecords)); renderFollowUpTable();
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