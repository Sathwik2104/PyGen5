import React from "react";

export default function Info({ title, text }) {
  return (
    <main className="page info">
      <label>TRYWISE</label>
      <h1>{title}</h1>
      <p>{text}</p>
    </main>
  );
}
