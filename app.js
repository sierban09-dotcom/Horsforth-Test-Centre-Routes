const map = L.map('map').setView([53.842,-1.637],13);

L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
{
attribution:'© OpenStreetMap'
}
).addTo(map);

let marker;

function startNavigation(){

const route =
document.getElementById("routeSelect").value;

const directions =
routeDescriptions[route];

let html = "<b>Selected Route</b><br><br>";

directions.forEach((step,index)=>{

html += `${index+1}. ${step}<br>`;

});

document.getElementById("directions").innerHTML =
html;

navigator.geolocation.getCurrentPosition(pos=>{

const lat = pos.coords.latitude;
const lng = pos.coords.longitude;

if(marker){
map.removeLayer(marker);
}

marker =
L.marker([lat,lng]).addTo(map);

map.setView([lat,lng],16);

});

}
