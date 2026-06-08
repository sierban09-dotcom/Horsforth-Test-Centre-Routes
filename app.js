const map = L.map('map').setView([53.8421, -1.6370], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// ================= ICON =================

const arrowIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/60/60525.png",
    iconSize: [22, 22],
    iconAnchor: [11, 11]
});

// ================= STATE =================

let marker = null;
let routeLine = null;
let watchId = null;
let followMode = true;
let lastPos = null;

// ================= START NAV =================

function startNavigation() {

    const selected = document.getElementById("routeSelect").value;
    const routePoints = routes[selected].points;

    drawRoute(routePoints);

    navigator.geolocation.getCurrentPosition(pos => {

        const start = [pos.coords.latitude, pos.coords.longitude];

        if (!marker) {
            marker = L.marker(start, { icon: arrowIcon }).addTo(map);
        } else {
            marker.setLatLng(start);
        }

        map.setView(start, 16);

        trackUser();

    });
}

// ================= REAL ROAD ROUTING (FIX FOR ISSUE 2) =================

async function drawRoute(points) {

    if (routeLine) {
        map.removeLayer(routeLine);
    }

    let fullRoute = [];

    for (let i = 0; i < points.length - 1; i++) {

        const start = points[i];
        const end = points[i + 1];

        const url =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${start[1]},${start[0]};${end[1]},${end[0]}` +
            `?overview=full&geometries=geojson`;

        try {

            const res = await fetch(url);
            const data = await res.json();

            if (!data.routes || !data.routes[0]) continue;

            const coords = data.routes[0].geometry.coordinates;

            coords.forEach(c => {
                fullRoute.push([c[1], c[0]]);
            });

        } catch (err) {
            console.log("Route segment failed:", err);
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

// ================= GPS TRACKING =================

function trackUser() {

    watchId = navigator.geolocation.watchPosition(pos => {

        const current = [pos.coords.latitude, pos.coords.longitude];

        // update marker
        if (marker) {
            marker.setLatLng(current);
        }

        // FOLLOW MODE (stable version)
        if (followMode) {
            map.setView(current, map.getZoom(), {
                animate: true
            });
        }

        // ROTATION (optional safety check)
        if (lastPos && marker && marker.setRotationAngle) {
            const bearing = getBearing(lastPos, current);
            marker.setRotationAngle(bearing);
        }

        lastPos = current;

    }, err => {
        console.error(err);
        alert("GPS error: " + err.message);
    }, {
        enableHighAccuracy: true,
        maximumAge: 1000
    });
}

// ================= BEARING CALC =================

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

// ================= STOP NAV =================

function stopNavigation() {

    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }

    watchId = null;

}
