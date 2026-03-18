import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./ViewActions.css";

const ViewActions = () => {
  const location = useLocation();
  const { interfaceId } = location.state || {};

  const [qaData, setQaData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ===================== FETCH ON LOAD ===================== */
  useEffect(() => {
    fetchData({ interfaceId });
  }, [interfaceId]);

  /* ===================== FETCH ON DATE CHANGE ===================== */
  useEffect(() => {
    if (fromDate || toDate) {
      const payload = { interfaceId };

      if (fromDate && !toDate) payload.startDate = fromDate;
      else if (!fromDate && toDate) payload.startDate = toDate;
      else if (fromDate && toDate) {
        payload.startDate = fromDate;
        payload.endDate = toDate;
      }

      fetchData(payload);
    }
  }, [fromDate, toDate]);

  /* ===================== RESET WHEN CLEARED ===================== */
  useEffect(() => {
    if (!fromDate && !toDate) {
      fetchData({ interfaceId });
    }
  }, [fromDate, toDate]);

  /* ===================== FETCH FUNCTION ===================== */
  const fetchData = async (payload) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "https://neevapi.ddns.net/api/nim/issue/v1",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch data");

      const data = await response.json();
      setQaData(data || []);
    } catch (err) {
      console.error(err);
      setError("Error loading data. Please try again later.");
    } finally {
      setLoading(false);
      window.scrollTo(0, 0);
    }
  };

  /* ===================== SEARCH ===================== */
  const handleSearchChange = (e) =>
    setSearchTerm(e.target.value.toLowerCase());

  const clearSearch = () => setSearchTerm("");

  const filteredData = qaData.filter((item) => {
    const itemDate = new Date(item.date);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    const matchesSearch =
      item.issue?.toLowerCase().includes(searchTerm) ||
      item.action?.toLowerCase().includes(searchTerm) ||
      item.date?.toLowerCase().includes(searchTerm);

    const matchesDate =
      (!from || itemDate >= from) && (!to || itemDate <= to);

    return matchesSearch && matchesDate;
  });

  return (
    <div className="content">
      <h2>View Actions</h2>
      {/* <h4>Welcome to View Actions</h4> */}

      <div className="filterWrapper">
        {/* Search */}
        <div className="inputField">
          <i className="ri-search-line"></i>
          <input
            type="text"
            placeholder="Search here..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <i className="ri-close-line" onClick={clearSearch}></i>
          )}
        </div>

        {/* Date Range */}
        <div className="dateRange">
          <label className="formLabel">
            From:
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="formLabel">
            To:
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* 📋 Results */}
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <ul className="actions-section">
          {filteredData.length > 0 ? (
            filteredData.map((item, index) => (
              <li key={index} className="list">
                <strong>{item.issue}</strong>
                <p
                  className="answer"
                  dangerouslySetInnerHTML={{ __html: item.action }}
                />
                <p className="date">{item.date}</p>
              </li>
            ))
          ) : (
            <p>No results found.</p>
          )}
        </ul>
      )}
    </div>
  );
};

export default ViewActions;
