// --- Football API Configuration ---
// Optional: Paste your free API key from football-data.org here to connect real live data!
const FOOTBALL_API_KEY = "f3ac9be80bc548bea51a8dbed20df3de"; 

// --- Automated Daily Matches Database Generator (Fallback / Offline Mode) ---
// Generates realistic matches dynamically for any selected date
const teamPool = [
    { league: "Premier League", home: "Manchester City", away: "Arsenal", pred: "Over 2.5 Goals", odds: "1.75" },
    { league: "Premier League", home: "Chelsea", away: "Liverpool", pred: "BTTS (Yes)", odds: "1.65" },
    { league: "Premier League", home: "Tottenham", away: "Man United", pred: "Home Win (1)", odds: "2.10" },
    { league: "La Liga", home: "Real Madrid", away: "Barcelona", pred: "Over 2.5 Goals", odds: "1.85" },
    { league: "La Liga", home: "Atletico Madrid", away: "Sevilla", pred: "Under 2.5 Goals", odds: "1.80" },
    { league: "Champions League", home: "Bayern Munich", away: "PSG", pred: "BTTS (Yes)", odds: "1.55" },
    { league: "Champions League", home: "Inter Milan", away: "Juventus", pred: "Draw (X)", odds: "3.20" }
];

function generateDailyData(dateStr) {
    const todayStr = new Date().toISOString().split("T")[0];
    const targetDate = new Date(dateStr);
    const todayDate = new Date(todayStr);

    return teamPool.map((item, index) => {
        let status = "Pending";
        if (targetDate < todayDate) {
            status = index % 2 === 0 ? "Won" : "Loss";
        }

        // Generate deterministic times based on match index
        const hours = 14 + (index * 2) % 8;
        const timeStr = `${hours}:00`;

        return {
            league: item.league,
            time: timeStr,
            match: `${item.home} vs ${item.away}`,
            prediction: item.pred,
            odds: item.odds,
            result: status,
            home: item.home,
            away: item.away
        };
    });
}

// Global Match State
let currentMatchList = [];
let selectedDate = new Date().toISOString().split("T")[0];
let currentFilter = "all";
let sortDirection = false;

// --- DOM Elements ---
const tableBody = document.getElementById("tableBody");
const searchInput = document.getElementById("searchInput");
const leagueFilters = document.getElementById("leagueFilters");
const mobileToggle = document.getElementById("mobileToggle");
const navMenu = document.getElementById("navMenu");

// Date Elements
const yesterdayBtn = document.getElementById("yesterdayBtn");
const todayBtn = document.getElementById("todayBtn");
const tomorrowBtn = document.getElementById("tomorrowBtn");
const datePicker = document.getElementById("datePicker");
const currentDateLabel = document.getElementById("currentDateLabel");

// Modal Elements
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");
const closeLogin = document.getElementById("closeLogin");
const closeRegister = document.getElementById("closeRegister");
const switchToRegister = document.getElementById("switchToRegister");
const switchToLogin = document.getElementById("switchToLogin");

// --- Fetch & Update Fixtures ---
async function fetchMatchesForDate(dateStr) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading predictions for ${dateStr}...</td></tr>`;

    if (FOOTBALL_API_KEY) {
        try {
            const response = await fetch(`https://api.football-data.org/v4/matches?dateFrom=${dateStr}&dateTo=${dateStr}`, {
                headers: { 'X-Auth-Token': FOOTBALL_API_KEY }
            });
            const data = await response.json();
            
            if (data.matches && data.matches.length > 0) {
                currentMatchList = data.matches.map(m => ({
                    league: m.competition.name,
                    time: new Date(m.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    match: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
                    prediction: "Over 1.5 Goals",
                    odds: "1.70",
                    result: m.status === "FINISHED" ? (m.score.fullTime.home > 0 ? "Won" : "Loss") : "Pending",
                    home: m.homeTeam.name,
                    away: m.awayTeam.name
                }));
            } else {
                currentMatchList = generateDailyData(dateStr);
            }
        } catch (err) {
            console.warn("API Unavailable, switching to local dynamic feed.");
            currentMatchList = generateDailyData(dateStr);
        }
    } else {
        // Automatically compute fallback fixtures for selected date
        currentMatchList = generateDailyData(dateStr);
    }

    updateHeroCard(currentMatchList[0]);
    filterAndRender();
}

// Update Top Hero Card with the first match of the selected day
function updateHeroCard(match) {
    if (!match) return;
    document.getElementById("featuredHome").innerText = match.home;
    document.getElementById("featuredAway").innerText = match.away;
    document.getElementById("featuredTip").innerText = match.prediction;
    document.getElementById("featuredOdds").innerText = match.odds;
}

// --- Render Table ---
function renderTable(data) {
    tableBody.innerHTML = "";
    
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No matches scheduled or found for this date.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const row = document.createElement("tr");
        let statusClass = "status-pending";
        if (item.result.toLowerCase() === "won") statusClass = "status-win";
        if (item.result.toLowerCase() === "loss") statusClass = "status-loss";

        row.innerHTML = `
            <td><strong>${item.league}</strong></td>
            <td><i class="fa-regular fa-clock"></i> ${item.time}</td>
            <td>${item.match}</td>
            <td><span class="badge">${item.prediction}</span></td>
            <td><strong>${item.odds}</strong></td>
            <td><span class="status-badge ${statusClass}">${item.result}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

// --- Filtering & Sorting ---
function filterAndRender() {
    const searchTerm = searchInput.value.toLowerCase();

    const filtered = currentMatchList.filter(item => {
        const matchesSearch = item.match.toLowerCase().includes(searchTerm) || 
                              item.league.toLowerCase().includes(searchTerm);
        const matchesLeague = currentFilter === "all" || item.league.toLowerCase().includes(currentFilter.toLowerCase());

        return matchesSearch && matchesLeague;
    });

    renderTable(filtered);
}

leagueFilters.addEventListener("click", (e) => {
    if (e.target.classList.contains("filter-btn")) {
        document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
        e.target.classList.add("active");
        currentFilter = e.target.getAttribute("data-filter");
        filterAndRender();
    }
});

searchInput.addEventListener("keyup", filterAndRender);

// Table Sorting
document.querySelectorAll("#predictionsTable th[data-sort]").forEach(header => {
    header.addEventListener("click", () => {
        const sortKey = header.getAttribute("data-sort");
        sortDirection = !sortDirection;

        currentMatchList.sort((a, b) => {
            if (a[sortKey] < b[sortKey]) return sortDirection ? -1 : 1;
            if (a[sortKey] > b[sortKey]) return sortDirection ? 1 : -1;
            return 0;
        });

        filterAndRender();
    });
});

// --- Date Controls ---
function setDate(dateObj) {
    selectedDate = dateObj.toISOString().split("T")[0];
    datePicker.value = selectedDate;
    currentDateLabel.innerText = selectedDate;

    // Reset active button state
    document.querySelectorAll(".date-btn").forEach(btn => btn.classList.remove("active"));

    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate === todayStr) todayBtn.classList.add("active");

    fetchMatchesForDate(selectedDate);
}

todayBtn.addEventListener("click", () => setDate(new Date()));

yesterdayBtn.addEventListener("click", () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setDate(d);
});

tomorrowBtn.addEventListener("click", () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setDate(d);
});

datePicker.addEventListener("change", (e) => {
    if (e.target.value) {
        setDate(new Date(e.target.value));
    }
});

// --- Modal Handling ---
function openModal(modal) { modal.classList.add("active"); }
function closeModal(modal) { modal.classList.remove("active"); }

loginBtn.addEventListener("click", () => openModal(loginModal));
registerBtn.addEventListener("click", () => openModal(registerModal));
closeLogin.addEventListener("click", () => closeModal(loginModal));
closeRegister.addEventListener("click", () => closeModal(registerModal));

switchToRegister.addEventListener("click", (e) => { e.preventDefault(); closeModal(loginModal); openModal(registerModal); });
switchToLogin.addEventListener("click", (e) => { e.preventDefault(); closeModal(registerModal); openModal(loginModal); });

// --- Navigation Toggle ---
mobileToggle.addEventListener("click", () => navMenu.classList.toggle("active"));

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    const today = new Date();
    currentDateLabel.innerText = today.toISOString().split("T")[0];
    datePicker.value = today.toISOString().split("T")[0];
    fetchMatchesForDate(selectedDate);
});