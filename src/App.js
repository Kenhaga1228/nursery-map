import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
  DirectionsRenderer,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "70vh",
  borderRadius: "10px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
};

const centerTokyo = {
  lat: 35.561,
  lng: 139.716,
};

const yellowIcon = {
  url: "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
};

const getRedIcon = () => ({
  url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
  scaledSize: new window.google.maps.Size(48, 48),
});

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [nurseries, setNurseries] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [selectedNursery, setSelectedNursery] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [directions, setDirections] = useState(null);
  const [inputAddress, setInputAddress] = useState("");
  const [sortAge, setSortAge] = useState("");
  const [searchRadius, setSearchRadius] = useState(700);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    fetch("/nursery_with_capacity.json")
      .then((res) => res.json())
      .then((data) => setNurseries(data));
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(loc);
        if (sortAge !== "") updateNearby(loc);
      });
    }
  }, [nurseries, sortAge]);

  const updateNearby = (center) => {
    if (sortAge === "") return;
    const distance = (a, b) =>
      Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2)) * 111000;

    let result = nurseries
      .map((n) => ({
        ...n,
        distance: distance(center, { lat: n.lat, lng: n.lng }),
      }))
      .filter((n) => n.distance < searchRadius)
      .filter((n) => Number(n[`age_${sortAge}`]) > 0)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    setNearby(result);
    setSelectedNursery(null);
    setDirections(null);
  };

  const handleListClick = (nursery) => {
    const origin = selectedPoint || userLocation;
    if (!origin) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin,
        destination: { lat: nursery.lat, lng: nursery.lng },
        travelMode: "WALKING",
      },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);
          setSelectedNursery(nursery);
          const bounds = new window.google.maps.LatLngBounds();
          result.routes[0].overview_path.forEach((point) => bounds.extend(point));
          mapRef.current?.fitBounds(bounds);
        }
      }
    );
  };

  const handleAddressSearch = () => {
    const query = "東京都大田区 " + inputAddress;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
      if (status === "OK" && results[0]) {
        const point = results[0].geometry.location;
        const loc = {
          lat: point.lat(),
          lng: point.lng(),
        };
        setSelectedPoint(loc);
        if (sortAge !== "") updateNearby(loc);
      } else {
        alert("住所が見つかりませんでした");
      }
    });
  };

  if (!isLoaded) return <div>読み込み中です...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#fef9ef", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ display: "flex", flex: 1, flexWrap: "wrap" }}>
        {/* サイドバー */}
        <div style={{ width: "100%", maxWidth: "300px", padding: "1em", backgroundColor: "#fff4d6", overflowY: "auto", boxShadow: "2px 0 5px rgba(0,0,0,0.1)", flex: "1 1 auto" }}>
          <h2 style={{ textAlign: "center", color: "#333" }}>近くの保育園</h2>

          <div style={{ marginBottom: "1em", textAlign: "center" }}>
            <label style={{ fontWeight: "bold" }}>検索範囲: {searchRadius}m</label><br />
            <input
              type="range"
              min="300"
              max="1500"
              step="100"
              value={searchRadius}
              onChange={(e) => {
                const radius = parseInt(e.target.value);
                setSearchRadius(radius);
                if (sortAge !== "") updateNearby(selectedPoint || userLocation);
              }}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "1em", textAlign: "center" }}>
            <label style={{ fontWeight: "bold", marginRight: "8px" }}>空き年齢:</label>
            <select
              value={sortAge}
              onChange={(e) => {
                const val = e.target.value;
                setSortAge(val);
                if (val !== "") updateNearby(selectedPoint || userLocation);
              }}
              style={{ padding: "5px", fontSize: "1em", borderRadius: "6px" }}
            >
              <option value="" disabled>年齢を選択してください</option>
              <option value="0">0歳の空き</option>
              <option value="1">1歳の空き</option>
              <option value="2">2歳の空き</option>
              <option value="3">3歳の空き</option>
              <option value="4">4歳の空き</option>
              <option value="5">5歳の空き</option>
            </select>
          </div>

          <ul style={{ listStyle: "none", padding: 0 }}>
            {nearby.map((n, i) => (
              <li key={i} onClick={() => handleListClick(n)} style={{ padding: "10px", backgroundColor: "#fff", marginBottom: "10px", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", cursor: "pointer" }}>
                <strong>{n.name}</strong><br />
                該当地点から {(n.distance).toFixed(0)}m、徒歩{Math.round(n.distance / 80)}分<br />
                空き{n[`age_${sortAge}`] ?? "-"}人 / 定員{n[`capacity_age_${sortAge}`] ?? "-"}人<br />
                {n.evaluation_url && (<a href={n.evaluation_url} target="_blank" rel="noreferrer">第三者評価リンク</a>)}
              </li>
            ))}
          </ul>
        </div>

        {/* マップ */}
        <div style={{ flex: "2 1 600px", padding: "1em" }}>
          <h1 style={{ textAlign: "center", color: "#333", marginBottom: "0.5em" }}>保育園空き検索マップ</h1>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1em" }}>
            <input
              type="text"
              placeholder="例: 池上4-5-2"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              style={{ padding: "8px", fontSize: "1em", width: "200px", marginRight: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
            />
            <button
              onClick={handleAddressSearch}
              style={{ padding: "8px 12px", fontSize: "1em", borderRadius: "6px", backgroundColor: "#ffa500", border: "none", color: "#fff", cursor: "pointer" }}
            >
              検索
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={selectedPoint || userLocation || centerTokyo}
              zoom={15}
              onLoad={(map) => (mapRef.current = map)}
              onClick={(e) => {
                const clicked = {
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng(),
                };
                setSelectedPoint(clicked);
                updateNearby(clicked);
              }}
              options={{ zoomControl: true, streetViewControl: false, mapTypeControl: false }}
            >
              {userLocation && <Marker position={userLocation} icon={yellowIcon} />}
              {selectedPoint && <Marker position={selectedPoint} icon={getRedIcon()} />}
              {nearby.map((n, i) => (
                <Marker key={i} position={{ lat: n.lat, lng: n.lng }} onClick={() => setSelectedNursery(n)} />
              ))}
              {selectedNursery && (
                <InfoWindow
                  position={{ lat: selectedNursery.lat, lng: selectedNursery.lng }}
                  onCloseClick={() => setSelectedNursery(null)}
                >
                  <div>
                    <h4>{selectedNursery.name}</h4>
                    <p>{selectedNursery.address}</p>
                    <p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedNursery.name + " " + selectedNursery.address)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Googleマップで見る
                      </a>
                    </p>
                    <p style={{ fontSize: "0.8em", color: "#888" }}>更新日: {new Date().toLocaleDateString()}</p>
                  </div>
                </InfoWindow>
              )}
              {directions && <DirectionsRenderer directions={directions} />}
            </GoogleMap>

            <button
              style={{ position: "absolute", top: "10px", left: "10px", zIndex: 1, padding: "10px 15px", backgroundColor: "#ffcc00", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}
              onClick={() => {
                if (userLocation) {
                  setSelectedPoint(null);
                  updateNearby(userLocation);
                }
              }}
            >
              📍 現在地に戻る
            </button>
          </div>
        </div>
      </div>

      {/* フッター */}
      <div style={{ textAlign: "center", fontSize: "0.85em", color: "#555", backgroundColor: "#fef9ef", padding: "1em" }}>
        <p>📅 データ更新日: {new Date().toLocaleDateString("ja-JP")}</p>
        <p style={{ maxWidth: "600px", margin: "0 auto", lineHeight: "1.4" }}>
          ※本サイトの保育園空き情報は、大田区が公開する資料に基づいて作成されています。<br />
          実際の空き状況と異なる場合があります。詳細は各施設または区役所へご確認ください。
        </p>
      </div>
    </div>
  );
}

export default App;
