import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import LoginModal from "./components/LoginModal.jsx";
import Home from "./pages/Home.jsx";
import Products from "./pages/Products.jsx";
import Cart from "./pages/Cart.jsx";
import Info from "./pages/Info.jsx";
import "./style.css";

function MainContent() {
  const { user } = useAuth();
  const [loginModal, setLoginModal] = useState(null); // 'choose', 'customer', 'store', 'register'
  const [page, setPage] = useState("home");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);

  const goProducts = () => {
    if (user) {
      setPage("products");
    } else {
      setLoginModal("choose");
    }
  };

  const addToCart = (product) => {
    if (user) {
      setCart((currentCart) => [...currentCart, product]);
    } else {
      setLoginModal("choose");
    }
  };

  return (
    <>
      <Header
        setPage={setPage}
        goProducts={goProducts}
        cartCount={cart.length}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        setLoginModal={setLoginModal}
      />

      {page === "home" && <Home go={goProducts} />}

      {page === "products" && (
        <Products
          category={category}
          setCategory={setCategory}
          addToCart={addToCart}
        />
      )}

      {page === "cart" && <Cart cart={cart} />}

      {page === "about" && (
        <Info
          title="About TryWise"
          text="TryWise bridges digital browsing and physical shopping. Discover collections, Bag It, then visit the store to try and confidently choose what you love."
        />
      )}

      {loginModal && (
        <LoginModal
          type={loginModal}
          close={() => setLoginModal(null)}
          setLoginModal={setLoginModal}
        />
      )}

      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}