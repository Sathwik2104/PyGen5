import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { fetchProducts, fetchStoreConfig, sendChatMessage } from "../services/api.js";
import { recordProductVisit } from "../services/recentHistory.js";
import ImageModal from "./ImageModal.jsx";

/**
 * Intelligent Chatbot Assistant for TryWise:
 * - Restricted: Available exclusively to authenticated Customers (hidden for Store Owners & Guests).
 * - Tiered hybrid shopping guide:
 *     - Tier 1: Instant zero-cost FAQ matching for policies (how Bag It works, hold windows, store hours, in-store payments).
 *     - Tier 2: Calls Django Backend /api/chat/ (powered by Groq Cloud AI / Fast Catalog Engine) for occasion/styling advice and catalog filters.
 *     - Tier 3: Returns interactive product cards with direct "+ Bag It" buttons and size selectors.
 */
export default function Chatbot({ addToCart, goProducts, onOpenLogin }) {
  const { user, tokens } = useAuth();
  const { showToast } = useToast();

  // STRICT ACCESS CONTROL: Only logged-in Customers can view or use the Assistant
  if (!user || user.role !== "customer") {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [storeConfig, setStoreConfig] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState({});
  const [addedProductIds, setAddedProductIds] = useState({});
  const [previewImage, setPreviewImage] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch public store configuration on mount for live timings & hold duration
  useEffect(() => {
    let isMounted = true;
    fetchStoreConfig()
      .then((cfg) => {
        if (isMounted && cfg) {
          setStoreConfig(cfg);
        }
      })
      .catch(() => {
        // Fall back gracefully to standard defaults
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Format dynamic reservation hold text
  const getHoldDurationText = () => {
    if (!storeConfig) return "24 hours";
    const val = storeConfig.trial_duration_value || 24;
    const unit = storeConfig.trial_duration_unit || "hours";
    return `${val} ${val === 1 ? unit.replace(/s$/, "") : unit}`;
  };

  // Initial welcome message
  const initialMessages = [
    {
      id: "welcome",
      sender: "bot",
      type: "text",
      text: "Hi! 👋 Welcome to **TryWise**. I'm your AI Shopping Assistant!\n\nI can help you explore our collection, find clothing within your budget (e.g. *'shirts under 2k'* or *'women dresses'*), and answer any questions about our **zero-risk in-store trial** and store timings.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      chips: [
        "🛍️ How Bag It Works",
        "🏷️ Products under ₹2k",
        "⏱️ Trial Hold Window",
        "📍 Store Location & Hours",
        "👗 Women's Collection",
        "👔 Men's Collection",
        "💳 Payment & Checkout",
      ],
    },
  ];

  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem("trywise_chat_history");
      return saved ? JSON.parse(saved) : initialMessages;
    } catch {
      return initialMessages;
    }
  });

  // Persist chat history across page navigation in the same session
  useEffect(() => {
    try {
      sessionStorage.setItem("trywise_chat_history", JSON.stringify(messages));
    } catch {
      // Ignore storage errors
    }
  }, [messages]);

  // Auto-scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isThinking, isOpen]);

  // Focus input when chat window is opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Set default size for product cards
  const getSelectedSize = (product) => {
    if (selectedSizes[product.id]) {
      return selectedSizes[product.id];
    }
    const defaultSize =
      product.size_s > 0
        ? "S"
        : product.size_m > 0
        ? "M"
        : product.size_l > 0
        ? "L"
        : product.size_xl > 0
        ? "XL"
        : "S";
    return defaultSize;
  };

  const handleSelectSize = (productId, size) => {
    setSelectedSizes((prev) => ({
      ...prev,
      [productId]: size,
    }));
  };

  // Add product to cart directly from chat card
  const handleBagItFromChat = (product) => {
    if (!user) {
      if (onOpenLogin) {
        onOpenLogin("customer");
      }
      showToast("Please sign in to Bag It items for in-store trial.", "info");
      return;
    }

    const currentSize = getSelectedSize(product);
    const sizeKey = `size_${currentSize.toLowerCase()}`;
    const stock = product[sizeKey] || 0;

    if (stock <= 0) {
      showToast(`Size ${currentSize} is currently out of stock.`, "error");
      return;
    }

    recordProductVisit(product);

    addToCart({
      productId: product.id,
      name: product.name,
      category: product.category,
      price: Number(product.price),
      image: product.image,
      size: currentSize,
      availableStock: stock,
    });

    setAddedProductIds((prev) => ({ ...prev, [product.id]: true }));
    showToast(`Added ${product.name} (Size ${currentSize}) to your Bag It!`, "success");

    setTimeout(() => {
      setAddedProductIds((prev) => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  // Clear chat conversation
  const handleClearChat = () => {
    if (window.confirm("Do you want to reset your conversation with TryWise Assistant?")) {
      setMessages(initialMessages);
      try {
        sessionStorage.removeItem("trywise_chat_history");
      } catch {}
    }
  };

  /**
   * Budget & Keyword extraction parser:
   * Parses natural strings like "shirts under 2k", "below 1500", "women tops < 2000"
   */
  const parseBudgetAndQuery = (text) => {
    const raw = text.toLowerCase();
    let maxPrice = null;
    let minPrice = null;

    const parseAmount = (valStr) => {
      if (!valStr) return null;
      valStr = valStr.trim().toLowerCase();
      if (valStr.endsWith("k")) {
        return parseFloat(valStr.replace("k", "")) * 1000;
      }
      return parseFloat(valStr);
    };

    // Max price detection (under 2k, below 1500, <= 2000, max 3k, budget 2500, upto 2000)
    const maxMatch =
      raw.match(/(?:under|below|less\s+than|within|upto|up\s+to|max|budget)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?k?|\d+)/i) ||
      raw.match(/<=\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?k?|\d+)/i) ||
      raw.match(/<\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?k?|\d+)/i);

    if (maxMatch) {
      maxPrice = parseAmount(maxMatch[1]);
    }

    // Min price detection (above 1000, over 1500, >= 2000, more than 500)
    const minMatch =
      raw.match(/(?:above|over|more\s+than|min|at\s+least)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?k?|\d+)/i) ||
      raw.match(/>=\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?k?|\d+)/i) ||
      raw.match(/>\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?k?|\d+)/i);

    if (minMatch) {
      minPrice = parseAmount(minMatch[1]);
    }

    // Category detection
    let category = "All";
    if (/\b(men|mens|male|gentlemen|boy|boys)\b/i.test(raw) && !/\bwomen\b/i.test(raw)) {
      category = "Men";
    } else if (/\b(women|womens|female|ladies|girl|girls)\b/i.test(raw)) {
      category = "Women";
    }

    // Keyword cleaning: remove budget phrases and stop words
    let clean = raw
      .replace(/(?:under|below|less\s+than|within|upto|up\s+to|max|budget|above|over|more\s+than|min|at\s+least)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?k?|\d+)/gi, " ")
      .replace(/[<>=]\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?k?|\d+)/gi, " ")
      .replace(/\b(men|mens|women|womens|collection|products|product|items|item|clothes|clothing|wear|options|show|me|find|get|give|looking|for|want|need|i|the|a|an|in|of|with|please|best|cheap|affordable|any)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    return { maxPrice, minPrice, category, cleanKeywords: clean };
  };

  /**
   * Process user input and produce contextual response
   */
  const handleSendMessage = async (userText) => {
    const text = (userText || inputValue).trim();
    if (!text || isThinking) return;

    setInputValue("");

    const userMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      type: "text",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsThinking(true);

    const lower = text.toLowerCase();
    const holdDurationText = getHoldDurationText();

    // Check for FAQ Intention First
    // 1. How Bag It Works
    if (
      lower.includes("how bag it works") ||
      lower.includes("how does bag it work") ||
      lower.includes("what is bag it") ||
      lower.includes("how it works") ||
      lower.includes("explain bag it") ||
      lower.includes("trial work")
    ) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: "bot",
            type: "faq",
            text:
              "🛍️ **How Bag It Works in 4 Easy Steps:**\n\n" +
              "1. **Select Your Size & Tap '+ Bag It':** Browse any item and add it to your Bag It list online. You pay **₹0 online**!\n\n" +
              "2. **Store Holds Your Clothes:** Our in-store staff retrieves your reserved sizes and keeps them safely set aside in our fitting room trial area.\n\n" +
              "3. **Visit The Store:** Come to our store within the trial hold window to try on your garments in private fitting rooms.\n\n" +
              "4. **Pay Only For What You Love:** Take home what fits and flatters you, pay at the counter (Cash, UPI, Card), and leave the rest behind—zero hassle!",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            chips: ["⏱️ Trial Hold Window", "📍 Store Location & Hours", "🏷️ Products under ₹2k"],
          },
        ]);
        setIsThinking(false);
      }, 500);
      return;
    }

    // 2. Trial Hold Window & Expiration
    if (
      lower.includes("hold window") ||
      lower.includes("how long") ||
      lower.includes("hold time") ||
      lower.includes("time limit") ||
      lower.includes("duration") ||
      lower.includes("expire") ||
      lower.includes("reservation")
    ) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: "bot",
            type: "faq",
            text:
              `⏱️ **Trial Reservation Hold Window:**\n\n` +
              `When the store accepts your Bag It request, your items are reserved exclusively for you for **${holdDurationText}**.\n\n` +
              `• Your hold countdown starts immediately upon store confirmation.\n` +
              `• Please visit our store before the timer expires to try on your pieces.\n` +
              `• If the hold period passes without a visit, the items are automatically released back to public shelves.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            chips: ["🛍️ How Bag It Works", "📍 Store Location & Hours"],
          },
        ]);
        setIsThinking(false);
      }, 500);
      return;
    }

    // 3. Store Location, Hours, & Contact
    if (
      lower.includes("location") ||
      lower.includes("address") ||
      lower.includes("where") ||
      lower.includes("landmark") ||
      lower.includes("hours") ||
      lower.includes("timing") ||
      lower.includes("open") ||
      lower.includes("closing") ||
      lower.includes("phone") ||
      lower.includes("contact") ||
      lower.includes("email")
    ) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: "bot",
            type: "faq",
            text:
              `📍 **${storeConfig?.store_name || "TryWise Flagship Store"}**\n\n` +
              `• **Address:** ${storeConfig?.address || "123 Fashion Street, Downtown District, Metropolis"}\n` +
              `• **Landmark:** ${storeConfig?.landmark || "Opposite City Center Mall"}\n` +
              `• **Hours:** ${storeConfig?.hours || "Mon - Sun: 10:00 AM – 9:30 PM"}\n` +
              `• **Phone:** ${storeConfig?.phone || "+91 98765 43210"}\n` +
              `• **Email:** ${storeConfig?.email || "support@trywise.com"}\n\n` +
              `💡 *Tip: Check out our **About** page for an interactive Google Map with 1-click GPS driving directions!*`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            chips: ["🛍️ How Bag It Works", "👗 Women's Collection", "👔 Men's Collection"],
          },
        ]);
        setIsThinking(false);
      }, 500);
      return;
    }

    // 4. In-Store Payment & Online Zero Cost
    if (
      lower.includes("payment") ||
      lower.includes("how to pay") ||
      lower.includes("online payment") ||
      lower.includes("pay online") ||
      lower.includes("cash") ||
      lower.includes("upi") ||
      lower.includes("card") ||
      lower.includes("free") ||
      lower.includes("cost")
    ) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: "bot",
            type: "faq",
            text:
              "💳 **Zero-Risk In-Store Payment:**\n\n" +
              "• **Online Cost:** **₹0.00**. TryWise never asks for credit card numbers, CVVs, or UPI payments online.\n" +
              "• **In-Store Payment:** After you've tried on your reserved garments and decided what looks best on you, simply proceed to checkout.\n" +
              "• We accept **Cash, UPI (Google Pay, PhonePe, Paytm), and all Credit/Debit cards** in-store.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            chips: ["🛍️ How Bag It Works", "⏱️ Trial Hold Window"],
          },
        ]);
        setIsThinking(false);
      }, 500);
      return;
    }

    // 5. Returns & Exchange Policy
    if (
      lower.includes("return") ||
      lower.includes("exchange") ||
      lower.includes("refund") ||
      lower.includes("policy")
    ) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: "bot",
            type: "faq",
            text:
              "🔄 **Try-Before-You-Buy & Exchanges:**\n\n" +
              "Because you try on every piece in our store fitting rooms before buying, size and fit disappointments are virtually eliminated!\n\n" +
              "• If you ever need an exchange after purchasing, bring the unworn product with intact tags and store receipt within **7 days**.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            chips: ["🛍️ How Bag It Works", "📍 Store Location & Hours"],
          },
        ]);
        setIsThinking(false);
      }, 500);
      return;
    }

    // 6. Conversational Greetings
    if (
      /^(hi|hello|hey|yo|howdy|sup|good\s*(morning|afternoon|evening)|who\s*are\s*you)$/i.test(lower.trim())
    ) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: "bot",
            type: "text",
            text:
              "Hello! 👋 I'm your TryWise Shopping Assistant.\n\n" +
              "You can ask me to find products under a certain budget (e.g. *'products under 2k'* or *'linen shirts'*), explain how our in-store trial works, or check store location and timings!",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            chips: [
              "🏷️ Products under ₹2k",
              "🛍️ How Bag It Works",
              "👗 Women's Collection",
              "👔 Men's Collection",
            ],
          },
        ]);
        setIsThinking(false);
      }, 400);
      return;
    }

    // Forward to Backend /api/chat/ (Groq Cloud AI + Hybrid Catalog Engine)
    try {
      const chatResponse = await sendChatMessage(text, tokens?.access);

      if (chatResponse.products && chatResponse.products.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: "bot",
            type: "products",
            text: chatResponse.reply,
            products: chatResponse.products.slice(0, 8),
            totalCount: chatResponse.products.length,
            filterMeta: chatResponse.filters || { category: "All", search: text },
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: "bot",
            type: "text",
            text: chatResponse.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            chips: [
              "👗 Women's Collection",
              "👔 Men's Collection",
              "🏷️ Products under ₹2k",
              "🛍️ How Bag It Works",
            ],
          },
        ]);
      }
    } catch (err) {
      // Graceful fallback to client catalog lookup if network error occurs
      try {
        const { maxPrice, minPrice, category, cleanKeywords } = parseBudgetAndQuery(text);
        const results = await fetchProducts(category, cleanKeywords, maxPrice, minPrice);

        if (results && results.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              id: `bot_${Date.now()}`,
              sender: "bot",
              type: "products",
              text: `✨ I found **${results.length}** item(s) matching your request. Select your size and tap **+ Bag It** to reserve for your in-store trial:`,
              products: results.slice(0, 8),
              totalCount: results.length,
              filterMeta: { category, search: cleanKeywords, maxPrice },
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `bot_${Date.now()}`,
              sender: "bot",
              type: "text",
              text: "I couldn't find items matching your request. Try searching for other keywords (like *'linen'*, *'shirt'*, or *'dress'*) or raising your budget ceiling.",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              chips: ["👗 Women's Collection", "👔 Men's Collection", "🏷️ Products under ₹2k"],
            },
          ]);
        }
      } catch (fallbackErr) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: "bot",
            type: "text",
            text: "Oops, I encountered a brief issue checking our catalog. Please try again in a moment or browse directly from the Products tab.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* FLOATING TRIGGER BUTTON */}
      <button
        type="button"
        className={`chatbot-trigger-btn ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title={isOpen ? "Close Assistant" : "Ask TryWise Assistant"}
        aria-label="Open TryWise Assistant"
      >
        <span className="chatbot-trigger-icon">
          {isOpen ? (
            "✕"
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M8 10h.01" />
              <path d="M12 10h.01" />
              <path d="M16 10h.01" />
            </svg>
          )}
        </span>
        <span className="chatbot-trigger-label">
          {isOpen ? "Close" : "Ask TryWise"}
        </span>
        {!isOpen && hasUnread && <span className="chatbot-badge-pulse" />}
      </button>

      {/* CHATBOT DRAWER / WINDOW */}
      {isOpen && (
        <div className="chatbot-window" role="dialog" aria-label="TryWise Shopping Assistant">
          {/* HEADER */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <span>✨</span>
                <span className="online-dot" />
              </div>
              <div className="chatbot-title-wrap">
                <div className="chatbot-title">TryWise Assistant</div>
                <div className="chatbot-subtitle">Catalog & Trial Guide</div>
              </div>
            </div>

            <div className="chatbot-header-actions">
              <button
                type="button"
                className="chatbot-action-btn"
                onClick={handleClearChat}
                title="Clear conversation"
              >
                🗑️
              </button>
              <button
                type="button"
                className="chatbot-action-btn close-btn"
                onClick={() => setIsOpen(false)}
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* MESSAGES BODY */}
          <div className="chatbot-body">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message-row ${msg.sender}`}>
                {msg.sender === "bot" && (
                  <div className="chat-msg-avatar" title="TryWise AI">
                    ✨
                  </div>
                )}

                <div className="chat-bubble">
                  {/* Formatted Text Content */}
                  <div className="chat-text">
                    {msg.text.split("\n\n").map((para, pIdx) => (
                      <p key={pIdx}>
                        {para.split("\n").map((line, lIdx) => {
                          // Simple bolding helper for **text**
                          const parts = line.split(/(\*\*.*?\*\*)/g);
                          return (
                            <React.Fragment key={lIdx}>
                              {parts.map((part, partIdx) => {
                                if (part.startsWith("**") && part.endsWith("**")) {
                                  return (
                                    <strong key={partIdx}>
                                      {part.slice(2, -2)}
                                    </strong>
                                  );
                                }
                                return part;
                              })}
                              {lIdx < line.length - 1 && <br />}
                            </React.Fragment>
                          );
                        })}
                      </p>
                    ))}
                  </div>

                  {/* EMBEDDED PRODUCT CARDS IN CHAT */}
                  {msg.type === "products" && msg.products && msg.products.length > 0 && (
                    <div className="chat-products-container">
                      <div className="chat-products-grid">
                        {msg.products.map((product) => {
                          const currentSize = getSelectedSize(product);
                          const currentStock = product[`size_${currentSize.toLowerCase()}`] || 0;
                          const isAdded = !!addedProductIds[product.id];
                          const hasDiscount =
                            Number(product.original_price) > Number(product.price);
                          const discountPercent = hasDiscount
                            ? Math.round(
                                ((Number(product.original_price) - Number(product.price)) /
                                  Number(product.original_price)) *
                                  100
                              )
                            : 0;

                          return (
                            <div key={product.id} className="chat-product-card">
                              {/* THUMBNAIL */}
                              <div
                                className="chat-product-img-wrap"
                                onClick={() =>
                                  product.image &&
                                  setPreviewImage({
                                    url: product.image,
                                    title: product.name,
                                  })
                                }
                                title="Click to view image"
                              >
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="chat-product-no-img">👗</div>
                                )}
                                {hasDiscount && (
                                  <span className="chat-discount-badge">
                                    {discountPercent}% OFF
                                  </span>
                                )}
                              </div>

                              {/* PRODUCT DETAILS */}
                              <div className="chat-product-info">
                                <div className="chat-product-meta">
                                  <span className="chat-cat-tag">{product.category}</span>
                                </div>
                                <div className="chat-product-name" title={product.name}>
                                  {product.name}
                                </div>

                                <div className="chat-product-price-row">
                                  <span className="chat-price">
                                    ₹{Number(product.price).toLocaleString("en-IN")}
                                  </span>
                                  {hasDiscount && (
                                    <span className="chat-orig-price">
                                      ₹{Number(product.original_price).toLocaleString("en-IN")}
                                    </span>
                                  )}
                                </div>

                                {/* SIZE SELECTION PILLS */}
                                <div className="chat-size-pills">
                                  {["S", "M", "L", "XL"].map((sz) => {
                                    const stockCount = product[`size_${sz.toLowerCase()}`] || 0;
                                    const isOut = stockCount === 0;
                                    const isSelected = currentSize === sz;

                                    return (
                                      <button
                                        key={sz}
                                        type="button"
                                        className={`chat-size-pill ${
                                          isSelected ? "active" : ""
                                        } ${isOut ? "disabled" : ""}`}
                                        disabled={isOut}
                                        onClick={() => !isOut && handleSelectSize(product.id, sz)}
                                        title={
                                          isOut
                                            ? `Size ${sz} Out of Stock`
                                            : `Select Size ${sz} (${stockCount} in stock)`
                                        }
                                      >
                                        {sz}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* + BAG IT ACTION */}
                                <div className="chat-product-actions">
                                  <button
                                    type="button"
                                    className={`chat-bag-it-btn ${isAdded ? "added" : ""}`}
                                    onClick={() => handleBagItFromChat(product)}
                                    disabled={currentStock <= 0}
                                  >
                                    {isAdded
                                      ? "✓ In Bag"
                                      : currentStock > 0
                                      ? `+ Bag It (${currentSize})`
                                      : "Sold Out"}
                                  </button>

                                  <button
                                    type="button"
                                    className="chat-view-link-btn"
                                    onClick={() => {
                                      if (goProducts) {
                                        goProducts(product.category, product.name);
                                      }
                                    }}
                                    title="View product in main collection"
                                  >
                                    View ↗
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* VIEW ALL IN PRODUCTS BUTTON */}
                      {msg.filterMeta && (
                        <div className="chat-see-all-wrap">
                          <button
                            type="button"
                            className="chat-see-all-btn"
                            onClick={() => {
                              if (goProducts) {
                                goProducts(
                                  msg.filterMeta.category || "All",
                                  msg.filterMeta.search || ""
                                );
                              }
                            }}
                          >
                            Explore all matching items in Products Tab ↗
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* QUICK SUGGESTION CHIPS */}
                  {msg.chips && msg.chips.length > 0 && (
                    <div className="chat-chips-container">
                      {msg.chips.map((chipText, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          className="chat-chip-btn"
                          onClick={() => handleSendMessage(chipText)}
                        >
                          {chipText}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="chat-timestamp">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {/* TYPING ANIMATION */}
            {isThinking && (
              <div className="chat-message-row bot thinking-row">
                <div className="chat-msg-avatar">✨</div>
                <div className="chat-bubble thinking-bubble">
                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT BAR */}
          <div className="chatbot-footer">
            <input
              ref={inputRef}
              type="text"
              className="chatbot-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or 'shirts under 2k'..."
              disabled={isThinking}
            />
            <button
              type="button"
              className="chatbot-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isThinking}
              title="Send message"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* FULLSIZE IMAGE PREVIEW MODAL */}
      {previewImage && (
        <ImageModal
          imageUrl={previewImage.url}
          title={previewImage.title}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </>
  );
}

