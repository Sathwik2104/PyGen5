import React from "react";

export default function Cart({ cart }) {
  return (
    <main className="page">
      <label>YOUR SELECTION</label>

      <h1>
        My <em>Bag It.</em>
      </h1>

      <p>Products selected to check in-store.</p>

      {/* EMPTY CART */}
      {!cart.length ? (
        <div className="empty">
          Your Bag It is empty.
          <br />
          <small>Explore products to add your picks.</small>
        </div>
      ) : (
        <div className="cart">
          {/* CART ITEMS */}
          {cart.map((product, index) => (
            <div key={index}>
              <span>{product[3]}</span>
              <b>{product[0]}</b>
              <strong>₹{product[2].toLocaleString("en-IN")}</strong>
            </div>
          ))}

          {/* REQUEST BUTTON */}
          <button className="primary">Send Bag It Request ↗</button>
        </div>
      )}
    </main>
  );
}
