import React from "react";

export const products = [
  ["Satin Evening Dress", "Women", 2499, "✦"],
  ["Relaxed Linen Shirt", "Men", 1499, "◈"],
  ["Wide-Leg Jeans", "Women", 1899, "◇"],
  ["Urban Overshirt", "Men", 2199, "○"],
  ["Minimal Knit Top", "Women", 1199, "✧"],
  ["Cargo Pants", "Men", 1699, "△"],
];

export default function Products({ category, setCategory, addToCart }) {
  const filteredProducts =
    category === "All"
      ? products
      : products.filter((product) => product[1] === category);

  return (
    <main className="page">
      <label>TRYWISE COLLECTION</label>

      <h1>
        Products <em>you'll want.</em>
      </h1>

      <p>Browse the collection and Bag It before your store visit.</p>

      {/* FILTERS */}
      <div className="filters">
        {["All", "Women", "Men"].map((item) => (
          <button
            key={item}
            className={category === item ? "sel" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {/* PRODUCT GRID */}
      <div className="grid">
        {filteredProducts.map((product, index) => (
          <article className="product" key={index}>
            <div className="pic">
              <b>{product[3]}</b>
              <small>{product[1]}</small>
            </div>

            <h3>{product[0]}</h3>
            <p>Available in selected store</p>

            <strong>₹{product[2].toLocaleString("en-IN")}</strong>

            <button onClick={() => addToCart(product)}>+ Bag It</button>
          </article>
        ))}
      </div>
    </main>
  );
}
