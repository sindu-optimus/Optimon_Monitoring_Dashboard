import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import "./MessageBank.css";

const MessageBank = () => {
  const location = useLocation();
  const { interfaceId } = location.state || {};

  const [data, setData] = useState([]);
  const [search, setSearch] = useState({ mrn: "", start: "", end: "" });
  const [sortConfig, setSortConfig] = useState({
    key: "timestamp",
    direction: "asc",
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(
        "https://neevapi.ddns.net/api/nim/messages/v1",
        {
          params: {
            InterfaceId: interfaceId,
            mrn: search.mrn || undefined,
            start: search.start || undefined,
            end: search.end || undefined,
            sortBy: sortConfig.key,
            sortDir: sortConfig.direction,
            page,
            pageSize,
          },
        }
      );

      setData(response.data.records || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch message data", err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [search, sortConfig, page]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleSearchChange = (field, value) => {
    setPage(1);
    setSearch((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="content">
      <h2>Message Bank</h2>

      <div className="search-panel">
        <input
          type="text"
          placeholder="MRN"
          value={search.mrn}
          onChange={(e) => handleSearchChange("mrn", e.target.value)}
        />
        <input
          type="datetime-local"
          onChange={(e) => handleSearchChange("start", e.target.value)}
        />
        <input
          type="datetime-local"
          onChange={(e) => handleSearchChange("end", e.target.value)}
        />
      </div>

      <table className="messagebank-table">
        <thead>
          <tr>
            <th onClick={() => handleSort("sessionId")}>Session ID</th>
            <th onClick={() => handleSort("mrn")}>MRN</th>
            <th onClick={() => handleSort("timestamp")}>Timestamp</th>
            <th onClick={() => handleSort("status")}>Status</th>
            <th onClick={() => handleSort("info")}>Info</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{item.sessionId}</td>
              <td>{item.mrn}</td>
              <td>{item.timestamp}</td>
              <td>{item.status}</td>
              <td>{item.info}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination-controls">
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1}
        >
          Prev
        </button>

        <span className="page">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default MessageBank;
