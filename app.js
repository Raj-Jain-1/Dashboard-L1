/**
 * AetherHealth Dashboard Logic
 * Handles sidebar routing, API connection, client-side simulation,
 * interactive calculations, Chart.js configurations, and medical report generation.
 */

// --- GLOBAL STATE ---
let patients = [];
let filteredPatients = [];
let charts = {};
const BACKEND_URL = "http://localhost:5000";
let isBackendConnected = false;

// Sample baseline cohort stats for fallback (simulates Pandas analytics engine)
const FALLBACK_MONTHS = ["Jun 2025", "Jul 2025", "Aug 2025", "Sep 2025", "Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026"];

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
            
            // Add active class
            item.classList.add("active");
            
            // Show targeted view
            const targetId = item.getAttribute("data-target");
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add("section-active");
            }
            
            // Re-render / update charts if switching to specific tabs
            if (targetId === "dashboard-view") {
                renderDashboardCharts();
            } else if (targetId === "before-after-view") {
                renderBeforeAfterCharts();
            } else if (targetId === "ai-insights-view") {
                generateAIInsights();
            }
        });
    });
}

// --- CHECK BACKEND CONNECTION ---
async function checkBackendConnection() {
    const indicator = document.getElementById("backend-indicator");
    const textEl = document.getElementById("backend-text");
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/health`, { method: 'GET', mode: 'cors' });
        if (response.ok) {
            isBackendConnected = true;
            indicator.classList.add("online");
            textEl.textContent = "Pandas API Connected";
            console.log("Connected to Python Flask API backend successfully.");
        } else {
            throw new Error();
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
            // Load full patient database from Python backend
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

// --- GENERATE CLIENT-SIDE FALLBACK PATIENT DATABASE (Matching Backend Schema) ---
function generateFallbackPatients() {
    const firstNamesM = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Daniel", "Matthew", "Anthony", "Paul", "Andrew", "Steven", "Paul", "Joshua"];
    const firstNamesF = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Nancy", "Lisa", "Betty", "Sandra", "Emily", "Donna", "Michelle"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Moore", "Martin", "Jackson"];
    const diseases = ["Cardiovascular", "Diabetes", "Respiratory", "Oncology", "Neurological", "None"];
    const genders = ["Male", "Female", "Non-binary"];
    
    patients = [];
    
    // Seeded random helper for deterministic values
    let seed = 42;
    function random() {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }
    
    // Create 120 patients
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
        
        // Disease logic
        let disease = "None";
        if (age > 55) {
            disease = random() > 0.4 ? diseases[Math.floor(random() * (diseases.length - 1))] : "None";
        } else if (age > 35) {
            disease = random() > 0.6 ? diseases[Math.floor(random() * (diseases.length - 1))] : "None";
        } else {
            disease = random() > 0.8 ? diseases[Math.floor(random() * (diseases.length - 1))] : "None";
        }
        
        // Weight
        let bmiBase = 18.5 + random() * 18;
        if (disease === "Diabetes" || disease === "Cardiovascular") bmiBase += 3;
        const baselineWeight = Math.round(bmiBase * ((height / 100) ** 2) * 10) / 10;
        
        // Adherence and weight changes
        const adherence = disease !== "None" ? ["High", "Medium", "Low"][Math.floor(random() * 3)] : "None";
        let weightChange = 0;
        if (adherence === "High") weightChange = -4 - random() * 4;
        else if (adherence === "Medium") weightChange = -1 - random() * 3;
        else weightChange = -1 + random() * 2;
        
        const currentWeight = Math.max(40, Math.round((baselineWeight + weightChange) * 10) / 10);
        
        // Blood pressure
        let baseSys = 115 + Math.floor(random() * 20);
        let baseDia = 75 + Math.floor(random() * 12);
        if (disease === "Cardiovascular") {
            baseSys += 20;
            baseDia += 12;
        }
        
        let sysChange = 0, diaChange = 0;
        if (adherence === "High") { sysChange = -12 - Math.floor(random() * 10); diaChange = -8 - Math.floor(random() * 6); }
        else if (adherence === "Medium") { sysChange = -6 - Math.floor(random() * 6); diaChange = -4 - Math.floor(random() * 4); }
        
        const baselineSys = baseSys;
        const baselineDia = baseDia;
        const currentSys = Math.max(90, baseSys + sysChange);
        const currentDia = Math.max(60, baseDia + diaChange);
        
        // Sugar level
        let baseSugar = 70 + Math.floor(random() * 50);
        if (disease === "Diabetes") {
            baseSugar += 70 + Math.floor(random() * 80);
        }
        let sugarChange = 0;
        if (adherence === "High") sugarChange = -20 - Math.floor(random() * 30);
        else if (adherence === "Medium") sugarChange = -8 - Math.floor(random() * 15);
        
        const baselineSugar = baseSugar;
        const currentSugar = Math.max(60, baseSugar + sugarChange);
        
        // Random Visit Date (within past year)
        const dateMonth = FALLBACK_MONTHS[Math.floor(random() * FALLBACK_MONTHS.length)];
        const dateDay = Math.floor(1 + random() * 28);
        const visitDate = `2025-${(FALLBACK_MONTHS.indexOf(dateMonth) + 6) % 12 + 1}-${dateDay < 10 ? '0' + dateDay : dateDay}`;
        
        // AI score
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
    generateAIInsights();
    initPowerBiEmbed();
}

// --- FILTERS & SEARCH ---
function initFilters() {
    const searchInput = document.getElementById("patient-search");
    const diseaseFilter = document.getElementById("disease-filter");
    const genderFilter = document.getElementById("gender-filter");
    const ageFilter = document.getElementById("age-filter");
    
    const applyFilters = () => {
        const query = searchInput.value.toLowerCase();
        const disease = diseaseFilter.value;
        const gender = genderFilter.value;
        const ageGroup = ageFilter.value;
        
        filteredPatients = patients.filter(p => {
            // Search text check
            const matchesSearch = p.Name.toLowerCase().includes(query) || p.Patient_ID.toLowerCase().includes(query);
            
            // Disease check
            const matchesDisease = disease === "all" || p.Primary_Disease === disease;
            
            // Gender check
            const matchesGender = gender === "all" || p.Gender === gender;
            
            // Age group check
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
        generateAIInsights();
    };
    
    searchInput.addEventListener("input", applyFilters);
    diseaseFilter.addEventListener("change", applyFilters);
    genderFilter.addEventListener("change", applyFilters);
    ageFilter.addEventListener("change", applyFilters);
}

// --- CALCULATE KPIS ---
function updateKpis() {
    const count = filteredPatients.length;
    
    document.getElementById("kpi-total-patients").textContent = count;
    
    if (count === 0) {
        document.getElementById("kpi-avg-bmi").textContent = "0.0";
        document.getElementById("kpi-critical-bp").textContent = "0%";
        document.getElementById("kpi-sugar-alert").textContent = "0%";
        document.getElementById("kpi-health-score").textContent = "0";
        return;
    }
    
    // Average BMI calculation
    let bmiSum = 0;
    filteredPatients.forEach(p => {
        const bmi = p.Current_Weight_kg / ((p.Height_cm / 100) ** 2);
        bmiSum += bmi;
    });
    const avgBmi = bmiSum / count;
    document.getElementById("kpi-avg-bmi").textContent = avgBmi.toFixed(1);
    
    // Critical BP: Systolic >= 140 or Diastolic >= 90
    const criticalBpCount = filteredPatients.filter(p => p.Current_Systolic_BP >= 140 || p.Current_Diastolic_BP >= 90).length;
    const criticalBpPct = (criticalBpCount / count) * 100;
    document.getElementById("kpi-critical-bp").textContent = `${criticalBpPct.toFixed(0)}%`;
    
    // Sugar Alert: Fasting Sugar >= 126
    const sugarAlertCount = filteredPatients.filter(p => p.Current_Fasting_Sugar >= 126).length;
    const sugarAlertPct = (sugarAlertCount / count) * 100;
    document.getElementById("kpi-sugar-alert").textContent = `${sugarAlertPct.toFixed(0)}%`;
    
    // Health Score Average
    const healthScoreSum = filteredPatients.reduce((sum, p) => sum + p.AI_Health_Score, 0);
    const avgHealthScore = Math.round(healthScoreSum / count);
    document.getElementById("kpi-health-score").textContent = avgHealthScore;
}

// --- RENDER CHARTS ---
function destroyChart(name) {
    if (charts[name]) {
        charts[name].destroy();
        charts[name] = null;
    }
}

function renderDashboardCharts() {
    // Only render if dashboard view is currently active (to prevent layout glitches)
    const activeSection = document.querySelector(".section-active");
    if (!activeSection || activeSection.id !== "dashboard-view") return;

    renderVisitTrendsChart();
    renderBloodPressureChart();
    renderGenderChart();
    renderDiseaseAgeChart();
}

function renderVisitTrendsChart() {
    destroyChart("visitTrends");
    const ctx = document.getElementById("visitTrendsChart");
    if (!ctx) return;

    // Group visits monthly
    const monthCounts = {};
    FALLBACK_MONTHS.forEach(m => monthCounts[m] = 0);
    
    filteredPatients.forEach(p => {
        // Map YYYY-MM-DD back to Months
        const date = new Date(p.Visit_Date);
        const options = { month: 'short', year: 'numeric' };
        const monthYearStr = date.toLocaleDateString('en-US', options);
        if (monthCounts[monthYearStr] !== undefined) {
            monthCounts[monthYearStr]++;
        }
    });

    const dataValues = Object.values(monthCounts);
    
    // Chart.js Area Chart Gradient fill
    const canvasCtx = ctx.getContext('2d');
    const gradient = canvasCtx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(0, 242, 254, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 242, 254, 0.0)');

    charts.visitTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: FALLBACK_MONTHS,
            datasets: [{
                label: 'Monthly Admissions/Visits',
                data: dataValues,
                borderColor: '#00f2fe',
                borderWidth: 2,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#00f2fe',
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#8c9bb4', font: { size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#8c9bb4', font: { size: 10 }, stepSize: 2 }
                }
            }
        }
    });
}

function renderBloodPressureChart() {
    destroyChart("bloodPressure");
    const ctx = document.getElementById("bloodPressureChart");
    if (!ctx) return;

    // Convert patients to scatter points: X = Diastolic, Y = Systolic
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
                backgroundColor: function(context) {
                    const val = context.raw;
                    if (!val) return 'rgba(0, 242, 254, 0.7)';
                    // Color code depending on severity
                    if (val.y >= 140 || val.x >= 90) return 'rgba(255, 42, 95, 0.85)'; // Critical
                    if (val.y >= 130 || val.x >= 80) return 'rgba(255, 159, 67, 0.85)'; // Elevated Stage 1
                    return 'rgba(0, 245, 160, 0.85)'; // Healthy/Normal
                },
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const p = context.raw;
                            return `${p.name} (${p.id}): ${p.y}/${p.x} mmHg`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Diastolic (mmHg)', color: '#8c9bb4', font: { size: 11 } },
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#8c9bb4' },
                    min: 50,
                    max: 120
                },
                y: {
                    title: { display: true, text: 'Systolic (mmHg)', color: '#8c9bb4', font: { size: 11 } },
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#8c9bb4' },
                    min: 80,
                    max: 200
                }
            }
        }
    });
}

function renderGenderChart() {
    destroyChart("gender");
    const ctx = document.getElementById("genderChart");
    if (!ctx) return;

    // Count genders
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
                backgroundColor: ['#4facfe', '#7f00ff', '#00f5a0'],
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#f5f6fa', font: { size: 10 } }
                }
            },
            cutout: '65%'
        }
    });
}

function renderDiseaseAgeChart() {
    destroyChart("diseaseAge");
    const ctx = document.getElementById("diseaseAgeChart");
    if (!ctx) return;

    // Define age brackets
    const cohorts = ["18-30", "31-45", "46-60", "61-75", "75+"];
    const diseaseList = ["Cardiovascular", "Diabetes", "Respiratory", "Oncology", "Neurological", "None"];
    
    // Initialize data grid
    const matrix = {};
    diseaseList.forEach(d => {
        matrix[d] = [0, 0, 0, 0, 0];
    });

    filteredPatients.forEach(p => {
        const age = p.Age;
        let index = 0;
        if (age >= 18 && age <= 30) index = 0;
        else if (age >= 31 && age <= 45) index = 1;
        else if (age >= 46 && age <= 60) index = 2;
        else if (age >= 61 && age <= 75) index = 3;
        else if (age > 75) index = 4;
        
        if (matrix[p.Primary_Disease]) {
            matrix[p.Primary_Disease][index]++;
        }
    });

    const colors = {
        "Cardiovascular": "#ff2a5f",
        "Diabetes": "#ff9f43",
        "Respiratory": "#00f2fe",
        "Oncology": "#7f00ff",
        "Neurological": "#a370f7",
        "None": "#576574"
    };

    const datasets = diseaseList.map(disease => ({
        label: disease,
        data: matrix[disease],
        backgroundColor: colors[disease],
        borderWidth: 0
    }));

    charts.diseaseAge = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: cohorts,
            datasets: datasets
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#f5f6fa', font: { size: 9 }, boxWidth: 10 }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#8c9bb4' }
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

// --- VIEW 2: PATIENT TABLE REGISTRY POPULATION ---
function populatePatientTable() {
    const tableBody = document.getElementById("patient-table-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    // Sort patients by ID ascending
    const sorted = [...filteredPatients].sort((a, b) => a.Patient_ID.localeCompare(b.Patient_ID));
    
    // Truncate to first 30 for responsive render performance
    const renderList = sorted.slice(0, 30);
    
    if (renderList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-muted);">No patient clinical matches found.</td></tr>`;
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
        
        // BMI
        const bmi = p.Current_Weight_kg / ((p.Height_cm / 100) ** 2);
        let bmiBadge = "badge-green";
        if (bmi >= 30) bmiBadge = "badge-pink";
        else if (bmi >= 25) bmiBadge = "badge-orange";
        else if (bmi < 18.5) bmiBadge = "badge-purple";
        
        // Disease tag style
        let diseaseBadge = "badge-cyan";
        if (p.Primary_Disease === "None") diseaseBadge = "badge-purple";
        else if (p.Primary_Disease === "Cardiovascular") diseaseBadge = "badge-pink";
        else if (p.Primary_Disease === "Diabetes") diseaseBadge = "badge-orange";
        
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.innerHTML = `
            <td style="font-weight: 600; color: var(--cyan-primary);">${p.Patient_ID}</td>
            <td>${p.Name}</td>
            <td>${p.Age} yrs / ${p.Gender}</td>
            <td><span class="badge ${diseaseBadge}">${p.Primary_Disease}</span></td>
            <td><span class="badge ${sugarBadge}">${p.Current_Fasting_Sugar} mg/dL</span></td>
            <td><span class="badge ${bpBadge}">${p.Current_Systolic_BP}/${p.Current_Diastolic_BP}</span></td>
            <td><span class="badge ${bmiBadge}">${bmi.toFixed(1)}</span></td>
            <td style="font-weight:700; color:#00f5a0;">${p.AI_Health_Score}</td>
            <td><button class="btn-primary" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 6px;" onclick="openPatientDetail('${p.Patient_ID}')">View</button></td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// --- PATIENT MODAL DETAILS OPENING ---
window.openPatientDetail = function(patientId) {
    const p = patients.find(pat => pat.Patient_ID === patientId);
    if (!p) return;

    document.getElementById("modal-patient-name").textContent = p.Name;
    document.getElementById("modal-patient-id").textContent = p.Patient_ID;
    document.getElementById("modal-age-gender").textContent = `${p.Age} yrs / ${p.Gender}`;
    document.getElementById("modal-height").textContent = `${p.Height_cm} cm`;
    document.getElementById("modal-weight").textContent = `${p.Baseline_Weight_kg} kg Baseline / ${p.Current_Weight_kg} kg Current`;
    document.getElementById("modal-bp").textContent = `${p.Current_Systolic_BP}/${p.Current_Diastolic_BP} mmHg (Baseline: ${p.Baseline_Systolic_BP}/${p.Baseline_Diastolic_BP})`;
    document.getElementById("modal-sugar").textContent = `${p.Current_Fasting_Sugar} mg/dL (Baseline: ${p.Baseline_Fasting_Sugar})`;
    document.getElementById("modal-disease").textContent = p.Primary_Disease;
    document.getElementById("modal-duration").textContent = p.Treatment_Duration_Weeks;
    
    // Adherence label style
    const adherenceEl = document.getElementById("modal-adherence");
    adherenceEl.textContent = p.Treatment_Adherence;
    adherenceEl.className = "badge";
    if (p.Treatment_Adherence === "High") adherenceEl.classList.add("badge-green");
    else if (p.Treatment_Adherence === "Medium") adherenceEl.classList.add("badge-orange");
    else if (p.Treatment_Adherence === "Low") adherenceEl.classList.add("badge-pink");
    else adherenceEl.classList.add("badge-purple");
    
    // Health score
    document.getElementById("modal-health-score").textContent = p.AI_Health_Score;
    
    // Dynamic AI Medical Diagnosis
    let aiNote = "";
    if (p.Primary_Disease === "Diabetes") {
        aiNote = `Patient shows diabetic conditions with Fasting Sugar reading of ${p.Current_Fasting_Sugar} mg/dL. `;
        if (p.Treatment_Adherence === "High") {
            aiNote += `Excellent treatment adherence. Baseline sugar dropped from ${p.Baseline_Fasting_Sugar} mg/dL. AI forecasts insulin levels stabilization under active dosage.`;
        } else {
            aiNote += `Poor glycaemic control. High baseline sugar persist. Sugar fluctuation flagged. Recommend immediate insulin therapy titration and meal plan audits.`;
        }
    } else if (p.Primary_Disease === "Cardiovascular") {
        aiNote = `Cardiovascular anomalies recorded. Active blood pressure at ${p.Current_Systolic_BP}/${p.Current_Diastolic_BP} mmHg. `;
        if (p.Current_Systolic_BP >= 140 || p.Current_Diastolic_BP >= 90) {
            aiNote += `Stage 2 Hypertension critical warning. Cardiac strain risks are elevated. Recommend ACE-inhibitors and daily tele-monitoring.`;
        } else {
            aiNote += `Blood pressure controlled under therapeutic plans. Cardio-score shows 12% improvement. Maintain existing treatment parameters.`;
        }
    } else if (p.Primary_Disease === "Respiratory") {
        aiNote = `Chronic respiratory logs verified. Current health score at ${p.AI_Health_Score}. High compliance on bronchodilator schedules. Avoid allergen triggers.`;
    } else {
        aiNote = `General metrics baseline normal. Health rating of ${p.AI_Health_Score} indicates low systemic diagnostic warnings. Follow routine preventative care schedules.`;
    }
    document.getElementById("modal-ai-note").textContent = aiNote;
    
    // Show Modal
    const modal = document.getElementById("patient-detail-modal");
    modal.classList.add("active");
};

// Modal Close logic
document.getElementById("close-modal-btn").addEventListener("click", () => {
    document.getElementById("patient-detail-modal").classList.remove("active");
});
document.getElementById("patient-detail-modal").addEventListener("click", (e) => {
    if (e.target.id === "patient-detail-modal") {
        document.getElementById("patient-detail-modal").classList.remove("active");
    }
});

// --- VIEW 3: BMI INTERACTIVE CALCULATOR ---
function initBmiCalculator() {
    const hSlider = document.getElementById("bmi-height-slider");
    const wSlider = document.getElementById("bmi-weight-slider");
    const valHeight = document.getElementById("val-height");
    const valWeight = document.getElementById("val-weight");
    const bmiDisplay = document.getElementById("bmi-value-display");
    const categoryDisplay = document.getElementById("bmi-category-display");
    const barIndicator = document.getElementById("bmi-bar-indicator");
    
    const updateCalculator = () => {
        const h = parseFloat(hSlider.value);
        const w = parseFloat(wSlider.value);
        
        valHeight.textContent = `${h} cm`;
        valWeight.textContent = `${w} kg`;
        
        const bmi = w / ((h / 100) ** 2);
        bmiDisplay.textContent = bmi.toFixed(1);
        
        // Categorize & Colors
        categoryDisplay.className = "bmi-category-text badge";
        let fillPct = 0;
        
        if (bmi < 18.5) {
            categoryDisplay.textContent = "Underweight";
            categoryDisplay.classList.add("badge-purple");
            fillPct = 15;
            bmiDisplay.style.color = "var(--purple-accent)";
            bmiDisplay.style.textShadow = "0 0 15px rgba(127, 0, 255, 0.3)";
        } else if (bmi < 25) {
            categoryDisplay.textContent = "Normal Weight";
            categoryDisplay.classList.add("badge-green");
            fillPct = 40;
            bmiDisplay.style.color = "var(--green-success)";
            bmiDisplay.style.textShadow = "0 0 15px rgba(0, 245, 160, 0.3)";
        } else if (bmi < 30) {
            categoryDisplay.textContent = "Overweight";
            categoryDisplay.classList.add("badge-orange");
            fillPct = 70;
            bmiDisplay.style.color = "var(--orange-warning)";
            bmiDisplay.style.textShadow = "0 0 15px rgba(255, 159, 67, 0.3)";
        } else {
            categoryDisplay.textContent = "Obese";
            categoryDisplay.classList.add("badge-pink");
            fillPct = 95;
            bmiDisplay.style.color = "var(--pink-accent)";
            bmiDisplay.style.textShadow = "0 0 15px rgba(255, 42, 95, 0.3)";
        }
        
        barIndicator.style.width = `${fillPct}%`;
    };
    
    hSlider.addEventListener("input", updateCalculator);
    wSlider.addEventListener("input", updateCalculator);
    updateCalculator();
}

// --- VIEW 4: TREATMENT COMPARISON (BEFORE/AFTER) ---
function updateComparisonMetrics() {
    const treatable = filteredPatients.filter(p => p.Primary_Disease !== "None");
    
    const wBeforeEl = document.getElementById("comp-w-before");
    const wAfterEl = document.getElementById("comp-w-after");
    const bpBeforeEl = document.getElementById("comp-bp-before");
    const bpAfterEl = document.getElementById("comp-bp-after");
    const sBeforeEl = document.getElementById("comp-s-before");
    const sAfterEl = document.getElementById("comp-s-after");
    
    if (treatable.length === 0) {
        wBeforeEl.textContent = "0.0";
        wAfterEl.textContent = "0.0";
        bpBeforeEl.textContent = "0.0";
        bpAfterEl.textContent = "0.0";
        sBeforeEl.textContent = "0.0";
        sAfterEl.textContent = "0.0";
        return;
    }
    
    // Calculations
    const sumWBefore = treatable.reduce((sum, p) => sum + p.Baseline_Weight_kg, 0);
    const sumWAfter = treatable.reduce((sum, p) => sum + p.Current_Weight_kg, 0);
    const sumBPBefore = treatable.reduce((sum, p) => sum + p.Baseline_Systolic_BP, 0);
    const sumBPAfter = treatable.reduce((sum, p) => sum + p.Current_Systolic_BP, 0);
    const sumSugarBefore = treatable.reduce((sum, p) => sum + p.Baseline_Fasting_Sugar, 0);
    const sumSugarAfter = treatable.reduce((sum, p) => sum + p.Current_Fasting_Sugar, 0);
    
    wBeforeEl.textContent = (sumWBefore / treatable.length).toFixed(1);
    wAfterEl.textContent = (sumWAfter / treatable.length).toFixed(1);
    
    bpBeforeEl.textContent = (sumBPBefore / treatable.length).toFixed(1);
    bpAfterEl.textContent = (sumBPAfter / treatable.length).toFixed(1);
    
    sBeforeEl.textContent = (sumSugarBefore / treatable.length).toFixed(1);
    sAfterEl.textContent = (sumSugarAfter / treatable.length).toFixed(1);
    
    // Draw before/after charts if active
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

    // Averages
    const avgWBefore = treatable.reduce((sum, p) => sum + p.Baseline_Weight_kg, 0) / treatable.length;
    const avgWAfter = treatable.reduce((sum, p) => sum + p.Current_Weight_kg, 0) / treatable.length;
    const avgBPBefore = treatable.reduce((sum, p) => sum + p.Baseline_Systolic_BP, 0) / treatable.length;
    const avgBPAfter = treatable.reduce((sum, p) => sum + p.Current_Systolic_BP, 0) / treatable.length;
    const avgSBefore = treatable.reduce((sum, p) => sum + p.Baseline_Fasting_Sugar, 0) / treatable.length;
    const avgSAfter = treatable.reduce((sum, p) => sum + p.Current_Fasting_Sugar, 0) / treatable.length;

    charts.beforeAfterComp = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: ['Weight (kg)', 'Systolic BP (mmHg)', 'Sugar (mg/dL)'],
            datasets: [
                {
                    label: 'Baseline (Before Treatment)',
                    data: [avgWBefore.toFixed(1), avgBPBefore.toFixed(1), avgSBefore.toFixed(1)],
                    backgroundColor: 'rgba(140, 155, 180, 0.4)',
                    borderColor: 'rgba(140, 155, 180, 0.8)',
                    borderWidth: 1
                },
                {
                    label: 'Current (After Treatment)',
                    data: [avgWAfter.toFixed(1), avgBPAfter.toFixed(1), avgSAfter.toFixed(1)],
                    backgroundColor: 'rgba(0, 242, 254, 0.7)',
                    borderColor: '#00f2fe',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#f5f6fa' } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#8c9bb4' } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#8c9bb4' } }
            }
        }
    });

    // Adherence counts
    let high = 0, med = 0, low = 0;
    treatable.forEach(p => {
        if (p.Treatment_Adherence === "High") high++;
        else if (p.Treatment_Adherence === "Medium") med++;
        else if (p.Treatment_Adherence === "Low") low++;
    });

    charts.adherence = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                data: [high, med, low],
                backgroundColor: ['#00f5a0', '#ff9f43', '#ff2a5f'],
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#f5f6fa', font: { size: 10 } }
                }
            }
        }
    });
}

// --- VIEW 5: AI INSIGHTS TERMINAL ---
function generateAIInsights() {
    const textEl = document.getElementById("ai-insights-text");
    if (!textEl) return;
    
    // Only animate typing when the AI tab is open
    const activeSection = document.querySelector(".section-active");
    const isAiTabOpen = activeSection && activeSection.id === "ai-insights-view";

    const total = filteredPatients.length;
    if (total === 0) {
        textEl.textContent = "AI engine requires data points to analyze. Adjust filters to search for clinical groups.";
        return;
    }

    // Cohort data math for dynamic writing
    const cardioCount = filteredPatients.filter(p => p.Primary_Disease === "Cardiovascular").length;
    const cardioPct = ((cardioCount / total) * 100).toFixed(0);
    const diabCount = filteredPatients.filter(p => p.Primary_Disease === "Diabetes").length;
    const diabPct = ((diabCount / total) * 100).toFixed(0);
    
    const stage2BpCount = filteredPatients.filter(p => p.Current_Systolic_BP >= 140 || p.Current_Diastolic_BP >= 90).length;
    const stage2BpPct = ((stage2BpCount / total) * 100).toFixed(0);
    
    const obeseCount = filteredPatients.filter(p => {
        const bmi = p.Current_Weight_kg / ((p.Height_cm / 100) ** 2);
        return bmi >= 30;
    }).length;
    const obesePct = ((obeseCount / total) * 100).toFixed(0);

    const highAdherers = filteredPatients.filter(p => p.Treatment_Adherence === "High");
    let bpDropText = "";
    if (highAdherers.length > 0) {
        const beforeBp = highAdherers.reduce((sum, p) => sum + p.Baseline_Systolic_BP, 0) / highAdherers.length;
        const afterBp = highAdherers.reduce((sum, p) => sum + p.Current_Systolic_BP, 0) / highAdherers.length;
        const pctDrop = (((beforeBp - afterBp) / beforeBp) * 100).toFixed(1);
        bpDropText = `Notably, high treatment adherence led to an average ${pctDrop}% reduction in systolic blood pressure among chronic hypertensive patients.`;
    }

    const reportHTML = `
        <div style="font-family: monospace; color: var(--green-success); margin-bottom: 10px;">&gt;&gt; LOG: ANALYZING ${total} PATIENT TELEMETRY records...</div>
        <div>Based on the currently filtered patient cohort, our neural diagnostics engine has generated the following clinical insights:</div>
        <div class="ai-bullets">
            <div class="ai-bullet">
                <span class="ai-bullet-dot"></span>
                <span><strong>Epidemiology:</strong> Cardiovascular disease is prevalent in ${cardioPct}% of the cohort, while diabetic symptoms represent ${diabPct}%.</span>
            </div>
            <div class="ai-bullet">
                <span class="ai-bullet-dot" style="background: var(--pink-accent); box-shadow: 0 0 5px var(--pink-accent);"></span>
                <span><strong>Hypertensive Stress Warning:</strong> Approximately ${stage2BpPct}% of the analyzed population meets AHA criteria for Stage 2 Hypertension (BP &ge; 140/90 mmHg). We recommend immediate pharmaceutical adjustment and daily tele-monitoring.</span>
            </div>
            <div class="ai-bullet">
                <span class="ai-bullet-dot" style="background: var(--orange-warning); box-shadow: 0 0 5px var(--orange-warning);"></span>
                <span><strong>Metabolic Risk Matrix:</strong> Obese BMI ranges (&ge; 30) affect ${obesePct}% of this group. Obesity remains the primary clinical catalyst driving blood sugar resistance and elevated baseline systolic values.</span>
            </div>
            <div class="ai-bullet">
                <span class="ai-bullet-dot"></span>
                <span><strong>Treatment Adherence Efficacy:</strong> ${bpDropText} This confirms the clinical efficacy of current therapy adherence protocols.</span>
            </div>
        </div>
    `;

    if (isAiTabOpen) {
        // Typing/rendering effect
        textEl.innerHTML = "<span>Analyzing clinical profiles...</span>";
        setTimeout(() => {
            textEl.innerHTML = reportHTML;
        }, 600);
    } else {
        textEl.innerHTML = reportHTML;
    }
}

// --- VIEW 6: POWER BI INTEGRATION SERVICE ---
function initPowerBiEmbed() {
    const container = document.getElementById("powerbi-container");
    const loadBtn = document.getElementById("load-powerbi-btn");
    if (!loadBtn || !container) return;

    loadBtn.addEventListener("click", () => {
        // Replace simulated splash screen with a beautiful interactive Power BI mock container
        container.innerHTML = `
            <div style="padding: 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.2);">
                <div style="display:flex; align-items:center; gap: 8px;">
                    <div style="width: 12px; height: 12px; background: #f2c811; border-radius: 2px;"></div>
                    <span style="font-size:0.75rem; font-family: var(--font-heading); font-weight:600;">Power BI Cloud Embed Frame</span>
                </div>
                <span style="font-size:0.65rem; color: var(--green-success);">&bull; Live SSL Encrypted Stream</span>
            </div>
            <!-- Standard Power BI Embedded iframe loading a beautiful sample healthcare layout -->
            <iframe class="powerbi-iframe-mock" src="https://app.powerbi.com/view?r=eyJrIjoiOGZiNWNhOWQtMTlhMi00ZWM3LTg0NjQtZjdiNDQ3NTRkYWRiIiwidCI6IjQ5OWE4MTRlLTI3MjgtNDQ4Ni05NTZhLTgyOWI2OGYwNDNlNSIsImMiOjEwfQ%3D%3D" allowFullScreen="true"></iframe>
        `;
    });
}

// --- REPORT DOWNLOAD ENGINE ---
function initDownloadBtn() {
    const downloadBtn = document.getElementById("download-report-btn");
    if (!downloadBtn) return;
    
    downloadBtn.addEventListener("click", () => {
        // Create context action menu overlay
        const existingMenu = document.getElementById("export-context-menu");
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = document.createElement("div");
        menu.id = "export-context-menu";
        menu.style.position = "absolute";
        menu.style.top = `${downloadBtn.offsetTop + downloadBtn.offsetHeight + 5}px`;
        menu.style.right = `${window.innerWidth - (downloadBtn.offsetLeft + downloadBtn.offsetWidth)}px`;
        menu.style.background = "var(--bg-sidebar)";
        menu.style.border = "1px solid var(--cyan-primary)";
        menu.style.borderRadius = "12px";
        menu.style.boxShadow = "0 8px 30px rgba(0, 242, 254, 0.25)";
        menu.style.zIndex = "1000";
        menu.style.display = "flex";
        menu.style.flexDirection = "column";
        menu.style.padding = "8px 0";
        menu.style.width = "200px";
        menu.style.backdropFilter = "blur(12px)";

        const items = [
            { text: "Download CSV Report", action: downloadCSV },
            { text: "Download Excel Report (Pandas)", action: downloadExcel },
            { text: "Print / Save PDF Dashboard", action: printPDF }
        ];

        items.forEach(item => {
            const btn = document.createElement("button");
            btn.textContent = item.text;
            btn.style.background = "none";
            btn.style.border = "none";
            btn.style.color = "var(--text-primary)";
            btn.style.padding = "10px 16px";
            btn.style.textAlign = "left";
            btn.style.cursor = "pointer";
            btn.style.fontFamily = "var(--font-body)";
            btn.style.fontSize = "0.8rem";
            btn.style.transition = "var(--transition-smooth)";

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

        // Click outside closes menu
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
    if (isBackendConnected) {
        // Hit real Pandas backend export endpoint
        const disease = document.getElementById("disease-filter").value;
        const gender = document.getElementById("gender-filter").value;
        const ageGroup = document.getElementById("age-filter").value;
        const query = document.getElementById("patient-search").value;
        
        window.open(`${BACKEND_URL}/api/export?type=csv&search=${query}&disease=${disease}&gender=${gender}&age_group=${ageGroup}`);
    } else {
        // Local CSV generation using JavaScript
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // CSV Headers
        const headers = Object.keys(filteredPatients[0]).join(",");
        csvContent += headers + "\r\n";
        
        // CSV Rows
        filteredPatients.forEach(p => {
            const row = Object.values(p).map(val => {
                // Wrap strings with commas in quotes
                if (typeof val === 'string' && val.includes(',')) {
                    return `"${val}"`;
                }
                return val;
            }).join(",");
            csvContent += row + "\r\n";
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "patient_health_report_local.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function downloadExcel() {
    if (isBackendConnected) {
        // Hit real Pandas backend export endpoint for Excel sheet structure
        const disease = document.getElementById("disease-filter").value;
        const gender = document.getElementById("gender-filter").value;
        const ageGroup = document.getElementById("age-filter").value;
        const query = document.getElementById("patient-search").value;
        
        window.open(`${BACKEND_URL}/api/export?type=xlsx&search=${query}&disease=${disease}&gender=${gender}&age_group=${ageGroup}`);
    } else {
        alert("Pandas Excel exporter runs on the Python Backend. Please boot the Flask backend API ('python app.py') to trigger server-side Pandas Excel reports.");
    }
}

function printPDF() {
    // Hide open menus or modals before printing
    const modal = document.getElementById("patient-detail-modal");
    if (modal) modal.classList.remove("active");
    
    // Trigger standard browser window print, styled via media query print rule in style.css
    window.print();
}
