import React, { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:3000/api';
let sessionId = localStorage.getItem('propbot_session') || ('sess_' + Math.random().toString(36).substr(2, 9));
localStorage.setItem('propbot_session', sessionId);

function App() {
  // States
  const [properties, setProperties] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchPurpose, setSearchPurpose] = useState('buy');
  const [searchParams, setSearchParams] = useState({ city: '', type: '', budget: '', beds: '' });
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPropModal, setShowPropModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatTyping, setChatTyping] = useState(false);
  const [stats, setStats] = useState({ totalProps: 100 });
  const [adminTab, setAdminTab] = useState('leads');
  const [adminData, setAdminData] = useState([]);
  const [adminStats, setAdminStats] = useState({});
  const [toast, setToast] = useState(null);
  
  const chatMsgsRef = useRef(null);
  const navbarRef = useRef(null);

  // Helper Functions
  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const formatPrice = (price) => {
    if (price >= 10000000) return `PKR ${(price/10000000).toFixed(1)} Cr`;
    if (price >= 100000) return `PKR ${(price/100000).toFixed(1)} Lac`;
    return `PKR ${price?.toLocaleString()}`;
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // API Calls
  const loadStats = async () => {
    try {
      const res = await fetch(`${API}/properties/stats/summary`);
      const { data } = await res.json();
      if (data) setStats({ totalProps: data.totalProps || 100 });
    } catch (e) { setStats({ totalProps: 100 }); }
  };

  const loadProperties = async (params = {}) => {
    setLoading(true);
    const queryParams = new URLSearchParams({ purpose: searchPurpose, limit: 9, ...params });
    try {
      const res = await fetch(`${API}/properties?${queryParams}`);
      const { data } = await res.json();
      setProperties(data || []);
    } catch (e) {
      showToast('Unable to connect to backend. Please start the Express server.', 'error');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const res = await fetch(`${API}/agents`);
      const { data } = await res.json();
      setAgents(data || []);
    } catch (e) { setAgents([]); }
  };

  const searchProperties = () => {
    const params = {};
    if (searchParams.city) params.city = searchParams.city;
    if (searchParams.type) params.type = searchParams.type;
    if (searchParams.budget) params.max_price = searchParams.budget;
    if (searchParams.beds) params.bedrooms = searchParams.beds;
    loadProperties(params);
    scrollToSection('properties');
  };

  // Chat Functions
  const initChat = () => {
    setChatMessages([{
      id: Date.now(),
      type: 'bot',
      text: "Salam! 👋 Main PropBot AI hoon — Pakistan ka smartest property assistant.\n\nAap kya dhundh rahe hain? Buy karna hai, rent karna hai, ya sirf explore kar rahe hain? Budget aur location batayein — main best properties suggest karoonga! 🏡",
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      text: msg,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }]);
    
    setChatTyping(true);
    try {
      const res = await fetch(`${API}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: msg })
      });
      const data = await res.json();
      setChatTyping(false);
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        text: data.message || 'Maafi chahta hoon, kuch masla hua.',
        properties: data.properties,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (e) {
      setChatTyping(false);
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        text: '⚠️ Backend se connect nahi ho raha. Please server start karein.',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  // Booking Functions
  const submitBooking = async () => {
    const name = document.getElementById('b-name')?.value;
    const email = document.getElementById('b-email')?.value;
    const phone = document.getElementById('b-phone')?.value;
    const date = document.getElementById('b-date')?.value;
    const time = document.getElementById('b-time')?.value;
    const notes = document.getElementById('b-notes')?.value;

    if (!name || !email || !phone || !date || !time) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          property_id: selectedProperty?.id, 
          session_id: sessionId, 
          visitor_name: name, 
          visitor_email: email, 
          visitor_phone: phone, 
          visit_date: date, 
          visit_time: time, 
          notes 
        })
      });
      if (res.ok) {
        setShowBookingModal(false);
        showToast('🎉 Booking confirmed! Agent will contact you soon.', 'success');
        // Clear form
        ['b-name', 'b-email', 'b-phone', 'b-date', 'b-time', 'b-notes'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
      } else {
        showToast('Booking failed. Please try again.', 'error');
      }
    } catch (e) {
      showToast('Network error.', 'error');
    }
  };

  // Admin Functions
  const loadAdminStats = async () => {
    try {
      const [leadsRes, bookingsRes] = await Promise.all([
        fetch(`${API}/leads/stats`),
        fetch(`${API}/bookings`)
      ]);
      const { data: l } = await leadsRes.json();
      const { data: b } = await bookingsRes.json();
      setAdminStats({ total: l?.total || 0, hot: l?.hot || 0, qualified: l?.qualified || 0, bookings: b?.length || 0 });
    } catch (e) {}
  };

  const loadAdminData = async (tab) => {
    try {
      if (tab === 'leads') {
        const res = await fetch(`${API}/leads?limit=20`);
        const { data } = await res.json();
        setAdminData(data || []);
      } else {
        const res = await fetch(`${API}/bookings`);
        const { data } = await res.json();
        setAdminData(data || []);
      }
    } catch (e) {
      setAdminData([]);
    }
  };

  const openAdminModal = async () => {
    setShowAdminModal(true);
    await loadAdminStats();
    await loadAdminData('leads');
  };

  // Effects
  useEffect(() => {
    loadStats();
    loadProperties();
    loadAgents();
    initChat();
    
    // Set min date for booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById('b-date');
    if (dateInput) dateInput.min = tomorrow.toISOString().split('T')[0];
  }, []);

  useEffect(() => {
    if (chatMsgsRef.current) {
      chatMsgsRef.current.scrollTop = chatMsgsRef.current.scrollHeight;
    }
  }, [chatMessages, chatTyping]);

  useEffect(() => {
    const handleScroll = () => {
      const navbar = document.getElementById('navbar');
      if (navbar) {
        navbar.style.background = window.scrollY > 50 ? 'rgba(10,10,15,0.98)' : 'rgba(10,10,15,0.85)';
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div>
      {/* NAVBAR */}
      <nav id="navbar">
        <a href="/" className="nav-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Prop<span>Bot</span> AI</a>
        <ul className="nav-links">
          <li><a href="#properties" onClick={(e) => { e.preventDefault(); scrollToSection('properties'); }}>Properties</a></li>
          <li><a href="#agents" onClick={(e) => { e.preventDefault(); scrollToSection('agents'); }}>Agents</a></li>
          <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a></li>
          <li><a href="#" onClick={(e) => { e.preventDefault(); openAdminModal(); }}>Agent Dashboard</a></li>
          <li><a href="#chat" className="nav-cta" onClick={(e) => { e.preventDefault(); setChatOpen(true); }}>Chat with AI</a></li>
        </ul>
        <button className="menu-btn" onClick={() => {
          const links = document.querySelector('.nav-links');
          if (links.style.display === 'flex') links.style.display = '';
          else { links.style.display = 'flex'; links.style.flexDirection = 'column'; links.style.position = 'absolute'; links.style.top = '70px'; links.style.left = '0'; links.style.right = '0'; links.style.background = 'var(--ink-2)'; links.style.padding = '20px'; }
        }}>☰</button>
      </nav>

      {/* HERO */}
      <section id="hero">
        <div className="hero-bg"></div>
        <div className="hero-grid"></div>
        <div className="hero-content">
          <div className="hero-badge">🤖 Powered by Gemini AI</div>
          <h1 className="hero-title">Pakistan's <em>Smartest</em><br />Real Estate Platform</h1>
          <p className="hero-sub">PropBot AI qualifies leads, recommends properties, and schedules visits — so agents focus only on serious buyers. Apna dream home milao in minutes.</p>
          <div className="hero-actions">
            <button className="btn-gold" onClick={() => setChatOpen(true)}>💬 Chat with PropBot</button>
            <a href="#properties" className="btn-outline" onClick={(e) => { e.preventDefault(); scrollToSection('properties'); }}>🏠 Browse Properties</a>
          </div>
          <div className="hero-stats">
            <div className="stat-item"><h3>{stats.totalProps}+</h3><p>Properties Listed</p></div>
            <div className="stat-item"><h3>6+</h3><p>Cities Covered</p></div>
            <div className="stat-item"><h3>{agents.length}+</h3><p>Expert Agents</p></div>
          </div>
        </div>
        <div className="hero-img">
          <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200" alt="Luxury Property" loading="lazy" />
        </div>
      </section>

      {/* SEARCH */}
      <section id="search-section">
        <div className="search-box">
          <div className="search-tabs">
            <button className={`search-tab ${searchPurpose === 'buy' ? 'active' : ''}`} onClick={() => setSearchPurpose('buy')}>Buy</button>
            <button className={`search-tab ${searchPurpose === 'rent' ? 'active' : ''}`} onClick={() => setSearchPurpose('rent')}>Rent</button>
          </div>
          <div className="search-fields">
            <div className="field-wrap">
              <label>Location / City</label>
              <input type="text" id="s-city" placeholder="Karachi, Lahore, Islamabad..." value={searchParams.city} onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })} />
            </div>
            <div className="field-wrap">
              <label>Property Type</label>
              <select id="s-type" value={searchParams.type} onChange={(e) => setSearchParams({ ...searchParams, type: e.target.value })}>
                <option value="">All Types</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="villa">Villa</option>
                <option value="commercial">Commercial</option>
                <option value="plot">Plot</option>
              </select>
            </div>
            <div className="field-wrap">
              <label>Max Budget</label>
              <input type="number" id="s-budget" placeholder="e.g. 25000000" value={searchParams.budget} onChange={(e) => setSearchParams({ ...searchParams, budget: e.target.value })} />
            </div>
            <div className="field-wrap">
              <label>Bedrooms</label>
              <select id="s-beds" value={searchParams.beds} onChange={(e) => setSearchParams({ ...searchParams, beds: e.target.value })}>
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
            </div>
            <button className="btn-search" onClick={searchProperties}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Search
            </button>
          </div>
        </div>
      </section>

      {/* PROPERTIES */}
      <section id="properties" className="section section-dark">
        <div className="section-header">
          <span className="section-tag">Featured Listings</span>
          <h2 className="section-title">Premium <em>Properties</em></h2>
          <p className="section-sub">Handpicked properties verified by our expert agents across Pakistan</p>
        </div>
        <div className="prop-grid">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="prop-card"><div className="skeleton" style={{ height: '220px' }}></div><div style={{ padding: '20px' }}><div className="skeleton" style={{ height: '20px', marginBottom: '10px', width: '60%' }}></div><div className="skeleton" style={{ height: '16px', width: '80%' }}></div></div></div>
            ))
          ) : properties.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', gridColumn: '1/-1', padding: '60px' }}>No properties found matching your criteria.</p>
          ) : (
            properties.map(p => (
              <div key={p.id} className="prop-card" onClick={() => { setSelectedProperty(p); setShowPropModal(true); }}>
                <div className="prop-img-wrap">
                  <img className="prop-img" src={p.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600'} alt={p.title} loading="lazy" onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600'} />
                  <span className={`prop-badge badge-${p.purpose}`}>{p.purpose === 'buy' ? 'For Sale' : 'For Rent'}</span>
                  {p.featured && <span className="badge-featured">⭐ Featured</span>}
                </div>
                <div className="prop-body">
                  <div className="prop-price">{formatPrice(p.price)}</div>
                  <div className="prop-title">{p.title}</div>
                  <div className="prop-loc">📍 {p.location}, {p.city}</div>
                  <div className="prop-specs">
                    {p.bedrooms && <span className="spec">🛏 <span>{p.bedrooms}</span> Beds</span>}
                    {p.bathrooms && <span className="spec">🚿 <span>{p.bathrooms}</span> Baths</span>}
                    {p.area_sqft && <span className="spec">📐 <span>{p.area_sqft.toLocaleString()}</span> sqft</span>}
                    <span className="spec">🏠 <span style={{ textTransform: 'capitalize' }}>{p.type}</span></span>
                  </div>
                  <div className="prop-agent">
                    <div className="agent-avatar" style={{ background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>👤</div>
                    <div className="agent-info"><strong>{p.agents?.name || 'PropBot Expert'}</strong><p>⭐ {p.agents?.rating || 4.9}</p></div>
                    <button className="book-visit-btn" onClick={(e) => { e.stopPropagation(); setSelectedProperty(p); setShowBookingModal(true); }}>Book Visit</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section section-mid">
        <div className="section-header">
          <span className="section-tag">Why PropBot AI</span>
          <h2 className="section-title">Intelligent <em>Features</em></h2>
          <p className="section-sub">Our AI-powered platform transforms how real estate works in Pakistan</p>
        </div>
        <div className="features-grid">
          <div className="feature-card"><div className="feature-icon">🤖</div><h3>AI Lead Qualification</h3><p>Gemini AI filters serious buyers from casual browsers, scoring each lead based on budget, intent, and engagement level.</p></div>
          <div className="feature-card"><div className="feature-icon">🏠</div><h3>Smart Recommendations</h3><p>Personalized property suggestions based on budget, location preferences, and lifestyle needs — in real-time.</p></div>
          <div className="feature-card"><div className="feature-icon">📅</div><h3>Visit Scheduling</h3><p>Seamlessly book property visits with instant confirmation, time slot management, and automated reminders.</p></div>
          <div className="feature-card"><div className="feature-icon">📊</div><h3>Agent Dashboard</h3><p>Real-time overview of all leads, bookings, and follow-ups. Agents see only qualified, serious prospects.</p></div>
          <div className="feature-card"><div className="feature-icon">🔔</div><h3>Smart Follow-Ups</h3><p>Automated follow-up scheduling based on lead temperature — hot leads get immediate attention, cold leads get nurtured.</p></div>
          <div className="feature-card"><div className="feature-icon">💬</div><h3>Hinglish AI Chat</h3><p>Chat in Urdu, English, or Hinglish. PropBot understands Pakistani context — areas, pricing in lakhs/crores, local norms.</p></div>
        </div>
      </section>

      {/* AGENTS */}
      <section id="agents" className="section section-dark">
        <div className="section-header">
          <span className="section-tag">Our Team</span>
          <h2 className="section-title">Expert <em>Agents</em></h2>
          <p className="section-sub">Pakistan's most trusted property consultants, powered by AI tools</p>
        </div>
        <div className="agents-grid">
          {agents.map(a => (
            <div key={a.id} className="agent-card">
              <div className="agent-card-avatar">👤</div>
              <h3>{a.name}</h3>
              <div className="agent-title">{a.specialization?.join(' • ') || 'Property Consultant'}</div>
              <div className="agent-rating"><span className="stars">★★★★★</span> {a.rating}</div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{a.bio || ''}</p>
              <div className="agent-stats">
                <div className="agent-stat"><strong>{a.experience_years}yr</strong><span>Experience</span></div>
                <div className="agent-stat"><strong>{a.total_sales || 0}+</strong><span>Sales</span></div>
                <div className="agent-stat"><strong>{a.rating}</strong><span>Rating</span></div>
              </div>
              <div className="agent-actions">
                <a href={`tel:${a.phone}`} className="agent-call-btn">📞 Call</a>
                <button onClick={() => setChatOpen(true)} className="agent-chat-btn">💬 Chat</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-grid">
          <div className="footer-brand"><div className="nav-logo">Prop<span style={{ color: '#fff' }}>Bot</span> AI</div><p>Pakistan's most intelligent real estate platform. Find, compare, and book your dream property with the power of AI.</p></div>
          <div className="footer-col"><h4>Properties</h4><ul><li><a href="#" onClick={(e) => { e.preventDefault(); setSearchParams({ ...searchParams, type: 'apartment' }); searchProperties(); }}>Apartments</a></li><li><a href="#" onClick={(e) => { e.preventDefault(); setSearchParams({ ...searchParams, type: 'house' }); searchProperties(); }}>Houses</a></li><li><a href="#" onClick={(e) => { e.preventDefault(); setSearchParams({ ...searchParams, type: 'villa' }); searchProperties(); }}>Villas</a></li><li><a href="#" onClick={(e) => { e.preventDefault(); setSearchParams({ ...searchParams, type: 'plot' }); searchProperties(); }}>Plots</a></li><li><a href="#" onClick={(e) => { e.preventDefault(); setSearchParams({ ...searchParams, type: 'commercial' }); searchProperties(); }}>Commercial</a></li></ul></div>
          <div className="footer-col"><h4>Cities</h4><ul><li><a href="#" onClick={(e) => { e.preventDefault(); setSearchParams({ ...searchParams, city: 'Karachi' }); searchProperties(); }}>Karachi</a></li><li><a href="#" onClick={(e) => { e.preventDefault(); setSearchParams({ ...searchParams, city: 'Lahore' }); searchProperties(); }}>Lahore</a></li><li><a href="#" onClick={(e) => { e.preventDefault(); setSearchParams({ ...searchParams, city: 'Islamabad' }); searchProperties(); }}>Islamabad</a></li><li><a href="#" onClick={(e) => { e.preventDefault(); setSearchParams({ ...searchParams, city: 'Rawalpindi' }); searchProperties(); }}>Rawalpindi</a></li></ul></div>
          <div className="footer-col"><h4>Company</h4><ul><li><a href="#">About Us</a></li><li><a href="#">Contact</a></li><li><a href="#">Privacy Policy</a></li><li><a href="#" onClick={(e) => { e.preventDefault(); openAdminModal(); }}>Agent Login</a></li></ul></div>
        </div>
        <div className="footer-bottom"><p>© 2024 PropBot AI. Built with ❤️ for Pakistan's Real Estate Market.</p></div>
      </footer>

      {/* CHATBOT BUTTON */}
      <button className="chatbot-btn" onClick={() => setChatOpen(!chatOpen)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>

      {/* CHAT PANEL */}
      {chatOpen && (
        <div className="chat-panel">
          <div className="chat-header"><div className="chat-avatar">🤖</div><div className="chat-info"><h4>PropBot AI</h4><p>Online • Powered by Gemini</p></div><button className="chat-close" onClick={() => setChatOpen(false)}>✕</button></div>
          <div className="chat-msgs" ref={chatMsgsRef}>
            {chatMessages.map(msg => (
              <div key={msg.id} className={`msg ${msg.type}`}>
                <div className="msg-bubble">
                  {msg.text.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>)}
                  {msg.properties?.map(prop => (
                    <div key={prop.id} className="chat-prop-card" onClick={() => { setSelectedProperty(prop); setShowPropModal(true); setChatOpen(false); }}>
                      <img className="chat-prop-img" src={prop.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200'} alt={prop.title} onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200'} />
                      <div className="chat-prop-info"><h5>{prop.title}</h5><p>{formatPrice(prop.price)}</p><span>📍 {prop.location}, {prop.city}</span></div>
                    </div>
                  ))}
                </div>
                <div className="msg-time">{msg.time}</div>
              </div>
            ))}
            {chatTyping && <div className="msg bot"><div className="typing-indicator"><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div></div>}
          </div>
          <div className="chat-input-wrap">
            <textarea className="chat-input" placeholder="Apna sawaal likhein... (Ask in Urdu or English)" rows="1" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}></textarea>
            <button className="chat-send" onClick={sendChatMessage}><svg viewBox="0 0 24 24" fill="var(--ink)" stroke="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>
          </div>
        </div>
      )}

      {/* PROPERTY DETAIL MODAL */}
      {showPropModal && selectedProperty && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setShowPropModal(false); }}>
          <div className="modal" style={{ maxWidth: '760px', padding: 0 }}>
            <div style={{ position: 'relative' }}>
              <img src={selectedProperty.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'} alt="" style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
              <button onClick={() => setShowPropModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div><div className="prop-modal-price">{formatPrice(selectedProperty.price)}</div><div className="prop-modal-title">{selectedProperty.title}</div><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>📍 {selectedProperty.location}, {selectedProperty.city}</div></div>
                <button className="btn-gold" style={{ padding: '12px 24px' }} onClick={() => { setShowBookingModal(true); setShowPropModal(false); }}>📅 Book Visit</button>
              </div>
              <p className="prop-modal-desc">{selectedProperty.description || 'Luxury property with modern amenities and prime location.'}</p>
              <div className="prop-modal-specs">
                {selectedProperty.bedrooms && <span className="prop-modal-spec">🛏 <strong>{selectedProperty.bedrooms} Bedrooms</strong></span>}
                {selectedProperty.bathrooms && <span className="prop-modal-spec">🚿 <strong>{selectedProperty.bathrooms} Bathrooms</strong></span>}
                {selectedProperty.area_sqft && <span className="prop-modal-spec">📐 <strong>{selectedProperty.area_sqft.toLocaleString()} sq.ft</strong></span>}
                <span className="prop-modal-spec">🏠 <strong style={{ textTransform: 'capitalize' }}>{selectedProperty.type}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {showBookingModal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setShowBookingModal(false); }}>
          <div className="modal">
            <h2>📅 Schedule a Visit</h2>
            <p className="subtitle">Book a property viewing — our agent will confirm within 2 hours</p>
            <div className="form-grid">
              <div className="form-group"><label>Your Name *</label><input type="text" id="b-name" placeholder="Ahmed Khan" /></div>
              <div className="form-group"><label>Phone *</label><input type="tel" id="b-phone" placeholder="+92-300-1234567" /></div>
              <div className="form-group full"><label>Email *</label><input type="email" id="b-email" placeholder="ahmed@email.com" /></div>
              <div className="form-group"><label>Visit Date *</label><input type="date" id="b-date" /></div>
              <div className="form-group"><label>Visit Time *</label><select id="b-time"><option value="">Select Time</option><option value="09:00">9:00 AM</option><option value="10:00">10:00 AM</option><option value="11:00">11:00 AM</option><option value="12:00">12:00 PM</option><option value="14:00">2:00 PM</option><option value="15:00">3:00 PM</option><option value="16:00">4:00 PM</option><option value="17:00">5:00 PM</option></select></div>
              <div className="form-group full"><label>Notes (Optional)</label><input type="text" id="b-notes" placeholder="Any special requirements..." /></div>
            </div>
            <div className="modal-actions"><button className="btn-cancel" onClick={() => setShowBookingModal(false)}>Cancel</button><button className="btn-confirm" onClick={submitBooking}>✓ Confirm Booking</button></div>
          </div>
        </div>
      )}

      {/* ADMIN DASHBOARD MODAL */}
      {showAdminModal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setShowAdminModal(false); }}>
          <div className="modal" style={{ maxWidth: '920px', width: '100%', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}><h2 style={{ fontFamily: 'var(--font-display)' }}>🏢 Agent Dashboard</h2><button onClick={() => setShowAdminModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer' }}>✕</button></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
              <div style={{ background: 'var(--ink-3)', borderRadius: 12, padding: 16, textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 700, color: '#c9a84c' }}>{adminStats.total || 0}</div><div style={{ fontSize: 12 }}>Total Leads</div></div>
              <div style={{ background: 'var(--ink-3)', borderRadius: 12, padding: 16, textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 700, color: '#e63946' }}>{adminStats.hot || 0}</div><div style={{ fontSize: 12 }}>Hot Leads</div></div>
              <div style={{ background: 'var(--ink-3)', borderRadius: 12, padding: 16, textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 700, color: '#22a06b' }}>{adminStats.qualified || 0}</div><div style={{ fontSize: 12 }}>Qualified</div></div>
              <div style={{ background: 'var(--ink-3)', borderRadius: 12, padding: 16, textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 700, color: '#4a90e2' }}>{adminStats.bookings || 0}</div><div style={{ fontSize: 12 }}>Bookings</div></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}><button className={`search-tab ${adminTab === 'leads' ? 'active' : ''}`} onClick={() => { setAdminTab('leads'); loadAdminData('leads'); }}>Leads</button><button className={`search-tab ${adminTab === 'bookings' ? 'active' : ''}`} onClick={() => { setAdminTab('bookings'); loadAdminData('bookings'); }}>Bookings</button></div>
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {adminTab === 'leads' ? (
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border)' }}><th style={{ textAlign: 'left', padding: 10 }}>Name</th><th style={{ textAlign: 'left', padding: 10 }}>Contact</th><th style={{ textAlign: 'left', padding: 10 }}>Score</th><th style={{ textAlign: 'left', padding: 10 }}>Status</th></tr></thead>
                  <tbody>{adminData.map(l => <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}><td style={{ padding: 10 }}>{l.name || '—'}</td><td style={{ padding: 10 }}>{l.phone || l.email || '—'}</td><td style={{ padding: 10 }}><span style={{ background: l.score >= 70 ? '#e63946' : l.score >= 40 ? '#22a06b' : '#444', padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{l.score || 0}</span></td><td style={{ padding: 10 }}><span style={{ color: l.status === 'hot' ? '#e63946' : l.status === 'qualified' ? '#22a06b' : 'var(--text-muted)' }}>{l.status}</span></td></tr>)}</tbody>
                </table>
              ) : (
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border)' }}><th style={{ textAlign: 'left', padding: 10 }}>Visitor</th><th style={{ textAlign: 'left', padding: 10 }}>Property</th><th style={{ textAlign: 'left', padding: 10 }}>Date & Time</th><th style={{ textAlign: 'left', padding: 10 }}>Status</th></tr></thead>
                  <tbody>{adminData.map(b => <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}><td style={{ padding: 10 }}>{b.visitor_name}<br /><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{b.visitor_phone}</span></td><td style={{ padding: 10, color: 'var(--text-muted)' }}>{b.properties?.title || '—'}</td><td style={{ padding: 10, color: 'var(--text-muted)' }}>{b.visit_date} {b.visit_time}</td><td style={{ padding: 10 }}><span style={{ color: b.status === 'confirmed' ? '#22a06b' : b.status === 'pending' ? '#c9a84c' : 'var(--text-muted)' }}>{b.status}</span></td></tr>)}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div id="toast-container">
          <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '💡'} {toast.msg}</div>
        </div>
      )}
    </div>
  );
}

export default App;