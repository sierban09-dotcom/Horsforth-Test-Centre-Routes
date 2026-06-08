
const map = L.map('map').setView([53.8421, -1.6370], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// ---------------- ICON ----------------

const arrowIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/60/60525.png",
    iconSize: [22, 22],
    iconAnchor: [11, 11]
});

// ---------------- STATE ----------------

let marker = null;
let routeLine = null;
let watchId = null;

let followMode = true;
let lastPos = null;
let userPos = null;

// ---------------- POPULATE ROUTES ----------------

const select = document.getElementById("routeSelect");

Object.keys(routes).forEach(key => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = routes[key].name;
    select.appendChild(opt);
});

// ---------------- START NAV ----------------

function startNavigation() {

    const route = routes[select.value].points;

    drawRoute(route);

    navigator.geolocation.getCurrentPosition(pos => {

        const start = [pos.coords.latitude, pos.coords.longitude];

        userPos = start;

        if (!marker) {
            marker = L.marker(start, { icon: arrowIcon }).addTo(map);
        } else {
            marker.setLatLng(start);
        }

        map.setView(start, 16);

        trackUser();

    });

}

// ---------------- REAL ROAD ROUTING (ISSUE 2 FIX) ----------------

async function drawRoute(points) {

    if (routeLine) map.removeLayer(routeLine);

    let fullRoute = [];

    for (let i = 0; i < points.length - 1; i++) {

        const a = points[i];
        const b = points[i + 1];

        const url =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${a[1]},${a[0]};${b[1]},${b[0]}` +
            `?overview=full&geometries=geojson`;

        try {

            const res = await fetch(url);
            const data = await res.json();

            const coords = data.routes[0].geometry.coordinates;

            coords.forEach(c => {
                fullRoute.push([c[1], c[0]]);
            });

        } catch (e) {
            console.log("segment failed", e);
        }
    }

    routeLine = L.polyline(fullRoute, {
        color: "blue",
        weight: 5
    }).addTo(map);

    map.fitBounds(routeLine.getBounds(), {
        padding: [40, 40]
    });
}

// ---------------- TRACKING (ISSUE 3 FIX) ----------------

function trackUser() {

    watchId = navigator.geolocation.watchPosition(pos => {

        const current = [pos.coords.latitude, pos.coords.longitude];

        userPos = current;

        if (marker) marker.setLatLng(current);

        if (followMode) {
            map.panTo(current, {
                animate: true,
                duration: 0.3
            });
        }

        if (lastPos && marker.setRotationAngle) {
            const bearing = getBearing(lastPos, current);
            marker.setRotationAngle(bearing);
        }

        lastPos = current;

    }, err => console.log(err), {
        enableHighAccuracy: true,
        maximumAge: 1000
    });

}

// ---------------- RECENTER ----------------

function recenter() {

    if (!userPos) return;

    followMode = true;

    map.setView(userPos, 17, {
        animate: true,
        duration: 0.5
    });

}

// ---------------- DRAG DISABLE FOLLOW ----------------

map.on('dragstart', () => {
    followMode = false;
});

// ---------------- BEARING ----------------

function getBearing(a, b) {

    const toRad = x => x * Math.PI / 180;

    const lat1 = toRad(a[0]);
    const lon1 = toRad(a[1]);
    const lat2 = toRad(b[0]);
    const lon2 = toRad(b[1]);

    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// ---------------- STOP ----------------

function stopNavigation() {

    if (watchId) navigator.geolocation.clearWatch(watchId);

    watchId = null;

}
