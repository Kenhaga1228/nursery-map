import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { Helmet } from "react-helmet";
import "./App.css"; // 既存のCSSを適用

const containerStyle = {
  width: "100%",
  height: "70vh",
};

const centerTokyo = {
  lat: 35.561,
  lng: 139.716,
};

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
      Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2) * 111000;

    let result = nurseries
      .map((n) => ({ ...n, distance: distance(center, { lat: n.lat, lng: n.lng }) }))
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
          result.routes[0].overview_path.forEach((pt) => bounds.extend(pt));
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
        const loc = results[0].geometry.location;
        const point = { lat: loc.lat(), lng: loc.lng() };
        setSelectedPoint(point);
        if (sortAge !== "") updateNearby(point);
      } else {
        alert("住所が見つかりませんでした");
      }
    });
  };

  if (!isLoaded) return <div>読み込み中です...</div>;

  return (
    <div>
      <Helmet>
        <title>大田区 保育園 空き情報マップ</title>
        <meta name="description" content="大田区の保育園の空き状況を地図で確認。0〜5歳児の空き情報を年齢別に表示。" />
        <meta name="keywords" content="大田区, 保育園, 空き, 待機児童, 園探し" />
      </Helmet>

      <div className="container" style={{ display: "flex", minHeight: "100vh" }}>
        <div className="sidebar">
          <h2 style={{ textAlign: "center", color: "#333" }}>近くの保育園</h2>

          <div style={{ textAlign: "center", marginBottom: "1em" }}>
            <label>検索範囲: {searchRadius}m</label><br />
            <input
              type="range"
              min="300"
              max="1500"
              step="100"
              value={searchRadius}
              onChange={(e) => {
                const r = parseInt(e.target.value);
                setSearchRadius(r);
                if (sortAge !== "") updateNearby(selectedPoint || userLocation);
              }}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ textAlign: "center", marginBottom: "1em" }}>
            <label>空き年齢:</label><br />
            <select
              value={sortAge}
              onChange={(e) => {
                setSortAge(e.target.value);
                if (e.target.value !== "") updateNearby(selectedPoint || userLocation);
              }}
              style={{ width: "100%", padding: "6px", fontSize: "1em", borderRadius: "6px" }}
            >
              <option value="">年齢を選択してください</option>
              <option value="0">0歳の空き</option>
              <option value="1">1歳の空き</option>
              <option value="2">2歳の空き</option>
              <option value="3">3歳の空き</option>
              <option value="4">4歳の空き</option>
              <option value="5">5歳の空き</option>
            </select>
          </div>

          {nearby.map((n, i) => (
            <div key={i} className="card" onClick={() => handleListClick(n)}>
              <strong>{n.name}</strong><br />
              {(n.distance).toFixed(0)}m / 徒歩{Math.round(n.distance / 80)}分<br />
              空き{n[`age_${sortAge}`]}人 / 定員{n[`capacity_age_${sortAge}`]}人<br />
              {n.evaluation_url && <a href={n.evaluation_url} target="_blank" rel="noreferrer">第三者評価リンク</a>}
            </div>
          ))}
        </div>

        <div className="map-area">
          <div className="controls">
            <input
              type="text"
              placeholder="例: 池上4-5-2"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
            />
            <button className="button-primary" onClick={handleAddressSearch}>検索</button>
          </div>

          <div className="map-container">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={selectedPoint || userLocation || centerTokyo}
              zoom={15}
              onLoad={(map) => (mapRef.current = map)}
              onClick={(e) => {
                const clicked = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                setSelectedPoint(clicked);
                updateNearby(clicked);
              }}
              options={{ zoomControl: true, streetViewControl: false, mapTypeControl: false }}
            >
              {userLocation && <Marker position={userLocation} />}
              {selectedPoint && <Marker position={selectedPoint} />}
              {nearby.map((n, i) => (
                <Marker
                  key={i}
                  position={{ lat: n.lat, lng: n.lng }}
                  onClick={() => setSelectedNursery(n)}
                />
              ))}
              {selectedNursery && (
                <InfoWindow
                  position={{ lat: selectedNursery.lat, lng: selectedNursery.lng }}
                  onCloseClick={() => setSelectedNursery(null)}
                >
                  <div>
                    <h4>{selectedNursery.name}</h4>
                    <p>{selectedNursery.address}</p>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedNursery.name + " " + selectedNursery.address)}`} target="_blank" rel="noreferrer">Googleマップで見る</a>
                  </div>
                </InfoWindow>
              )}
              {directions && <DirectionsRenderer directions={directions} />}
            </GoogleMap>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
