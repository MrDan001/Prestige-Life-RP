const scenes = [
  { className: "city-police", title: "Law Enforcement", label: "City patrols and public safety" },
  { className: "city-business", title: "Business & Careers", label: "Business and nightlife" },
  { className: "city-cars", title: "Vehicles & Lifestyle", label: "Cars and open roads" },
  { className: "city-events", title: "Events & More", label: "City lights and community events" },
];
export default function CityLife() {
  return <section className="gallery-section" aria-labelledby="city-life-title">
    <p className="section-eyebrow">EXPLORE THE CITY</p>
    <h2 id="city-life-title">Life in Prestige</h2>
    <p className="gallery-intro">From high-speed chases to peaceful nights, there is always something happening in the city. Take a look at what you can expect.</p>
    <div className="city-grid">{scenes.map((scene) => <article key={scene.title} className={`city-card ${scene.className}`} role="img" aria-label={scene.label}><span>{scene.title}</span></article>)}</div>
  </section>;
}