// ===================
// Firebase Config (Must be consistent across all JS files)
// ===================
const firebaseConfig = {
    apiKey: "AIzaSyDDuqLprmwkAXPHxyft31Nf_XnM3JaFgnI",
    authDomain: "ffmax-1a509.firebaseapp.com",
    databaseURL: "https://ffmax-1a509-default-rtdb.firebaseio.com",
    projectId: "ffmax-1a509",
    storageBucket: "ffmax-1a509.appspot.com",
    messagingSenderId: "216916500863",
    appId: "1:216916500863:web:9f7006952cf6a6e75dba4b",
    measurementId: "G-61W6JSW0XB"
};

// Initialize Firebase only if it hasn't been initialized already
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// ===================
// DOM Elements
// ===================
const modeFilter = document.getElementById("modeFilter");
const sortOrder = document.getElementById("sortOrder");
const nameSearch = document.getElementById("nameSearch");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const playersTableBody = document.querySelector("#playersTable tbody");
const loadingMessage = document.getElementById("loadingMessage");
const noRecordsMessage = document.getElementById("noRecordsMessage");

let allRegistrations = []; // To store all fetched data from Firebase
let filteredRegistrations = []; // To store data after applying filters

// ===================
// Fetch Registrations from Firebase
// ===================
async function fetchRegistrations() {
    loadingMessage.style.display = "block";
    playersTableBody.innerHTML = ""; // Clear existing table data
    noRecordsMessage.style.display = "none";

    allRegistrations = []; // Reset global data

    try {
        const snapshot = await database.ref('registrations').once('value');
        if (snapshot.exists()) {
            snapshot.forEach(modeSnapshot => {
                const mode = modeSnapshot.key; // e.g., "solo", "squad"
                modeSnapshot.forEach(registrationSnapshot => {
                    const registrationId = registrationSnapshot.key;
                    const data = registrationSnapshot.val();
                    allRegistrations.push({ ...data, mode: mode, id: registrationId });
                });
            });
            console.log("All registrations fetched:", allRegistrations);
        } else {
            console.log("No registrations found in Firebase.");
        }
    } catch (error) {
        console.error("Error fetching registrations:", error);
        alert("Failed to load registrations. Please try again later.");
    } finally {
        loadingMessage.style.display = "none";
        applyFilters(); // Apply initial filters (or just display all if no filters set)
    }
}

// ===================
// Display Registrations in Table
// ===================
function displayRegistrations(registrationsToDisplay) {
    playersTableBody.innerHTML = ""; // Clear current table body

    if (registrationsToDisplay.length === 0) {
        noRecordsMessage.style.display = "block";
        return;
    } else {
        noRecordsMessage.style.display = "none";
    }

    registrationsToDisplay.forEach(reg => {
        const row = playersTableBody.insertRow();

        // Mode Column
        row.insertCell().textContent = reg.mode.toUpperCase();

        // Name / Team Name Column
        let nameOrTeamName = "";
        if (reg.mode === 'solo' && reg.players && reg.players[0]) {
            nameOrTeamName = reg.players[0].name;
        } else if (reg.teamName) {
            nameOrTeamName = reg.teamName;
        } else if (reg.players && reg.players[0]) { // Fallback for squad if teamName is missing
             nameOrTeamName = reg.players[0].name + " (Leader)";
        }
        row.insertCell().textContent = nameOrTeamName;

        // Mobile Column
        let mobile = "";
        if (reg.mode === 'solo' && reg.players && reg.players[0] && reg.players[0].mobile) {
            mobile = reg.players[0].mobile;
        } else if (reg.players && reg.players[0] && reg.players[0].mobile) { // For squad leader
            mobile = reg.players[0].mobile;
        }
        row.insertCell().textContent = mobile;

        // Other Players Column (only for squad/cs)
        let otherPlayers = "-";
        if (reg.mode !== 'solo' && reg.players && reg.players.length > 1) {
            // Skip leader (index 0), join names of other players
            otherPlayers = reg.players.slice(1).map(p => p.name).join(', ');
        }
        row.insertCell().textContent = otherPlayers;

        // Amount Column
        row.insertCell().textContent = `₹${reg.amount}`;

        // Status Column
        row.insertCell().textContent = reg.paymentStatus || "Unknown"; // Display payment status

        // Registered On Column
        const date = new Date(reg.timestamp);
        row.insertCell().textContent = date.toLocaleDateString() + " " + date.toLocaleTimeString();
    });
}

// ===================
// Apply Filters and Sort
// ===================
function applyFilters() {
    let currentFiltered = [...allRegistrations]; // Start with all data

    // 1. Mode Filter
    const selectedMode = modeFilter.value;
    if (selectedMode !== "all") {
        currentFiltered = currentFiltered.filter(reg => reg.mode === selectedMode);
    }

    // 2. Name/Mobile Search
    const searchTerm = nameSearch.value.toLowerCase().trim();
    if (searchTerm) {
        currentFiltered = currentFiltered.filter(reg => {
            // Check player names (solo or leader)
            if (reg.players && reg.players[0] && reg.players[0].name.toLowerCase().includes(searchTerm)) {
                return true;
            }
            // Check team name
            if (reg.teamName && reg.teamName.toLowerCase().includes(searchTerm)) {
                return true;
            }
            // Check mobile numbers
            if (reg.players && reg.players[0] && reg.players[0].mobile && reg.players[0].mobile.includes(searchTerm)) {
                return true;
            }
            // Check other squad player names
            if (reg.mode !== 'solo' && reg.players && reg.players.length > 1) {
                for (let i = 1; i < reg.players.length; i++) {
                    if (reg.players[i].name && reg.players[i].name.toLowerCase().includes(searchTerm)) {
                        return true;
                    }
                }
            }
            return false;
        });
    }

    // 3. Sort Order
    const currentSortOrder = sortOrder.value;
    if (currentSortOrder !== "default") {
        currentFiltered.sort((a, b) => {
            let nameA, nameB;

            // Determine the primary name for sorting (leader name or team name)
            if (a.mode === 'solo' && a.players && a.players[0]) {
                nameA = a.players[0].name;
            } else if (a.teamName) {
                nameA = a.teamName;
            } else if (a.players && a.players[0]) {
                nameA = a.players[0].name; // Fallback to leader name for squad without teamName
            } else {
                nameA = "";
            }

            if (b.mode === 'solo' && b.players && b.players[0]) {
                nameB = b.players[0].name;
            } else if (b.teamName) {
                nameB = b.teamName;
            } else if (b.players && b.players[0]) {
                nameB = b.players[0].name;
            } else {
                nameB = "";
            }
            
            // Perform actual comparison
            if (currentSortOrder === "asc") {
                return nameA.localeCompare(nameB);
            } else { // desc
                return nameB.localeCompare(nameA);
            }
        });
    }

    filteredRegistrations = currentFiltered; // Update global filtered data
    displayRegistrations(filteredRegistrations);
}

// ===================
// Event Listeners
// ===================
applyFiltersBtn.addEventListener("click", applyFilters);
// Optionally, apply filters live as user types/changes selections
modeFilter.addEventListener("change", applyFilters);
sortOrder.addEventListener("change", applyFilters);
nameSearch.addEventListener("input", applyFilters); // Use 'input' for live search

// ===================
// Initial Load
// ===================
document.addEventListener("DOMContentLoaded", fetchRegistrations);