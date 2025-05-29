
import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
  DirectionsRenderer,
} from "@react-google-maps/api";
import './App.css';

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
    <div className="container">
      <div className="main-content">
        <div className="sidebar">
          <h2>近くの保育園</h2>

          <div className="controls">
            <label>検索範囲: {searchRadius}m</label>
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
            />
          </div>

          <div className="controls">
            <label>空き年齢:</label>
            <select
              value={sortAge}
              onChange={(e) => {
                const val = e.target.value;
                setSortAge(val);
                if (val !== "") updateNearby(selectedPoint || userLocation);
              }}
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

          <ul className="nursery-list">
            {nearby.map((n, i) => (
              <li key={i} onClick={() => handleListClick(n)}>
                <strong>{n.name}</strong><br />
                該当地点から {(n.distance).toFixed(0)}m、徒歩{Math.round(n.distance / 80)}分<br />
                空き{n[`age_${sortAge}`] ?? "-"}人 / 定員{n[`capacity_age_${sortAge}`] ?? "-"}人<br />
                {n.evaluation_url && (<a href={n.evaluation_url} target="_blank" rel="noreferrer">第三者評価リンク</a>)}
              </li>
            ))}
          </ul>
        </div>

        <div className="map-area">
          <h1>保育園空き検索マップ</h1>

          <div className="controls-row">
            <input
              type="text"
              placeholder="例: 池上4-5-2"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
            />
            <button onClick={handleAddressSearch}>検索</button>
          </div>

          <div style={{ position: "relative" }}>
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "60vh" }}
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
                    <p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedNursery.name + " " + selectedNursery.address)}`} target="_blank" rel="noreferrer">Googleマップで見る</a></p>
                    <p style={{ fontSize: "0.8em", color: "#888" }}>更新日: {new Date().toLocaleDateString()}</p>
                  </div>
                </InfoWindow>
              )}
              {directions && <DirectionsRenderer directions={directions} />}
            </GoogleMap>

            <button className="current-location-btn" onClick={() => {
              if (userLocation) {
                setSelectedPoint(null);
                updateNearby(userLocation);
              }
            }}>
              📍 現在地に戻る
            </button>
          </div>
        </div>
      </div>

      <div className="footer">
        <p>📅 データ更新日: {new Date().toLocaleDateString("ja-JP")}</p>
        <p>※本サイトの保育園空き情報は、大田区が公開する資料に基づいて作成されています。<br />実際の空き状況と異なる場合があります。詳細は各施設または区役所へご確認ください。</p>
      </div>
    </div>
  );
}

export default App;
