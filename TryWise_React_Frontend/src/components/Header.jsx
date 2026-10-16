import React from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Header({
  setPage,
  goProducts,
  cartCount,
  profileOpen,
  setProfileOpen,
  setLoginModal,
  onOpenAddProduct,
  requestsCount = 0,
}) {
  const { user, logout } = useAuth();
  const isStoreOwner = user?.role === "store_owner";

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    setPage("home");
  };

  return (
    <header>
      {/* LOGO */}
      <button className="logo-btn" onClick={() => setPage("home")} title="TryWise Home">
        <img src="/trywise-logo.png" alt="TryWise Shop Smart" className="header-logo-img" />
      </button>

      {/* NAVIGATION LINKS */}
      <nav>
        <button onClick={() => setPage("home")}>Home</button>
        <button onClick={() => goProducts("All")}>Products</button>
        {isStoreOwner && (
          <button onClick={() => setPage("store-requests")}>
            Bag Requests {requestsCount > 0 && <span className="req-bubble">{requestsCount}</span>}
          </button>
        )}
        <button
          onClick={() => {
            setPage("home");
            setTimeout(() => {
              document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }}
        >
          How It Works
        </button>
        <button onClick={() => setPage("about")}>About</button>
      </nav>

      {/* RIGHT SIDE ACTIONS */}
      <div className="actions">
        {/* STORE OWNER: ADD PRODUCT & REQUESTS QUICK ACTION */}
        {isStoreOwner && (
          <>
            <button
              className="pill"
              onClick={onOpenAddProduct}
              style={{
                background: "var(--ink)",
                color: "#fff",
                fontWeight: "700",
                border: "none",
              }}
            >
              + Add Product
            </button>
            <button
              className="pill"
              onClick={() => setPage("store-requests")}
            >
              Requests <i>{requestsCount}</i>
            </button>
          </>
        )}

        {/* CUSTOMER: BAG IT BADGE (ONLY FOR CUSTOMERS) */}
        {!isStoreOwner && user && (
          <button className="pill" onClick={() => setPage("cart")}>
            Bag It <i>{cartCount}</i>
          </button>
        )}

        {/* PROFILE TOGGLE */}
        <button
          className="profile"
          onClick={() => setProfileOpen(!profileOpen)}
        >
          ◉ {user ? user.first_name || user.username : "Profile"} ⌄
        </button>

        {/* PROFILE DROPDOWN */}
        {profileOpen && (
          <div className="menu">
            {user ? (
              <>
                <strong>
                  {user.first_name ? `${user.first_name} ${user.last_name || ""}` : user.username}
                </strong>
                <small>{isStoreOwner ? "Store Owner" : "Customer"}</small>

                {isStoreOwner ? (
                  <>
                    <button
                      onClick={() => {
                        setPage("store-requests");
                        setProfileOpen(false);
                      }}
                    >
                      Customer Requests ({requestsCount})
                    </button>
                    <button
                      onClick={() => {
                        goProducts("All");
                        setProfileOpen(false);
                      }}
                    >
                      Manage Products
                    </button>
                    <button
                      onClick={() => {
                        onOpenAddProduct();
                        setProfileOpen(false);
                      }}
                    >
                      + Add New Product
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setPage("cart");
                      setProfileOpen(false);
                    }}
                  >
                    My Bag It
                  </button>
                )}

                <button onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <strong>Welcome to TryWise</strong>

                <button
                  onClick={() => {
                    setLoginModal("customer");
                    setProfileOpen(false);
                  }}
                >
                  Login as Customer
                </button>

                <button
                  onClick={() => {
                    setLoginModal("store");
                    setProfileOpen(false);
                  }}
                >
                  Login as Store Owner
                </button>

                <button
                  onClick={() => {
                    setLoginModal("register");
                    setProfileOpen(false);
                  }}
                >
                  Register
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
