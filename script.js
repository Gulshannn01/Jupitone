document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const loginView = document.getElementById('login-view');
    const professorView = document.getElementById('professor-view');
    const studentView = document.getElementById('student-view');
    const loadingOverlay = document.getElementById('loading-overlay');

    const loginProfessorBtn = document.getElementById('login-professor');
    const loginStudentBtn = document.getElementById('login-student');
    const backToLoginBtns = document.querySelectorAll('.back-to-login');

    // Professor View
    const startSessionBtn = document.getElementById('start-session-btn');
    const professorStatusDiv = document.getElementById('professor-status');
    const attendedStudentsList = document.getElementById('attended-students-list');

    // Student View
    const studentIdDisplay = document.getElementById('student-id-display');
    const markAttendanceBtn = document.getElementById('mark-attendance-btn');
    const studentStatusDiv = document.getElementById('student-status');
    const sessionStatusDiv = document.getElementById('session-status');

    const logOutput = document.getElementById('log-output');

    // --- Configuration ---
    const MAX_DISTANCE_METERS = 50;
    const PROFESSOR_LOCATION_KEY = 'professor_gps_location';
    const ATTENDANCE_SESSION_KEY = 'attendance_session_active';
    const ATTENDED_STUDENTS_KEY = 'attended_students_data';

    let currentStudentId = null; // Will be set for student role

    // --- Utility Functions ---
    function log(message) {
        console.log(message);
        const time = new Date().toLocaleTimeString();
        logOutput.textContent = `[${time}] ${message}\n` + logOutput.textContent;
    }

    function showLoading(show = true) {
        loadingOverlay.classList.toggle('hidden', !show);
    }

    function switchView(viewToShow) {
        loginView.classList.add('hidden');
        professorView.classList.add('hidden');
        studentView.classList.add('hidden');
        viewToShow.classList.remove('hidden');
    }

    function resetToLoginView() {
        switchView(loginView);
        // Clear session data on logout for this PoC
        localStorage.removeItem(PROFESSOR_LOCATION_KEY);
        localStorage.removeItem(ATTENDANCE_SESSION_KEY);
        localStorage.removeItem(ATTENDED_STUDENTS_KEY);
        professorStatusDiv.textContent = '';
        studentStatusDiv.textContent = '';
        sessionStatusDiv.textContent = 'No active session.';
        markAttendanceBtn.disabled = true;
        attendedStudentsList.innerHTML = '';
        currentStudentId = null;
        log('Logged out, session data cleared.');
    }

    // --- Geolocation Functions ---
    function getGPSCoordinates() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported by your browser."));
                return;
            }
            log("Requesting GPS coordinates...");
            showLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    showLoading(false);
                    const coords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    log(`GPS Acquired: Lat: ${coords.latitude.toFixed(5)}, Lon: ${coords.longitude.toFixed(5)}, Accuracy: ${coords.accuracy.toFixed(1)}m`);
                    resolve(coords);
                },
                (error) => {
                    showLoading(false);
                    let errorMsg = "Error getting location: ";
                    switch (error.code) {
                        case error.PERMISSION_DENIED: errorMsg += "User denied the request for Geolocation."; break;
                        case error.POSITION_UNAVAILABLE: errorMsg += "Location information is unavailable."; break;
                        case error.TIMEOUT: errorMsg += "The request to get user location timed out."; break;
                        default: errorMsg += "An unknown error occurred."; break;
                    }
                    log(errorMsg);
                    reject(new Error(errorMsg));
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } // Options
            );
        });
    }

    // Haversine formula to calculate distance between two lat/lon points
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in meters
    }

    // --- Simulated Bluetooth Check ---
    function simulateBluetoothCheck() {
        return new Promise((resolve) => {
            log("Simulating Bluetooth proximity check...");
            showLoading(true);
            // In a real app, this would involve Web Bluetooth API calls
            // For PoC, we'll just use a timeout and random success/failure
            setTimeout(() => {
                showLoading(false);
                const isNearby = Math.random() > 0.2; // 80% chance of "success"
                if (isNearby) {
                    log("Bluetooth Check: Professor's device conceptually detected.");
                    resolve(true);
                } else {
                    log("Bluetooth Check: Professor's device NOT conceptually detected.");
                    resolve(false);
                }
            }, 1500);
        });
    }

    // --- Professor Logic ---
    async function startAttendanceSession() {
        log("Professor: Starting attendance session...");
        try {
            const profCoords = await getGPSCoordinates();
            professorStatusDiv.innerHTML = `Your Location: Lat: ${profCoords.latitude.toFixed(5)}, Lon: ${profCoords.longitude.toFixed(5)} (Accuracy: ${profCoords.accuracy.toFixed(1)}m).<br>Session Active. Waiting for students.`;
            
            // Store professor's location and session status for students to access
            localStorage.setItem(PROFESSOR_LOCATION_KEY, JSON.stringify(profCoords));
            localStorage.setItem(ATTENDANCE_SESSION_KEY, 'true');
            localStorage.setItem(ATTENDED_STUDENTS_KEY, JSON.stringify([])); // Initialize empty list

            log("Professor: Session started. Location stored.");
            updateAttendedStudentsDisplay(); // Clear any previous list
            // Periodically check for updates to attended students (if using localStorage)
            // This simulates real-time updates for the PoC
            setInterval(updateAttendedStudentsDisplay, 3000); 

        } catch (error) {
            professorStatusDiv.textContent = `Error: ${error.message}`;
            log(`Professor: Error starting session - ${error.message}`);
        }
    }

    function updateAttendedStudentsDisplay() {
        const attended = JSON.parse(localStorage.getItem(ATTENDED_STUDENTS_KEY) || '[]');
        attendedStudentsList.innerHTML = ''; // Clear current list
        if (attended.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No students have checked in yet.';
            attendedStudentsList.appendChild(li);
        } else {
            attended.forEach(student => {
                const li = document.createElement('li');
                li.textContent = `Student ID: ${student.id} (at ${new Date(student.timestamp).toLocaleTimeString()})`;
                attendedStudentsList.appendChild(li);
            });
        }
    }


    // --- Student Logic ---
    function checkActiveSession() {
        if (localStorage.getItem(ATTENDANCE_SESSION_KEY) === 'true') {
            sessionStatusDiv.textContent = 'Attendance session is ACTIVE. You can mark your attendance.';
            markAttendanceBtn.disabled = false;
            log("Student: Active session detected.");
        } else {
            sessionStatusDiv.textContent = 'No active attendance session found.';
            markAttendanceBtn.disabled = true;
            log("Student: No active session.");
        }
    }

    async function markStudentAttendance() {
        log(`Student ${currentStudentId}: Attempting to mark attendance...`);
        if (!currentStudentId) {
            log("Student ID not set. Cannot mark attendance.");
            studentStatusDiv.textContent = "Error: Student ID missing.";
            return;
        }

        const professorLocationData = localStorage.getItem(PROFESSOR_LOCATION_KEY);
        if (!professorLocationData) {
            studentStatusDiv.textContent = "Professor's location not available. Cannot mark attendance.";
            log("Student: Professor location not found.");
            return;
        }
        const profCoords = JSON.parse(professorLocationData);

        try {
            const studentCoords = await getGPSCoordinates();
            studentStatusDiv.innerHTML = `Your Location: Lat: ${studentCoords.latitude.toFixed(5)}, Lon: ${studentCoords.longitude.toFixed(5)} (Accuracy: ${studentCoords.accuracy.toFixed(1)}m).`;

            const distance = calculateDistance(
                profCoords.latitude, profCoords.longitude,
                studentCoords.latitude, studentCoords.longitude
            );
            log(`Student: Distance to professor: ${distance.toFixed(1)} meters.`);

            if (distance > MAX_DISTANCE_METERS) {
                studentStatusDiv.innerHTML += `<br><strong style="color:red;">You are too far (${distance.toFixed(1)}m). Must be within ${MAX_DISTANCE_METERS}m.</strong>`;
                log(`Student ${currentStudentId}: Attendance FAILED - Too far.`);
                return;
            }

            // Simulate Bluetooth check
            const bluetoothOk = await simulateBluetoothCheck();
            if (!bluetoothOk) {
                studentStatusDiv.innerHTML += `<br><strong style="color:red;">Bluetooth check failed. Ensure you are close to the professor's device.</strong>`;
                log(`Student ${currentStudentId}: Attendance FAILED - Bluetooth check failed.`);
                return;
            }

            // If all checks pass:
            studentStatusDiv.innerHTML += `<br><strong style="color:green;">Attendance Marked! You are ${distance.toFixed(1)}m away. Bluetooth OK.</strong>`;
            log(`Student ${currentStudentId}: Attendance SUCCESS.`);
            markAttendanceBtn.disabled = true; // Prevent multiple markings

            // Update shared attended students list
            let attended = JSON.parse(localStorage.getItem(ATTENDED_STUDENTS_KEY) || '[]');
            if (!attended.find(s => s.id === currentStudentId)) { // Avoid duplicates
                 attended.push({ id: currentStudentId, timestamp: Date.now() });
                 localStorage.setItem(ATTENDED_STUDENTS_KEY, JSON.stringify(attended));
                 log(`Student ${currentStudentId} added to attendance list.`);
            }


        } catch (error) {
            studentStatusDiv.textContent = `Error: ${error.message}`;
            log(`Student ${currentStudentId}: Error marking attendance - ${error.message}`);
        }
    }

    // --- Event Listeners ---
    loginProfessorBtn.addEventListener('click', () => {
        switchView(professorView);
        log("Switched to Professor view.");
    });

    loginStudentBtn.addEventListener('click', () => {
        // For PoC, assign a random student ID
        currentStudentId = `SID-${Math.floor(1000 + Math.random() * 9000)}`;
        studentIdDisplay.textContent = currentStudentId;
        switchView(studentView);
        log(`Switched to Student view. Assigned ID: ${currentStudentId}`);
        checkActiveSession(); // Check if professor has started a session
        // Set an interval to periodically check for session status for student
        setInterval(checkActiveSession, 5000); 
    });

    backToLoginBtns.forEach(btn => {
        btn.addEventListener('click', resetToLoginView);
    });

    startSessionBtn.addEventListener('click', startAttendanceSession);
    markAttendanceBtn.addEventListener('click', markStudentAttendance);

    // --- Initial Setup ---
    log("Application Initialized. Select a role.");
    // Clear any stale session data from previous runs for a clean PoC start
    localStorage.removeItem(PROFESSOR_LOCATION_KEY);
    localStorage.removeItem(ATTENDANCE_SESSION_KEY);
    localStorage.removeItem(ATTENDED_STUDENTS_KEY);
});
