import React from "react";
import "./SummaryInterfaces.css";

const data = [
  { trust: "LNWUH", volume: "921,234 / year" },
  { trust: "THH", volume: "893,357 / year" },
  { trust: "ICHNT", volume: "567,890 / year" },
  { trust: "NWLTIE", volume: "456,789 / year" },
];

const SummaryInterfaces = () => {
  return (
    <div className="content">
      {/* Header */}
      <div className="header">
        <h2 className="title">Summary of Interfaces</h2>
      </div>

      {/* Total Trusts */}
      <div className="card">
        <span className="card-label">Total no. of Trusts</span>
        <span className="card-value">24</span>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-header">
          <span>Trust Name</span>
          <span>Message Volume (per year)</span>
        </div>

        {data.map((item, index) => (
          <div key={index} className="row">
            <span className="trust-name">{item.trust}</span>
            <span>{item.volume}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SummaryInterfaces;