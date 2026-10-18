/** Lightweight Leaflet map for nearby + you. */

let map = null;
let layerGroup = null;
let leafletLoaded = false;

function loadLeaflet() {
  if (leafletLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (window.L) {
      leafletLoaded = true;
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      leafletLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * @param {string} containerId
 * @param {[number, number]} userLatLng [lat, lng]
 * @param {Array<{ name: string, coords: [number, number], scheduled?: boolean }>} sites
 */
export async function renderNearbyMap(containerId, userLatLng, sites) {
  const el = document.getElementById(containerId);
  if (!el) return;
  await loadLeaflet();
  const L = window.L;

  if (!map) {
    map = L.map(el, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);
    layerGroup = L.layerGroup().addTo(map);
  }

  layerGroup.clearLayers();
  const bounds = [];

  const you = L.circleMarker(userLatLng, {
    radius: 9,
    color: "#0d7a66",
    fillColor: "#96e8d2",
    fillOpacity: 1,
    weight: 2,
  }).bindPopup("You are here");
  you.addTo(layerGroup);
  bounds.push(userLatLng);

  sites.slice(0, 12).forEach((s, i) => {
    const [lat, lng] = s.coords;
    const marker = L.circleMarker([lat, lng], {
      radius: 7,
      color: s.scheduled ? "#b45309" : "#30455b",
      fillColor: s.scheduled ? "#ffd68a" : "#96e8d2",
      fillOpacity: 0.9,
      weight: 2,
    }).bindPopup(`<strong>${i + 1}. ${s.name}</strong>`);
    marker.addTo(layerGroup);
    bounds.push([lat, lng]);
  });

  if (bounds.length === 1) {
    map.setView(userLatLng, 14);
  } else {
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
  }
  setTimeout(() => map.invalidateSize(), 100);
}

export function destroyMap() {
  if (map) {
    map.remove();
    map = null;
    layerGroup = null;
  }
}
