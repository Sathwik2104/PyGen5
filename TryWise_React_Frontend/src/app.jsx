import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import LoginModal from "./components/LoginModal.jsx";
import AddProductModal from "./components/AddProductModal.jsx";
import Home from "./pages/Home.jsx";
import Products from "./pages/Products.jsx";
import Cart from "./pages/Cart.jsx";
import StoreRequests from "./pages/StoreRequests.jsx";
import Info from "./pages/Info.jsx";
import { fetchOrders } from "./services/api.js";
import "./style.css";

function MainContent() {
  const { user, tokens } = useAuth();
  const [loginModal, setLoginModal] = useState(null); // 'choose', 'customer', 'store', 'register'
  const [addProductModal, setAddProductModal] = useState(false);
  const [page, setPage] = useState("home");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // For store owners, poll/fetch pending orders count for the notification badge
  useEffect(() => {
    let interval;
    if (user?.role === "store_owner" && tokens?.access) {
      const checkRequests = async () => {
        try {
          const orders = await fetchOrders(tokens.access);
          const pending = orders.filter((o) => o.status === "Pending").length;
          setPendingRequestsCount(pending);
        } catch (err) {
          // silently handle background count fetch
        }
      };
      checkRequests();
      interval = setInterval(checkRequests, 20000); // refresh every 20 seconds
    } else {
      setPendingRequestsCount(0);
    }
    return () => clearInterval(interval);
  }, [user, tokens]);

  const goProducts = () => {
    setPage("products");
  };

  // Add item to cart with selected size
  const addToCart = (item) => {
    if (!user) {
      setLoginModal("customer");
      return;
    }

    setCart((currentCart) => {
      // Check if product with SAME id AND size already exists in bag
      const existingIndex = currentCart.findIndex(
        (ci) => ci.productId === item.productId && ci.size === item.size
      );

      if (existingIndex > -1) {
        const nextCart = [...currentCart];
        const existing = nextCart[existingIndex];
        const newQty = existing.quantity + 1;

        if (item.availableStock && newQty > item.availableStock) {
          alert(`Only ${item.availableStock} available in stock for Size ${item.size}.`);
          return currentCart;
        }

        nextCart[existingIndex] = { ...existing, quantity: newQty };
        return nextCart;
      }

      return [...currentCart, { ...item, quantity: 1 }];
    });
  };

  return (
    <>
      <Header
        setPage={setPage}
        goProducts={goProducts}
        cartCount={cart.reduce((sum, i) => sum + i.quantity, 0)}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        setLoginModal={setLoginModal}
        onOpenAddProduct={() => setAddProductModal(true)}
        requestsCount={pendingRequestsCount}
      />

      {page === "home" && <Home go={goProducts} />}

      {page === "products" && (
        <Products
          category={category}
          setCategory={setCategory}
          addToCart={addToCart}
          onOpenAddProduct={() => setAddProductModal(true)}
        />
      )}

      {page === "cart" && (
        <Cart
          cart={cart}
          setCart={setCart}
          setPage={setPage}
        />
      )}

      {page === "store-requests" && <StoreRequests />}

      {page === "about" && (
        <Info
          title="About TryWise"
          text="TryWise bridges digital browsing and physical shopping. Discover collections, Bag It, then visit the store to try and confidently choose what you love."
        />
      )}

      {/* LOGIN / AUTH MODAL */}
      {loginModal && (
        <LoginModal
          type={loginModal}
          close={() => setLoginModal(null)}
          setLoginModal={setLoginModal}
        />
      )}

      {/* STORE OWNER: ADD PRODUCT MODAL */}
      {addProductModal && (
        <AddProductModal
          close={() => setAddProductModal(false)}
          onProductAdded={() => {
            // Trigger products refresh by changing category or reload
            setCategory((c) => (c === "All" ? "All " : "All"));
            setPage("products");
          }}
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