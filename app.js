/**
 * AetherHealth Dashboard Logic
 * Fully functional: sidebar routing, API connection, client-side simulation,
 * interactive calculations, Chart.js configurations, and report generation.
 */

// --- GLOBAL STATE ---
let patients = [];
let filteredPatients = [];
let charts = {};
const BACKEND_URL = "http://localhost:5000";
let isBackendConnected = false;

// Ordered list of months for visit timeline
const FALLBACK_MONTHS = [
    "Jun 2025", "Jul 2025", "Aug 2025", "Sep 2025", "Oct 2025", "Nov 2025",
    "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026"
];

// Month index lookup for quick date → label mapping
const MONTH_LABEL_MAP = {};
FALLBACK_MONTHS.forEach((label, idx) => {
    MONTH_LABEL_MAP[label] = idx;
});

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
    initSidebarRouting();
    initBmiCalculator();
    initFilters();
    initDownloadBtn();

    // Check if backend is available, else load fallback simulation
    await checkBackendConnection();
    await loadData();

    // Initial Render
    updateDashboardUI();
    initPatientForm();
});

// --- SIDEBAR ROUTING ---
function initSidebarRouting() {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".patients-section");

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();

            // Remove active classes
            navItems.forEach(i => i.classList.remove("active"));
            sections.forEach(s => s.classList.remove("section-active"));

            // Activate clicked item
            item.classList.add("active");

            // Show targeted view
            const targetId = item.getAttribute("data-target");
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add("section-active");
            }

            // Re-render charts when switching to specific tabs
            if (targetId === "dashboard-view") {
                // Small delay to let the section become visible first
                setTimeout(() => renderDashboardCharts(), 50);
            } else if (targetId === "before-after-view") {
                setTimeout(() => renderBeforeAfterCharts(), 50);
            } else if (targetId === "ai-insights-view") {
                generateAIInsights(true);
            }
        });
    });
}

// --- CHECK BACKEND CONNECTION ---
async function checkBackendConnection() {
    const indicator = document.getElementById("backend-indicator");
    const textEl = document.getElementById("backend-text");

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(`${BACKEND_URL}/api/health`, {
            method: 'GET',
            mode: 'cors',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
            isBackendConnected = true;
            indicator.classList.add("online");
            textEl.textContent = "Pandas API Connected";
            console.log("Connected to Python Flask API backend successfully.");
        } else {
            throw new Error("Non-OK status");
        }
    } catch (e) {
        isBackendConnected = false;
        indicator.classList.remove("online");
        textEl.textContent = "Offline Simulation Mode";
        console.warn("Python backend offline. Initiating client-side mockup engine.");
    }
}

// --- LOAD DATA ---
async function loadData() {
    if (isBackendConnected) {
        try {
            const res = await fetch(`${BACKEND_URL}/api/patients?limit=250`);
            const data = await res.json();
            patients = data.patients;
        } catch (e) {
            console.error("Error reading from API, falling back to local simulation.", e);
            generateFallbackPatients();
        }
    } else {
        generateFallbackPatients();
    }
    filteredPatients = [...patients];
}

// --- GENERATE CLIENT-SIDE FALLBACK PATIENT DATABASE ---
function generateFallbackPatients() {
    const firstNamesM = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Daniel", "Matthew", "Anthony", "Paul", "Andrew", "Steven", "Joshua", "Kevin"];
    const firstNamesF = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Nancy", "Lisa", "Betty", "Sandra", "Emily", "Donna", "Michelle", "Amanda"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Moore", "Martin", "Jackson", "Lee"];
    const diseases = ["Cardiovascular", "Diabetes", "Respiratory", "Oncology", "Neurological", "None"];
    const genders = ["Male", "Female", "Non-binary"];

    patients = [];

    // Seeded random for deterministic, reproducible data
    let seed = 42;
    function random() {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    // Generate 120 patients
    for (let i = 0; i < 120; i++) {
        const patientId = `PAT-${1000 + i}`;
        const gender = genders[Math.floor(random() * genders.length)];

        let name = "";
        if (gender === "Male") {
            name = `${firstNamesM[Math.floor(random() * firstNamesM.length)]} ${lastNames[Math.floor(random() * lastNames.length)]}`;
        } else if (gender === "Female") {
            name = `${firstNamesF[Math.floor(random() * firstNamesF.length)]} ${lastNames[Math.floor(random() * lastNames.length)]}`;
        } else {
            name = `${random() > 0.5 ? firstNamesM[Math.floor(random() * firstNamesM.length)] : firstNamesF[Math.floor(random() * firstNamesF.length)]} ${lastNames[Math.floor(random() * lastNames.length)]}`;
        }

        const age = Math.floor(20 + random() * 65);
        const height = Math.round(150 + random() * 45);

        // Age-correlated disease prevalence
        let disease = "None";
        if (age > 55) {
            disease = random() > 0.4 ? diseases[Math.floor(random() * (diseases.length - 1))] : "None";
        } else if (age > 35) {
            disease = random() > 0.6 ? diseases[Math.floor(random() * (diseases.length - 1))] : "None";
        } else {
            disease = random() > 0.8 ? diseases[Math.floor(random() * (diseases.length - 1))] : "None";
        }

        // BMI-correlated weight
        let bmiBase = 18.5 + random() * 18;
        if (disease === "Diabetes" || disease === "Cardiovascular") bmiBase += 3;
        const baselineWeight = Math.round(bmiBase * ((height / 100) ** 2) * 10) / 10;

        // Adherence
        const adherence = disease !== "None" ? ["High", "Medium", "Low"][Math.floor(random() * 3)] : "None";

        // Weight change based on adherence
        let weightChange = 0;
        if (adherence === "High") weightChange = -4 - random() * 4;
        else if (adherence === "Medium") weightChange = -1 - random() * 3;
        else weightChange = -1 + random() * 2;
        const currentWeight = Math.max(40, Math.round((baselineWeight + weightChange) * 10) / 10);

        // Blood pressure
        let baseSys = 115 + Math.floor(random() * 20);
        let baseDia = 75 + Math.floor(random() * 12);
        if (disease === "Cardiovascular") { baseSys += 20; baseDia += 12; }

        let sysChange = 0, diaChange = 0;
        if (adherence === "High") { sysChange = -12 - Math.floor(random() * 10); diaChange = -8 - Math.floor(random() * 6); }
        else if (adherence === "Medium") { sysChange = -6 - Math.floor(random() * 6); diaChange = -4 - Math.floor(random() * 4); }

        const baselineSys = baseSys;
        const baselineDia = baseDia;
        const currentSys = Math.max(90, baseSys + sysChange);
        const currentDia = Math.max(60, baseDia + diaChange);

        // Fasting sugar
        let baseSugar = 70 + Math.floor(random() * 50);
        if (disease === "Diabetes") baseSugar += 70 + Math.floor(random() * 80);
        let sugarChange = 0;
        if (adherence === "High") sugarChange = -20 - Math.floor(random() * 30);
        else if (adherence === "Medium") sugarChange = -8 - Math.floor(random() * 15);
        const baselineSugar = baseSugar;
        const currentSugar = Math.max(60, baseSugar + sugarChange);

        // Visit date — spread across the 12 month window
        const monthIndex = Math.floor(random() * FALLBACK_MONTHS.length);
        const monthLabel = FALLBACK_MONTHS[monthIndex];
        // Build a proper YYYY-MM-DD date from the month label
        const [mon, yr] = monthLabel.split(" ");
        const monthNum = new Date(`${mon} 1, ${yr}`).getMonth() + 1;
        const dayNum = Math.floor(1 + random() * 27);
        const visitDate = `${yr}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

        // Composite AI health score
        const currentBmi = currentWeight / ((height / 100) ** 2);
        const bpScore = Math.max(0, 100 - (Math.abs(currentSys - 120) * 1.5 + Math.abs(currentDia - 80) * 2));
        const sugarScore = Math.max(0, 100 - (Math.abs(currentSugar - 95) * 0.8));
        const bmiScore = Math.max(0, 100 - (Math.abs(currentBmi - 22) * 3));
        const aiScore = Math.round(Math.min(100, Math.max(30, (bpScore * 0.4 + sugarScore * 0.4 + bmiScore * 0.2))));

        patients.push({
            Patient_ID: patientId,
            Name: name,
            Age: age,
            Gender: gender,
            Height_cm: height,
            Baseline_Weight_kg: baselineWeight,
            Current_Weight_kg: currentWeight,
            Baseline_Systolic_BP: baselineSys,
            Baseline_Diastolic_BP: baselineDia,
            Current_Systolic_BP: currentSys,
            Current_Diastolic_BP: currentDia,
            Baseline_Fasting_Sugar: baselineSugar,
            Current_Fasting_Sugar: currentSugar,
            Primary_Disease: disease,
            Visit_Date: visitDate,
            Treatment_Adherence: adherence,
            Treatment_Duration_Weeks: disease !== "None" ? Math.floor(4 + random() * 20) : 0,
            AI_Health_Score: aiScore
        });
    }
}

// --- UPDATE DASHBOARD UI ---
function updateDashboardUI() {
    updateKpis();
    renderDashboardCharts();
    populatePatientTable();
    updateComparisonMetrics();
    generateAIInsights(false);
    initPowerBiEmbed();
}

// --- FILTERS & SEARCH ---
function initFilters() {
    const searchInput = document.getElementById("patient-search");
    const diseaseFilter = document.getElementById("disease-filter");
    const genderFilter = document.getElementById("gender-filter");
    const ageFilter = document.getElementById("age-filter");

    const applyFilters = () => {
        const query = searchInput.value.toLowerCase().trim();
        const disease = diseaseFilter.value;
        const gender = genderFilter.value;
        const ageGroup = ageFilter.value;

        filteredPatients = patients.filter(p => {
            const matchesSearch = !query ||
                p.Name.toLowerCase().includes(query) ||
                p.Patient_ID.toLowerCase().includes(query);
            const matchesDisease = disease === "all" || p.Primary_Disease === disease;
            const matchesGender = gender === "all" || p.Gender === gender;

            let matchesAge = true;
            if (ageGroup !== "all") {
                const age = p.Age;
                if (ageGroup === "18-30") matchesAge = age >= 18 && age <= 30;
                else if (ageGroup === "31-45") matchesAge = age >= 31 && age <= 45;
                else if (ageGroup === "46-60") matchesAge = age >= 46 && age <= 60;
                else if (ageGroup === "61-75") matchesAge = age >= 61 && age <= 75;
                else if (ageGroup === "75+") matchesAge = age > 75;
            }

            return matchesSearch && matchesDisease && matchesGender && matchesAge;
        });

        updateKpis();
        renderDashboardCharts();
        populatePatientTable();
        updateComparisonMetrics();
        generateAIInsights(false);
    };

    searchInput.addEventListener("input", applyFilters);
    diseaseFilter.addEventListener("change", applyFilters);
    genderFilter.addEventListener("change", applyFilters);
    ageFilter.addEventListener("change", applyFilters);
}

// --- CALCULATE KPIS ---
function updateKpis() {
    const count = filteredPatients.length;
    const totalEl = document.getElementById("kpi-total-patients");
    const bmiEl = document.getElementById("kpi-avg-bmi");
    const bpEl = document.getElementById("kpi-critical-bp");
    const sugarEl = document.getElementById("kpi-sugar-alert");
    const scoreEl = document.getElementById("kpi-health-score");

    if (!totalEl) return;

    // Animate count update
    animateCounterUpdate(totalEl, parseInt(totalEl.textContent) || 0, count, 0);

    if (count === 0) {
        bmiEl.textContent = "0.0";
        bpEl.textContent = "0%";
        sugarEl.textContent = "0%";
        scoreEl.textContent = "0";
        return;
    }

    // Average BMI
    let bmiSum = 0;
    filteredPatients.forEach(p => {
        bmiSum += p.Current_Weight_kg / ((p.Height_cm / 100) ** 2);
    });
    bmiEl.textContent = (bmiSum / count).toFixed(1);

    // Critical BP: Systolic >= 140 or Diastolic >= 90
    const criticalBpCount = filteredPatients.filter(p =>
        p.Current_Systolic_BP >= 140 || p.Current_Diastolic_BP >= 90
    ).length;
    bpEl.textContent = `${((criticalBpCount / count) * 100).toFixed(0)}%`;

    // Diabetes sugar alert: Fasting >= 126
    const sugarAlertCount = filteredPatients.filter(p => p.Current_Fasting_Sugar >= 126).length;
    sugarEl.textContent = `${((sugarAlertCount / count) * 100).toFixed(0)}%`;

    // Average AI Health Score
    const healthSum = filteredPatients.reduce((s, p) => s + p.AI_Health_Score, 0);
    scoreEl.textContent = Math.round(healthSum / count);
}

// Smooth counter animation
function animateCounterUpdate(el, from, to, decimals) {
    const duration = 600;
    const start = performance.now();
    const update = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const value = from + (to - from) * eased;
        el.textContent = decimals > 0 ? value.toFixed(decimals) : Math.round(value);
        if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
}

// --- CHART UTILITIES ---
function destroyChart(name) {
    if (charts[name]) {
        charts[name].destroy();
        charts[name] = null;
    }
}

// --- RENDER DASHBOARD CHARTS ---
function renderDashboardCharts() {
    const activeSection = document.querySelector(".section-active");
    if (!activeSection || activeSection.id !== "dashboard-view") return;

    renderVisitTrendsChart();
    renderBloodPressureChart();
    renderGenderChart();
    renderDiseaseAgeChart();
}

// CHART 1: Monthly Visit Trends (Line/Area)
function renderVisitTrendsChart() {
    destroyChart("visitTrends");
    const ctx = document.getElementById("visitTrendsChart");
    if (!ctx) return;

    // Count visits per month label
    const monthCounts = {};
    FALLBACK_MONTHS.forEach(m => (monthCounts[m] = 0));

    filteredPatients.forEach(p => {
        const d = new Date(p.Visit_Date);
        if (isNaN(d.getTime())) return;
        // Build "Mon YYYY" key matching FALLBACK_MONTHS format
        const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthCounts.hasOwnProperty(key)) {
            monthCounts[key]++;
        }
    });

    const dataValues = FALLBACK_MONTHS.map(m => monthCounts[m]);

    const canvasCtx = ctx.getContext('2d');
    const gradient = canvasCtx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(0, 242, 254, 0.45)');
    gradient.addColorStop(1, 'rgba(0, 242, 254, 0.0)');

    charts.visitTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: FALLBACK_MONTHS,
            datasets: [{
                label: 'Monthly Admissions',
                data: dataValues,
                borderColor: '#00f2fe',
                borderWidth: 2.5,
                backgroundColor: gradient,
                fill: true,
                tension: 0.45,
                pointBackgroundColor: '#00f2fe',
                pointBorderColor: '#050a18',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(8, 14, 30, 0.9)',
                    borderColor: 'rgba(0, 242, 254, 0.3)',
                    borderWidth: 1,
                    titleColor: '#00f2fe',
                    bodyColor: '#f5f6fa',
                    callbacks: {
                        label: (ctx) => ` ${ctx.raw} patient visits`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#8c9bb4', font: { size: 10 }, maxRotation: 45 }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#8c9bb4', font: { size: 10 }, stepSize: 1, precision: 0 }
                }
            }
        }
    });
}

// CHART 2: Blood Pressure Clinical Scatter Plot
function renderBloodPressureChart() {
    destroyChart("bloodPressure");
    const ctx = document.getElementById("bloodPressureChart");
    if (!ctx) return;

    const scatterData = filteredPatients.map(p => ({
        x: p.Current_Diastolic_BP,
        y: p.Current_Systolic_BP,
        name: p.Name,
        id: p.Patient_ID
    }));

    charts.bloodPressure = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Patients',
                data: scatterData,
                backgroundColor: function (context) {
                    const val = context.raw;
                    if (!val) return 'rgba(0, 242, 254, 0.7)';
                    if (val.y >= 140 || val.x >= 90) return 'rgba(255, 42, 95, 0.85)';
                    if (val.y >= 130 || val.x >= 80) return 'rgba(255, 159, 67, 0.85)';
                    return 'rgba(0, 245, 160, 0.85)';
                },
                pointRadius: 6,
                pointHoverRadius: 9
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(8, 14, 30, 0.9)',
                    borderColor: 'rgba(0, 242, 254, 0.3)',
                    borderWidth: 1,
                    titleColor: '#00f2fe',
                    bodyColor: '#f5f6fa',
                    callbacks: {
                        label: (context) => {
                            const p = context.raw;
                            return `${p.name} | ${p.y}/${p.x} mmHg`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Diastolic (mmHg)', color: '#8c9bb4', font: { size: 11 } },
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#8c9bb4' },
                    min: 50, max: 120
                },
                y: {
                    title: { display: true, text: 'Systolic (mmHg)', color: '#8c9bb4', font: { size: 11 } },
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#8c9bb4' },
                    min: 80, max: 200
                }
            }
        }
    });
}

// CHART 3: Gender Doughnut
function renderGenderChart() {
    destroyChart("gender");
    const ctx = document.getElementById("genderChart");
    if (!ctx) return;

    let mCount = 0, fCount = 0, nbCount = 0;
    filteredPatients.forEach(p => {
        if (p.Gender === "Male") mCount++;
        else if (p.Gender === "Female") fCount++;
        else nbCount++;
    });

    charts.gender = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Male', 'Female', 'Non-binary'],
            datasets: [{
                data: [mCount, fCount, nbCount],
                backgroundColor: ['rgba(79, 172, 254, 0.85)', 'rgba(127, 0, 255, 0.85)', 'rgba(0, 245, 160, 0.85)'],
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.08)',
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#f5f6fa', font: { size: 11 }, padding: 15, boxWidth: 12 }
                },
                tooltip: {
                    backgroundColor: 'rgba(8, 14, 30, 0.9)',
                    borderColor: 'rgba(0, 242, 254, 0.3)',
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.raw} patients (${((ctx.raw / filteredPatients.length) * 100).toFixed(1)}%)`
                    }
                }
            },
            cutout: '68%'
        }
    });
}

// CHART 4: Disease Prevalence by Age Cohort (Stacked Bar)
function renderDiseaseAgeChart() {
    destroyChart("diseaseAge");
    const ctx = document.getElementById("diseaseAgeChart");
    if (!ctx) return;

    const cohorts = ["18-30", "31-45", "46-60", "61-75", "75+"];
    const diseaseList = ["Cardiovascular", "Diabetes", "Respiratory", "Oncology", "Neurological", "None"];

    const matrix = {};
    diseaseList.forEach(d => (matrix[d] = [0, 0, 0, 0, 0]));

    filteredPatients.forEach(p => {
        const age = p.Age;
        let index = 0;
        if (age >= 18 && age <= 30) index = 0;
        else if (age >= 31 && age <= 45) index = 1;
        else if (age >= 46 && age <= 60) index = 2;
        else if (age >= 61 && age <= 75) index = 3;
        else if (age > 75) index = 4;
        if (matrix[p.Primary_Disease]) matrix[p.Primary_Disease][index]++;
    });

    const colors = {
        "Cardiovascular": "rgba(255, 42, 95, 0.85)",
        "Diabetes": "rgba(255, 159, 67, 0.85)",
        "Respiratory": "rgba(0, 242, 254, 0.85)",
        "Oncology": "rgba(127, 0, 255, 0.85)",
        "Neurological": "rgba(163, 112, 247, 0.85)",
        "None": "rgba(87, 101, 116, 0.85)"
    };

    charts.diseaseAge = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: cohorts,
            datasets: diseaseList.map(d => ({
                label: d,
                data: matrix[d],
                backgroundColor: colors[d],
                borderWidth: 0,
                borderRadius: 3
            }))
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#f5f6fa', font: { size: 9 }, boxWidth: 10, padding: 8 }
                },
                tooltip: {
                    backgroundColor: 'rgba(8, 14, 30, 0.9)',
                    borderColor: 'rgba(0, 242, 254, 0.3)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#8c9bb4', precision: 0 }
                },
                y: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: '#8c9bb4' }
                }
            }
        }
    });
}

// --- VIEW 2: PATIENT TABLE REGISTRY ---
function populatePatientTable() {
    const tableBody = document.getElementById("patient-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    const sorted = [...filteredPatients].sort((a, b) => a.Patient_ID.localeCompare(b.Patient_ID));
    const renderList = sorted.slice(0, 30);

    if (renderList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:2rem; margin-bottom:10px;">🔍</div>
            No patients match the current filters.
        </td></tr>`;
        return;
    }

    renderList.forEach(p => {
        // Sugar badge
        let sugarBadge = "badge-green";
        if (p.Current_Fasting_Sugar >= 126) sugarBadge = "badge-pink";
        else if (p.Current_Fasting_Sugar >= 100) sugarBadge = "badge-orange";

        // BP badge
        let bpBadge = "badge-green";
        if (p.Current_Systolic_BP >= 140 || p.Current_Diastolic_BP >= 90) bpBadge = "badge-pink";
        else if (p.Current_Systolic_BP >= 130 || p.Current_Diastolic_BP >= 80) bpBadge = "badge-orange";

        // BMI badge
        const bmi = p.Current_Weight_kg / ((p.Height_cm / 100) ** 2);
        let bmiBadge = "badge-green";
        if (bmi >= 30) bmiBadge = "badge-pink";
        else if (bmi >= 25) bmiBadge = "badge-orange";
        else if (bmi < 18.5) bmiBadge = "badge-purple";

        // Disease badge
        let diseaseBadge = "badge-cyan";
        if (p.Primary_Disease === "None") diseaseBadge = "badge-purple";
        else if (p.Primary_Disease === "Cardiovascular") diseaseBadge = "badge-pink";
        else if (p.Primary_Disease === "Diabetes") diseaseBadge = "badge-orange";

        // Score color inline
        const scoreColor = p.AI_Health_Score >= 70 ? '#00f5a0' : p.AI_Health_Score >= 50 ? '#ff9f43' : '#ff2a5f';

        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.dataset.patientId = p.Patient_ID;
        tr.innerHTML = `
            <td style="font-weight:600; color:var(--cyan-primary);">${p.Patient_ID}</td>
            <td>${p.Name}</td>
            <td>${p.Age} yrs / ${p.Gender}</td>
            <td><span class="badge ${diseaseBadge}">${p.Primary_Disease}</span></td>
            <td><span class="badge ${sugarBadge}">${p.Current_Fasting_Sugar} mg/dL</span></td>
            <td><span class="badge ${bpBadge}">${p.Current_Systolic_BP}/${p.Current_Diastolic_BP}</span></td>
            <td><span class="badge ${bmiBadge}">${bmi.toFixed(1)}</span></td>
            <td style="font-weight:700; color:${scoreColor};">${p.AI_Health_Score}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-view view-btn">View</button>
                    <button class="btn-edit edit-btn">Edit</button>
                </div>
            </td>
        `;

        // Attach click event to button safely (no inline onclick with string interpolation)
        tr.querySelector('.view-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openPatientDetail(p.Patient_ID);
        });
        
        tr.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openPatientForm(p.Patient_ID);
        });

        // Clicking the row also opens modal
        tr.addEventListener('click', () => openPatientDetail(p.Patient_ID));

        tableBody.appendChild(tr);
    });

    // Show count note if more patients exist
    if (filteredPatients.length > 30) {
        const note = document.createElement("tr");
        note.innerHTML = `<td colspan="9" style="text-align:center; padding:12px 20px; color:var(--text-muted); font-size:0.78rem;">
            Showing 30 of ${filteredPatients.length} patients. Use filters to narrow results.
        </td>`;
        tableBody.appendChild(note);
    }
}

// --- PATIENT MODAL DETAILS ---
window.openPatientDetail = function (patientId) {
    const p = patients.find(pat => pat.Patient_ID === patientId);
    if (!p) return;

    document.getElementById("modal-patient-name").textContent = p.Name;
    document.getElementById("modal-patient-id").textContent = p.Patient_ID;
    document.getElementById("modal-age-gender").textContent = `${p.Age} yrs / ${p.Gender}`;
    document.getElementById("modal-height").textContent = `${p.Height_cm} cm`;
    document.getElementById("modal-weight").textContent = `${p.Baseline_Weight_kg} kg (Baseline) → ${p.Current_Weight_kg} kg (Current)`;
    document.getElementById("modal-bp").textContent = `${p.Current_Systolic_BP}/${p.Current_Diastolic_BP} mmHg  ·  Baseline: ${p.Baseline_Systolic_BP}/${p.Baseline_Diastolic_BP}`;
    document.getElementById("modal-sugar").textContent = `${p.Current_Fasting_Sugar} mg/dL  ·  Baseline: ${p.Baseline_Fasting_Sugar} mg/dL`;
    document.getElementById("modal-disease").textContent = p.Primary_Disease;
    document.getElementById("modal-duration").textContent = p.Treatment_Duration_Weeks;

    // Adherence badge
    const adherenceEl = document.getElementById("modal-adherence");
    adherenceEl.textContent = p.Treatment_Adherence;
    adherenceEl.className = "badge";
    if (p.Treatment_Adherence === "High") adherenceEl.classList.add("badge-green");
    else if (p.Treatment_Adherence === "Medium") adherenceEl.classList.add("badge-orange");
    else if (p.Treatment_Adherence === "Low") adherenceEl.classList.add("badge-pink");
    else adherenceEl.classList.add("badge-purple");

    // Health score ring — color based on value
    const scoreEl = document.getElementById("modal-health-score");
    scoreEl.textContent = p.AI_Health_Score;
    scoreEl.style.borderTopColor = p.AI_Health_Score >= 70 ? 'var(--green-success)' :
        p.AI_Health_Score >= 50 ? 'var(--orange-warning)' : 'var(--pink-accent)';
    scoreEl.style.color = p.AI_Health_Score >= 70 ? 'var(--green-success)' :
        p.AI_Health_Score >= 50 ? 'var(--orange-warning)' : 'var(--pink-accent)';
    scoreEl.style.boxShadow = p.AI_Health_Score >= 70 ? '0 0 20px rgba(0, 245, 160, 0.2)' :
        p.AI_Health_Score >= 50 ? '0 0 20px rgba(255, 159, 67, 0.2)' : '0 0 20px rgba(255, 42, 95, 0.2)';

    // Dynamic AI medical note
    let aiNote = "";
    const bmi = p.Current_Weight_kg / ((p.Height_cm / 100) ** 2);
    const bpStatus = p.Current_Systolic_BP >= 140 || p.Current_Diastolic_BP >= 90
        ? "Stage 2 Hypertension detected." : "Blood pressure within manageable range.";

    if (p.Primary_Disease === "Diabetes") {
        aiNote = `Patient presents with diabetic indicators. Current fasting glucose is ${p.Current_Fasting_Sugar} mg/dL (Baseline: ${p.Baseline_Fasting_Sugar} mg/dL). `;
        if (p.Treatment_Adherence === "High") {
            aiNote += `Excellent adherence is yielding measurable glucose reduction. AI projection: continued glycaemic stabilization likely within 6-8 weeks. Recommend HbA1c recheck.`;
        } else if (p.Treatment_Adherence === "Medium") {
            aiNote += `Moderate adherence — glycaemic control is partial. Recommend dietitian consultation and glucose monitoring intensification.`;
        } else {
            aiNote += `Poor glycaemic control observed. High fluctuation risk. Immediate insulin therapy titration and structured meal planning audit recommended.`;
        }
    } else if (p.Primary_Disease === "Cardiovascular") {
        aiNote = `Cardiovascular anomalies on record. ${bpStatus} Current BP: ${p.Current_Systolic_BP}/${p.Current_Diastolic_BP} mmHg. BMI: ${bmi.toFixed(1)}. `;
        if (p.Current_Systolic_BP >= 140 || p.Current_Diastolic_BP >= 90) {
            aiNote += `Cardiac strain risk is elevated. Recommend ACE-inhibitor therapy review, low-sodium dietary protocol, and daily remote tele-monitoring.`;
        } else {
            aiNote += `BP controlled under current therapeutic plan. AI model detects ~12% cardio-score improvement since baseline. Maintain current medication parameters.`;
        }
    } else if (p.Primary_Disease === "Respiratory") {
        aiNote = `Chronic respiratory diagnosis confirmed. AI Health Score: ${p.AI_Health_Score}. ${bpStatus} Ensure bronchodilator adherence, avoid allergen exposure, and conduct spirometry biannually.`;
    } else if (p.Primary_Disease === "Oncology") {
        aiNote = `Oncology patient profile. AI Score: ${p.AI_Health_Score}. Treatment duration: ${p.Treatment_Duration_Weeks} weeks. Monitor for systemic side effects of therapy; maintain nutritional support programs.`;
    } else if (p.Primary_Disease === "Neurological") {
        aiNote = `Neurological condition documented. AI Score: ${p.AI_Health_Score}. Cognitive and motor assessments recommended at each visit. ${bpStatus}`;
    } else {
        aiNote = `No primary chronic disease detected. Routine preventative care recommended. AI Health Score of ${p.AI_Health_Score} indicates low systemic risk. BMI ${bmi.toFixed(1)} — ${bmi < 18.5 ? 'underweight, nutritional evaluation advised' : bmi < 25 ? 'within healthy range' : bmi < 30 ? 'mildly overweight' : 'obese range — weight management intervention suggested'}.`;
    }

    document.getElementById("modal-ai-note").textContent = aiNote;

    // Reveal modal
    document.getElementById("patient-detail-modal").classList.add("active");
};

// Modal close handlers
document.getElementById("close-modal-btn").addEventListener("click", () => {
    document.getElementById("patient-detail-modal").classList.remove("active");
});
document.getElementById("patient-detail-modal").addEventListener("click", (e) => {
    if (e.target.id === "patient-detail-modal") {
        document.getElementById("patient-detail-modal").classList.remove("active");
    }
});
// Keyboard ESC to close modal
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.getElementById("patient-detail-modal").classList.remove("active");
        const formModal = document.getElementById("patient-form-modal");
        if (formModal) formModal.classList.remove("active");
        const menu = document.getElementById("export-context-menu");
        if (menu) menu.remove();
    }
});

// --- ADD / EDIT PATIENT FORM LOGIC ---
function initPatientForm() {
    const addBtn = document.getElementById("add-patient-btn");
    const closeBtn = document.getElementById("close-form-btn");
    const cancelBtn = document.getElementById("cancel-form-btn");
    const form = document.getElementById("patient-form");
    const modal = document.getElementById("patient-form-modal");

    if (addBtn) {
        addBtn.addEventListener("click", () => openPatientForm());
    }

    const closeModal = (e) => {
        if (e) e.preventDefault();
        modal.classList.remove("active");
    };

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    
    // Close on click outside
    modal.addEventListener("click", (e) => {
        if (e.target.id === "patient-form-modal") {
            closeModal();
        }
    });

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            savePatient();
            closeModal();
        });
    }
}

window.openPatientForm = function(patientId = null) {
    const modal = document.getElementById("patient-form-modal");
    const title = document.getElementById("form-modal-title");
    const form = document.getElementById("patient-form");
    
    if (!modal || !form) return;
    
    form.reset();
    document.getElementById("form-patient-id").value = patientId || "";
    
    if (patientId) {
        title.textContent = "Edit Patient Record";
        const p = patients.find(pat => pat.Patient_ID === patientId);
        if (p) {
            document.getElementById("form-name").value = p.Name || "";
            document.getElementById("form-age").value = p.Age || "";
            document.getElementById("form-gender").value = p.Gender || "Male";
            document.getElementById("form-disease").value = p.Primary_Disease || "None";
            document.getElementById("form-height").value = p.Height_cm || "";
            document.getElementById("form-weight").value = p.Current_Weight_kg || "";
            document.getElementById("form-sys-bp").value = p.Current_Systolic_BP || "";
            document.getElementById("form-dia-bp").value = p.Current_Diastolic_BP || "";
            document.getElementById("form-sugar").value = p.Current_Fasting_Sugar || "";
            document.getElementById("form-adherence").value = p.Treatment_Adherence || "None";
        }
    } else {
        title.textContent = "Add New Patient";
    }
    
    modal.classList.add("active");
};

function savePatient() {
    const idField = document.getElementById("form-patient-id").value;
    
    // Gather form values
    const age = parseInt(document.getElementById("form-age").value) || 0;
    const height = parseFloat(document.getElementById("form-height").value) || 0;
    const weight = parseFloat(document.getElementById("form-weight").value) || 0;
    const sysBp = parseInt(document.getElementById("form-sys-bp").value) || 0;
    const diaBp = parseInt(document.getElementById("form-dia-bp").value) || 0;
    const sugar = parseInt(document.getElementById("form-sugar").value) || 0;
    const disease = document.getElementById("form-disease").value;
    
    // Simulate an AI health score based on inputs
    const bmi = weight / ((height / 100) ** 2) || 22;
    let score = 100;
    if (age > 60) score -= (age - 60) * 0.5;
    if (bmi >= 30) score -= 15;
    else if (bmi >= 25) score -= 5;
    if (sysBp >= 140) score -= 20;
    else if (sysBp >= 130) score -= 10;
    if (sugar >= 126) score -= 20;
    else if (sugar >= 100) score -= 10;
    if (disease !== "None") score -= 15;
    score = Math.max(10, Math.min(100, Math.round(score)));

    const newPatientData = {
        Name: document.getElementById("form-name").value,
        Age: age,
        Gender: document.getElementById("form-gender").value,
        Primary_Disease: disease,
        Height_cm: height,
        Current_Weight_kg: weight,
        Current_Systolic_BP: sysBp,
        Current_Diastolic_BP: diaBp,
        Current_Fasting_Sugar: sugar,
        Treatment_Adherence: document.getElementById("form-adherence").value,
        AI_Health_Score: score,
        Baseline_Weight_kg: weight, // simplistic fallback
        Baseline_Systolic_BP: sysBp,
        Baseline_Diastolic_BP: diaBp,
        Baseline_Fasting_Sugar: sugar,
        Treatment_Duration_Weeks: 0,
        Visit_Date: new Date().toISOString().split('T')[0]
    };

    if (idField) {
        // Edit existing
        const index = patients.findIndex(p => p.Patient_ID === idField);
        if (index !== -1) {
            patients[index] = { ...patients[index], ...newPatientData };
            showToast(`✔ Updated patient ${idField} successfully.`, "success");
        }
    } else {
        // Add new
        const newId = `PAT-${Math.floor(Math.random() * 9000) + 1000}`;
        newPatientData.Patient_ID = newId;
        patients.push(newPatientData);
        showToast(`✔ Added new patient ${newId} successfully.`, "success");
    }

    // Refresh UI
    filteredPatients = [...patients]; 
    const filterBtn = document.getElementById("apply-filters-btn");
    if (filterBtn) {
        filterBtn.click();
    } else {
        updateDashboardUI();
    }
}

// --- VIEW 3: BMI INTERACTIVE CALCULATOR ---
function initBmiCalculator() {
    const hSlider = document.getElementById("bmi-height-slider");
    const wSlider = document.getElementById("bmi-weight-slider");
    const valHeight = document.getElementById("val-height");
    const valWeight = document.getElementById("val-weight");
    const lblHeight = document.getElementById("lbl-height");
    const lblWeight = document.getElementById("lbl-weight");
    const bmiDisplay = document.getElementById("bmi-value-display");
    const categoryDisplay = document.getElementById("bmi-category-display");
    const barIndicator = document.getElementById("bmi-bar-indicator");

    if (!hSlider || !wSlider) return;

    const updateCalculator = () => {
        const h = parseFloat(hSlider.value);
        const w = parseFloat(wSlider.value);

        // Update all label elements
        valHeight.textContent = `${h} cm`;
        valWeight.textContent = `${w} kg`;
        if (lblHeight) lblHeight.textContent = h;
        if (lblWeight) lblWeight.textContent = w;

        const bmi = w / ((h / 100) ** 2);
        bmiDisplay.textContent = bmi.toFixed(1);

        // Category, color, and bar fill
        categoryDisplay.className = "bmi-category-text badge";
        let fillPct = 0;

        if (bmi < 18.5) {
            categoryDisplay.textContent = "Underweight";
            categoryDisplay.classList.add("badge-purple");
            fillPct = Math.round((bmi / 18.5) * 20);
            bmiDisplay.style.color = "var(--purple-accent)";
            bmiDisplay.style.textShadow = "0 0 20px rgba(127, 0, 255, 0.4)";
        } else if (bmi < 25) {
            categoryDisplay.textContent = "Normal Weight";
            categoryDisplay.classList.add("badge-green");
            fillPct = Math.round(20 + ((bmi - 18.5) / 6.5) * 25);
            bmiDisplay.style.color = "var(--green-success)";
            bmiDisplay.style.textShadow = "0 0 20px rgba(0, 245, 160, 0.4)";
        } else if (bmi < 30) {
            categoryDisplay.textContent = "Overweight";
            categoryDisplay.classList.add("badge-orange");
            fillPct = Math.round(45 + ((bmi - 25) / 5) * 30);
            bmiDisplay.style.color = "var(--orange-warning)";
            bmiDisplay.style.textShadow = "0 0 20px rgba(255, 159, 67, 0.4)";
        } else {
            categoryDisplay.textContent = "Obese";
            categoryDisplay.classList.add("badge-pink");
            fillPct = Math.min(99, Math.round(75 + ((bmi - 30) / 10) * 24));
            bmiDisplay.style.color = "var(--pink-accent)";
            bmiDisplay.style.textShadow = "0 0 20px rgba(255, 42, 95, 0.4)";
        }

        barIndicator.style.width = `${fillPct}%`;
    };

    hSlider.addEventListener("input", updateCalculator);
    wSlider.addEventListener("input", updateCalculator);
    updateCalculator(); // Initialize with default values
}

// --- VIEW 4: TREATMENT EFFICACY (BEFORE/AFTER) ---
function updateComparisonMetrics() {
    const treatable = filteredPatients.filter(p => p.Primary_Disease !== "None");

    const wBeforeEl = document.getElementById("comp-w-before");
    const wAfterEl = document.getElementById("comp-w-after");
    const bpBeforeEl = document.getElementById("comp-bp-before");
    const bpAfterEl = document.getElementById("comp-bp-after");
    const sBeforeEl = document.getElementById("comp-s-before");
    const sAfterEl = document.getElementById("comp-s-after");

    if (!wBeforeEl) return;

    if (treatable.length === 0) {
        [wBeforeEl, wAfterEl, bpBeforeEl, bpAfterEl, sBeforeEl, sAfterEl].forEach(el => el.textContent = "0.0");
        return;
    }

    const n = treatable.length;
    wBeforeEl.textContent = (treatable.reduce((s, p) => s + p.Baseline_Weight_kg, 0) / n).toFixed(1);
    wAfterEl.textContent = (treatable.reduce((s, p) => s + p.Current_Weight_kg, 0) / n).toFixed(1);
    bpBeforeEl.textContent = (treatable.reduce((s, p) => s + p.Baseline_Systolic_BP, 0) / n).toFixed(1);
    bpAfterEl.textContent = (treatable.reduce((s, p) => s + p.Current_Systolic_BP, 0) / n).toFixed(1);
    sBeforeEl.textContent = (treatable.reduce((s, p) => s + p.Baseline_Fasting_Sugar, 0) / n).toFixed(1);
    sAfterEl.textContent = (treatable.reduce((s, p) => s + p.Current_Fasting_Sugar, 0) / n).toFixed(1);

    // Re-render charts if view is already active
    const activeSection = document.querySelector(".section-active");
    if (activeSection && activeSection.id === "before-after-view") {
        renderBeforeAfterCharts();
    }
}

function renderBeforeAfterCharts() {
    destroyChart("beforeAfterComp");
    destroyChart("adherence");

    const barCtx = document.getElementById("beforeAfterComparisonChart");
    const pieCtx = document.getElementById("adherenceChart");
    if (!barCtx || !pieCtx) return;

    const treatable = filteredPatients.filter(p => p.Primary_Disease !== "None");
    if (treatable.length === 0) return;

    const n = treatable.length;
    const avgWBefore = treatable.reduce((s, p) => s + p.Baseline_Weight_kg, 0) / n;
    const avgWAfter = treatable.reduce((s, p) => s + p.Current_Weight_kg, 0) / n;
    const avgBPBefore = treatable.reduce((s, p) => s + p.Baseline_Systolic_BP, 0) / n;
    const avgBPAfter = treatable.reduce((s, p) => s + p.Current_Systolic_BP, 0) / n;
    const avgSBefore = treatable.reduce((s, p) => s + p.Baseline_Fasting_Sugar, 0) / n;
    const avgSAfter = treatable.reduce((s, p) => s + p.Current_Fasting_Sugar, 0) / n;

    charts.beforeAfterComp = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: ['Avg Weight (kg)', 'Systolic BP (mmHg)', 'Fasting Sugar (mg/dL)'],
            datasets: [
                {
                    label: 'Baseline (Before Treatment)',
                    data: [avgWBefore.toFixed(1), avgBPBefore.toFixed(1), avgSBefore.toFixed(1)],
                    backgroundColor: 'rgba(140, 155, 180, 0.35)',
                    borderColor: 'rgba(140, 155, 180, 0.8)',
                    borderWidth: 1.5,
                    borderRadius: 5
                },
                {
                    label: 'Current (After Treatment)',
                    data: [avgWAfter.toFixed(1), avgBPAfter.toFixed(1), avgSAfter.toFixed(1)],
                    backgroundColor: 'rgba(0, 242, 254, 0.65)',
                    borderColor: '#00f2fe',
                    borderWidth: 1.5,
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#f5f6fa', font: { size: 11 } } },
                tooltip: {
                    backgroundColor: 'rgba(8, 14, 30, 0.9)',
                    borderColor: 'rgba(0, 242, 254, 0.3)',
                    borderWidth: 1
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#8c9bb4' } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#8c9bb4' } }
            }
        }
    });

    // Adherence breakdown
    let high = 0, med = 0, low = 0;
    treatable.forEach(p => {
        if (p.Treatment_Adherence === "High") high++;
        else if (p.Treatment_Adherence === "Medium") med++;
        else if (p.Treatment_Adherence === "Low") low++;
    });

    charts.adherence = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: ['High Adherence', 'Medium Adherence', 'Low Adherence'],
            datasets: [{
                data: [high, med, low],
                backgroundColor: [
                    'rgba(0, 245, 160, 0.85)',
                    'rgba(255, 159, 67, 0.85)',
                    'rgba(255, 42, 95, 0.85)'
                ],
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.08)',
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#f5f6fa', font: { size: 10 }, padding: 12 }
                },
                tooltip: {
                    backgroundColor: 'rgba(8, 14, 30, 0.9)',
                    borderColor: 'rgba(0, 242, 254, 0.3)',
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.raw} patients (${((ctx.raw / treatable.length) * 100).toFixed(1)}%)`
                    }
                }
            }
        }
    });
}

// --- VIEW 5: AI INSIGHTS TERMINAL ---
function generateAIInsights(withTypingEffect = false) {
    const textEl = document.getElementById("ai-insights-text");
    if (!textEl) return;

    const total = filteredPatients.length;
    if (total === 0) {
        textEl.innerHTML = `<div style="color:var(--text-muted); padding:10px;">
            AI engine requires data points to analyze. Adjust filters to search for clinical groups.
        </div>`;
        return;
    }

    const cardioCount = filteredPatients.filter(p => p.Primary_Disease === "Cardiovascular").length;
    const diabCount = filteredPatients.filter(p => p.Primary_Disease === "Diabetes").length;
    const respCount = filteredPatients.filter(p => p.Primary_Disease === "Respiratory").length;
    const cardioPct = ((cardioCount / total) * 100).toFixed(0);
    const diabPct = ((diabCount / total) * 100).toFixed(0);
    const respPct = ((respCount / total) * 100).toFixed(0);

    const stage2BpCount = filteredPatients.filter(p =>
        p.Current_Systolic_BP >= 140 || p.Current_Diastolic_BP >= 90
    ).length;
    const stage2BpPct = ((stage2BpCount / total) * 100).toFixed(0);

    const obeseCount = filteredPatients.filter(p => {
        const bmi = p.Current_Weight_kg / ((p.Height_cm / 100) ** 2);
        return bmi >= 30;
    }).length;
    const obesePct = ((obeseCount / total) * 100).toFixed(0);

    const avgHealthScore = Math.round(
        filteredPatients.reduce((s, p) => s + p.AI_Health_Score, 0) / total
    );

    const highAdherers = filteredPatients.filter(p => p.Treatment_Adherence === "High");
    let bpDropText = "Insufficient high-adherence data for BP drop analysis.";
    if (highAdherers.length > 2) {
        const beforeBp = highAdherers.reduce((s, p) => s + p.Baseline_Systolic_BP, 0) / highAdherers.length;
        const afterBp = highAdherers.reduce((s, p) => s + p.Current_Systolic_BP, 0) / highAdherers.length;
        const pctDrop = (((beforeBp - afterBp) / beforeBp) * 100).toFixed(1);
        const avgDrop = (beforeBp - afterBp).toFixed(1);
        bpDropText = `High-adherence patients (n=${highAdherers.length}) achieved a mean systolic reduction of ${avgDrop} mmHg — a ${pctDrop}% improvement from baseline.`;
    }

    const reportHTML = `
        <div style="font-family: monospace; color: var(--green-success); margin-bottom: 12px; font-size:0.82rem;">
            &gt;&gt; CLINI-AI COGNITIVE ENGINE — ANALYZING ${total} PATIENT TELEMETRY RECORDS...
        </div>
        <div style="margin-bottom:14px; font-size:0.88rem; color:var(--text-secondary);">
            Cohort composite health index: <strong style="color:${avgHealthScore >= 70 ? 'var(--green-success)' : avgHealthScore >= 50 ? 'var(--orange-warning)' : 'var(--pink-accent)'}">${avgHealthScore} / 100</strong>
        </div>
        <div class="ai-bullets">
            <div class="ai-bullet">
                <span class="ai-bullet-dot"></span>
                <span><strong>Epidemiology Snapshot:</strong> Cardiovascular disease is prevalent in ${cardioPct}% of this cohort, diabetic presentations represent ${diabPct}%, and respiratory conditions account for ${respPct}%.</span>
            </div>
            <div class="ai-bullet">
                <span class="ai-bullet-dot" style="background:var(--pink-accent); box-shadow:0 0 5px var(--pink-accent);"></span>
                <span><strong>Hypertensive Stress Alert:</strong> ${stage2BpPct}% of the analyzed population meets AHA Stage 2 Hypertension criteria (BP &ge; 140/90 mmHg). Recommend immediate pharmacological review and remote tele-monitoring enrollment.</span>
            </div>
            <div class="ai-bullet">
                <span class="ai-bullet-dot" style="background:var(--orange-warning); box-shadow:0 0 5px var(--orange-warning);"></span>
                <span><strong>Metabolic Risk Matrix:</strong> Obese BMI (&ge; 30) affects ${obesePct}% of this cohort. Obesity remains the primary catalyst driving insulin resistance, elevated fasting glucose, and hypertensive baseline values.</span>
            </div>
            <div class="ai-bullet">
                <span class="ai-bullet-dot" style="background:var(--green-success); box-shadow:0 0 5px var(--green-success);"></span>
                <span><strong>Adherence Efficacy Analysis:</strong> ${bpDropText} This confirms the measurable clinical impact of adherence-based therapy protocols.</span>
            </div>
            <div class="ai-bullet">
                <span class="ai-bullet-dot" style="background:var(--blue-accent); box-shadow:0 0 5px var(--blue-accent);"></span>
                <span><strong>AI Recommendation:</strong> Prioritize outreach to the ${stage2BpCount} patients with uncontrolled hypertension. Cross-referencing their disease profiles and adherence scores reveals the highest intervention ROI opportunity.</span>
            </div>
        </div>
    `;

    if (withTypingEffect) {
        textEl.innerHTML = `<span style="color:var(--green-success); font-family:monospace;">&gt;&gt; Initializing clinical intelligence scan...</span>`;
        setTimeout(() => { textEl.innerHTML = reportHTML; }, 700);
    } else {
        textEl.innerHTML = reportHTML;
    }
}

// --- VIEW 6: POWER BI INTEGRATION ---
function initPowerBiEmbed() {
    const container = document.getElementById("powerbi-container");
    const loadBtn = document.getElementById("load-powerbi-btn");
    if (!loadBtn || !container) return;

    loadBtn.addEventListener("click", () => {
        loadBtn.textContent = "Loading...";
        loadBtn.disabled = true;

        setTimeout(() => {
            container.innerHTML = `
                <div style="padding:14px 18px; display:flex; justify-content:space-between; align-items:center;
                    border-bottom:1px solid var(--border-color); background:rgba(0,0,0,0.25);">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:14px; height:14px; background:#f2c811; border-radius:3px;"></div>
                        <span style="font-size:0.8rem; font-family:var(--font-heading); font-weight:700;">
                            AetherHealth · Power BI Analytics Suite
                        </span>
                    </div>
                    <div style="display:flex; align-items:center; gap:16px;">
                        <span style="font-size:0.68rem; color:var(--green-success);">● Live DirectQuery Stream</span>
                        <span style="font-size:0.68rem; color:var(--text-muted);">${new Date().toLocaleString()}</span>
                    </div>
                </div>
                <div id="powerbi-charts-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:20px; padding:20px; height:calc(100% - 52px); overflow-y:auto;">
                    <div class="glass-panel" style="padding:16px;">
                        <div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                            📊 Disease Distribution KPIs
                        </div>
                        <div style="position: relative; height: 180px; width: 100%;">
                            <canvas id="pbi-disease-chart"></canvas>
                        </div>
                    </div>
                    <div class="glass-panel" style="padding:16px;">
                        <div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                            📈 AI Health Score Distribution
                        </div>
                        <div style="position: relative; height: 180px; width: 100%;">
                            <canvas id="pbi-score-chart"></canvas>
                        </div>
                    </div>
                    <div class="glass-panel" style="padding:16px;">
                        <div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                            🩸 BMI vs Blood Pressure Heatmap
                        </div>
                        <div style="position: relative; height: 180px; width: 100%;">
                            <canvas id="pbi-bmi-bp-chart"></canvas>
                        </div>
                    </div>
                    <div class="glass-panel" style="padding:16px;">
                        <div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                            💊 Treatment Duration by Disease
                        </div>
                        <div style="position: relative; height: 180px; width: 100%;">
                            <canvas id="pbi-duration-chart"></canvas>
                        </div>
                    </div>
                </div>
            `;

            // Render all 4 Power BI mock charts
            renderPbiDiseaseChart();
            renderPbiScoreChart();
            renderPbiBmiBpChart();
            renderPbiDurationChart();
        }, 800);
    });
}

function renderPbiDiseaseChart() {
    const ctx = document.getElementById("pbi-disease-chart");
    if (!ctx) return;
    const diseaseList = ["Cardiovascular", "Diabetes", "Respiratory", "Oncology", "Neurological", "None"];
    const colors = ["rgba(255,42,95,0.85)", "rgba(255,159,67,0.85)", "rgba(0,242,254,0.85)", "rgba(127,0,255,0.85)", "rgba(163,112,247,0.85)", "rgba(87,101,116,0.85)"];
    const counts = diseaseList.map(d => patients.filter(p => p.Primary_Disease === d).length);
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: diseaseList,
            datasets: [{ label: 'Patients', data: counts, backgroundColor: colors, borderRadius: 4, borderWidth: 0 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(8,14,30,0.9)', borderColor: 'rgba(0,242,254,0.3)', borderWidth: 1 } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#8c9bb4', font: { size: 9 } } },
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8c9bb4', precision: 0 } }
            }
        }
    });
}

function renderPbiScoreChart() {
    const ctx = document.getElementById("pbi-score-chart");
    if (!ctx) return;
    // Bucket scores into ranges
    const buckets = { '30-40': 0, '41-50': 0, '51-60': 0, '61-70': 0, '71-80': 0, '81-90': 0, '91-100': 0 };
    patients.forEach(p => {
        const s = p.AI_Health_Score;
        if (s <= 40) buckets['30-40']++;
        else if (s <= 50) buckets['41-50']++;
        else if (s <= 60) buckets['51-60']++;
        else if (s <= 70) buckets['61-70']++;
        else if (s <= 80) buckets['71-80']++;
        else if (s <= 90) buckets['81-90']++;
        else buckets['91-100']++;
    });
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(0,245,160,0.6)');
    gradient.addColorStop(1, 'rgba(0,245,160,0.05)');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(buckets),
            datasets: [{ label: 'Count', data: Object.values(buckets), backgroundColor: gradient, borderRadius: 4, borderWidth: 0 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#8c9bb4', font: { size: 9 } } },
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8c9bb4', precision: 0 } }
            }
        }
    });
}

function renderPbiBmiBpChart() {
    const ctx = document.getElementById("pbi-bmi-bp-chart");
    if (!ctx) return;
    const data = patients.map(p => ({
        x: p.Current_Weight_kg / ((p.Height_cm / 100) ** 2),
        y: p.Current_Systolic_BP
    }));
    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'BMI vs Systolic BP',
                data,
                backgroundColor: 'rgba(79,172,254,0.5)',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { title: { display: true, text: 'BMI', color: '#8c9bb4', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8c9bb4' } },
                y: { title: { display: true, text: 'Systolic BP', color: '#8c9bb4', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8c9bb4' } }
            }
        }
    });
}

function renderPbiDurationChart() {
    const ctx = document.getElementById("pbi-duration-chart");
    if (!ctx) return;
    const diseaseList = ["Cardiovascular", "Diabetes", "Respiratory", "Oncology", "Neurological"];
    const avgDurations = diseaseList.map(d => {
        const grp = patients.filter(p => p.Primary_Disease === d && p.Treatment_Duration_Weeks > 0);
        return grp.length ? (grp.reduce((s, p) => s + p.Treatment_Duration_Weeks, 0) / grp.length).toFixed(1) : 0;
    });
    const colors = ["rgba(255,42,95,0.8)", "rgba(255,159,67,0.8)", "rgba(0,242,254,0.8)", "rgba(127,0,255,0.8)", "rgba(163,112,247,0.8)"];
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: diseaseList,
            datasets: [{ label: 'Avg Weeks', data: avgDurations, backgroundColor: colors, borderRadius: 4, borderWidth: 0 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#8c9bb4', font: { size: 9 } } },
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8c9bb4' }, title: { display: true, text: 'Weeks', color: '#8c9bb4', font: { size: 9 } } }
            }
        }
    });
}

// --- REPORT DOWNLOAD ENGINE ---
function initDownloadBtn() {
    const downloadBtn = document.getElementById("download-report-btn");
    if (!downloadBtn) return;

    downloadBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        const existingMenu = document.getElementById("export-context-menu");
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = document.createElement("div");
        menu.id = "export-context-menu";

        // Position relative to button using getBoundingClientRect for accuracy
        const rect = downloadBtn.getBoundingClientRect();
        menu.style.cssText = `
            position: fixed;
            top: ${rect.bottom + 8}px;
            right: ${window.innerWidth - rect.right}px;
            background: rgba(8, 14, 30, 0.97);
            border: 1px solid var(--cyan-primary);
            border-radius: 14px;
            box-shadow: 0 10px 40px rgba(0, 242, 254, 0.25);
            z-index: 2000;
            display: flex;
            flex-direction: column;
            padding: 8px 0;
            width: 220px;
            backdrop-filter: blur(20px);
            animation: fadeIn 0.2s ease;
        `;

        const items = [
            { icon: '📄', text: 'Download CSV Report', action: downloadCSV },
            { icon: '📊', text: 'Download Excel Report', action: downloadExcel },
            { icon: '🖨️', text: 'Print / Save as PDF', action: printPDF }
        ];

        items.forEach((item, idx) => {
            if (idx > 0) {
                const divider = document.createElement("div");
                divider.style.cssText = "height:1px; background:rgba(255,255,255,0.06); margin:2px 12px;";
                menu.appendChild(divider);
            }

            const btn = document.createElement("button");
            btn.innerHTML = `<span style="margin-right:10px;">${item.icon}</span>${item.text}`;
            btn.style.cssText = `
                background: none; border: none;
                color: var(--text-primary);
                padding: 11px 18px;
                text-align: left;
                cursor: pointer;
                font-family: var(--font-body);
                font-size: 0.82rem;
                transition: all 0.2s ease;
                width: 100%;
                border-radius: 6px;
                margin: 1px 0;
            `;
            btn.addEventListener("mouseover", () => {
                btn.style.background = "rgba(0, 242, 254, 0.1)";
                btn.style.color = "var(--cyan-primary)";
            });
            btn.addEventListener("mouseout", () => {
                btn.style.background = "none";
                btn.style.color = "var(--text-primary)";
            });
            btn.addEventListener("click", () => {
                item.action();
                menu.remove();
            });
            menu.appendChild(btn);
        });

        document.body.appendChild(menu);

        // Click outside to close
        const closeMenu = (e) => {
            if (!downloadBtn.contains(e.target) && !menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener("click", closeMenu);
            }
        };
        setTimeout(() => document.addEventListener("click", closeMenu), 10);
    });
}

function downloadCSV() {
    if (filteredPatients.length === 0) {
        showToast("No patients to export. Adjust your filters.", "warning");
        return;
    }

    if (isBackendConnected) {
        const disease = document.getElementById("disease-filter").value;
        const gender = document.getElementById("gender-filter").value;
        const ageGroup = document.getElementById("age-filter").value;
        const query = document.getElementById("patient-search").value;
        window.open(`${BACKEND_URL}/api/export?type=csv&search=${query}&disease=${disease}&gender=${gender}&age_group=${ageGroup}`);
    } else {
        const headers = Object.keys(filteredPatients[0]);
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\r\n";
        filteredPatients.forEach(p => {
            const row = headers.map(h => {
                const val = p[h];
                return (typeof val === 'string' && val.includes(',')) ? `"${val}"` : val;
            }).join(",");
            csvContent += row + "\r\n";
        });

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `aetherhealth_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`✔ Exported ${filteredPatients.length} patient records to CSV.`, "success");
    }
}

function downloadExcel() {
    if (isBackendConnected) {
        const disease = document.getElementById("disease-filter").value;
        const gender = document.getElementById("gender-filter").value;
        const ageGroup = document.getElementById("age-filter").value;
        const query = document.getElementById("patient-search").value;
        window.open(`${BACKEND_URL}/api/export?type=xlsx&search=${query}&disease=${disease}&gender=${gender}&age_group=${ageGroup}`);
    } else {
        // Offline fallback: generate a CSV with .xls extension (Excel can open it)
        if (filteredPatients.length === 0) {
            showToast("No patients to export.", "warning");
            return;
        }
        const headers = Object.keys(filteredPatients[0]);
        let csvContent = "data:text/csv;charset=utf-8," + headers.join("\t") + "\r\n";
        filteredPatients.forEach(p => {
            const row = headers.map(h => p[h]).join("\t");
            csvContent += row + "\r\n";
        });
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `aetherhealth_report_${new Date().toISOString().split('T')[0]}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`✔ Exported ${filteredPatients.length} records as Excel-compatible file.`, "success");
    }
}

function printPDF() {
    const modal = document.getElementById("patient-detail-modal");
    if (modal) modal.classList.remove("active");
    const menu = document.getElementById("export-context-menu");
    if (menu) menu.remove();

    showToast("Opening print dialog... Use 'Save as PDF' in the dialog.", "info");
    setTimeout(() => window.print(), 300);
}

// --- TOAST NOTIFICATION SYSTEM ---
function showToast(message, type = "info") {
    const existing = document.getElementById("aether-toast");
    if (existing) existing.remove();

    const colors = {
        success: { bg: 'rgba(0,245,160,0.15)', border: 'var(--green-success)', text: 'var(--green-success)' },
        warning: { bg: 'rgba(255,159,67,0.15)', border: 'var(--orange-warning)', text: 'var(--orange-warning)' },
        error: { bg: 'rgba(255,42,95,0.15)', border: 'var(--pink-accent)', text: 'var(--pink-accent)' },
        info: { bg: 'rgba(0,242,254,0.12)', border: 'var(--cyan-primary)', text: 'var(--cyan-primary)' }
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement("div");
    toast.id = "aether-toast";
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        padding: 14px 22px;
        background: ${c.bg};
        border: 1px solid ${c.border};
        border-radius: 12px;
        color: ${c.text};
        font-family: var(--font-body);
        font-size: 0.85rem;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        backdrop-filter: blur(12px);
        max-width: 360px;
        animation: slideInToast 0.3s ease;
    `;
    toast.textContent = message;

    // Inject animation if not present
    if (!document.getElementById("toast-style")) {
        const style = document.createElement("style");
        style.id = "toast-style";
        style.textContent = `
            @keyframes slideInToast {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = "all 0.4s ease";
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}
