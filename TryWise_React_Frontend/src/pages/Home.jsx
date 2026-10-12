import React from "react";

export default function Home({ go }) {
  return (
    <main>
      {/* HERO SECTION */}
      <section className="hero">
        <div>
          <label>SMARTER PHYSICAL SHOPPING</label>

          <h1>
            Shop smart.
            <br />
            <em>Try with confidence.</em>
          </h1>

          <p>
            Discover collections from stores before you visit. Browse what you
            love, Bag It, and spend less time searching through racks.
          </p>

          <button className="primary" onClick={go}>
            Explore Collection ↗
          </button>

          <button
            className="secondary"
            onClick={() =>
              document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            How it works
          </button>
        </div>

        {/* HERO ABSTRACT ART */}
        <div className="art">
          <div className="orb"></div>
          <div className="fashion">
            <small>TRYWISE EDIT · 01/04</small>
            <strong>✦</strong>
            <span>Curated for your visit</span>
          </div>

          <div className="float">
            ✦ <b>Bag It</b>
            <small>before you visit</small>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" id="how">
        <label>THE TRYWISE WAY</label>
        <h2>
          Shopping, <em>simplified.</em>
        </h2>

        <div className="steps">
          {[
            ["01", "Discover", "Explore stores and collections."],
            ["02", "Browse", "Find products by category."],
            ["03", "Bag It", "Select the items and sizes you want."],
            ["04", "Try & Shop", "The store prepares them for your visit."],
          ].map((step) => (
            <article key={step[0]}>
              <small>{step[0]}</small>
              <h3>{step[1]}</h3>
              <p>{step[2]}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CATEGORY SECTION */}
      <section className="section beige">
        <label>EXPLORE</label>
        <h2>
          Find your <em>style.</em>
        </h2>

        <div className="tiles">
          <div>
            01
            <h3>Women</h3>
            ↗
          </div>
          <div>
            02
            <h3>Men</h3>
            ↗
          </div>
        </div>
      </section>

      {/* WHY TRYWISE */}
      <section className="banner">
        <div>
          <label>WHY TRYWISE?</label>
          <h2>
            Your time matters.
            <br />
            <em>Shop accordingly.</em>
          </h2>
        </div>

        <p>
          TryWise brings organized digital discovery to physical shopping — so
          you spend less time looking and more time deciding.
        </p>
      </section>
    </main>
  );
}
