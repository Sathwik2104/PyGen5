import React from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Header({
  setPage,
  goProducts,
  cartCount,
  profileOpen,
  setProfileOpen,
  setLoginModal,
}) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    setPage("home");
  };

  return (
    <header>
      {/* LOGO */}
      <button className="logo" onClick={() => setPage("home")}>
        <b>◢</b> TRY<span>WISE</span>
      </button>

      {/* NAVIGATION LINKS */}
      <nav>
        <button onClick={() => setPage("home")}>Home</button>
        <button onClick={goProducts}>Products</button>
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
        {/* BAG IT BADGE */}
        {user && (
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
                <strong>{user.first_name ? `${user.first_name} ${user.last_name || ""}` : user.username}</strong>
                <small>{user.role === "store_owner" ? "Store Owner" : "Customer"}</small>

                <button onClick={() => { setPage("cart"); setProfileOpen(false); }}>
                  My Bag It
                </button>
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
