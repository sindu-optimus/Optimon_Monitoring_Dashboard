import React, { useEffect, useMemo, useState } from "react";
import { getTrusts } from "../../api/trustService";
import { filterTrustsByAccess } from "../../utils/trustAccess";
import "./SummaryInterfaces.css";

const TRUST_INTERFACES = {
  LNWUH: [
    { interfaceName: "CERNER", monthlyAnalysis: "76,770 / month", yearlyVolume: "921,234 / year" },
    { interfaceName: "ICE", monthlyAnalysis: "34,398 / month", yearlyVolume: "412,780 / year" },
    { interfaceName: "Pathology", monthlyAnalysis: "24,867 / month", yearlyVolume: "298,410 / year" },
    { interfaceName: "Endovault", monthlyAnalysis: "15,638 / month", yearlyVolume: "187,650 / year" },
  ],
  THH: [
    { interfaceName: "CERNER", monthlyAnalysis: "74,446 / month", yearlyVolume: "893,357 / year" },
    { interfaceName: "ICE", monthlyAnalysis: "31,368 / month", yearlyVolume: "376,420 / year" },
    { interfaceName: "ESB", monthlyAnalysis: "21,241 / month", yearlyVolume: "254,890 / year" },
    { interfaceName: "NWLTIE", monthlyAnalysis: "16,519 / month", yearlyVolume: "198,230 / year" },
    { interfaceName: "Somerset", monthlyAnalysis: "11,963 / month", yearlyVolume: "143,560 / year" },
  ],
  ICHNT: [
    { interfaceName: "CERNER", monthlyAnalysis: "7,304 / month", yearlyVolume: "87,650 / year" },
    { interfaceName: "CIE", monthlyAnalysis: "8,186 / month", yearlyVolume: "98,230 / year" },
    { interfaceName: "SUNQUEST", monthlyAnalysis: "19,288 / month", yearlyVolume: "231,450 / year" },
    { interfaceName: "DDSCMF", monthlyAnalysis: "12,148 / month", yearlyVolume: "145,780 / year" },
  ],
  NWLTIE: [
    { interfaceName: "CERNER", monthlyAnalysis: "38,066 / month", yearlyVolume: "456,789 / year" },
    { interfaceName: "CIEINVITE", monthlyAnalysis: "15,603 / month", yearlyVolume: "187,230 / year" },
    { interfaceName: "CDL", monthlyAnalysis: "10,288 / month", yearlyVolume: "123,450 / year" },
    { interfaceName: "Endovault", monthlyAnalysis: "8,213 / month", yearlyVolume: "98,560 / year" },
  ],
};

const SummaryInterfaces = ({ userProfile = null }) => {
  const [trusts, setTrusts] = useState([]);
  const [selectedTrust, setSelectedTrust] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTrusts = async () => {
      try {
        const res = await getTrusts();
        const trustList = filterTrustsByAccess(res.data || [], userProfile);

        setTrusts(trustList);
        if (trustList.length > 0) {
          setSelectedTrust(trustList[0].name || "");
        }
      } catch (err) {
        console.error("Error fetching trusts:", err);
        setError("Failed to load trusts.");
      } finally {
        setLoading(false);
      }
    };

    fetchTrusts();
  }, [userProfile]);

  useEffect(() => {
    if (
      selectedTrust &&
      !trusts.some((trust) => String(trust.name) === String(selectedTrust))
    ) {
      setSelectedTrust(trusts[0]?.name || "");
    }
  }, [selectedTrust, trusts]);

  const selectedInterfaces = useMemo(() => {
    return TRUST_INTERFACES[selectedTrust] || [];
  }, [selectedTrust]);

  return (
    <div className="content">
      <div className="header">
        <h2 className="title">Summary of Interfaces</h2>
      </div>

      <div className="filter-card">
        <label className="filter-label" htmlFor="trust-select">
          Select Trust
        </label>

        <select
          id="trust-select"
          className="trust-select"
          value={selectedTrust}
          onChange={(e) => setSelectedTrust(e.target.value)}
          disabled={loading || trusts.length === 0}
        >
          {trusts.length === 0 ? (
            <option value="">No trusts available</option>
          ) : (
            trusts.map((trust) => (
              <option key={trust.id} value={trust.name}>
                {trust.name}
              </option>
            ))
          )}
        </select>

        {error && <p className="status-message error-text">{error}</p>}
      </div>

      <div className="table-container">
        <table className="interfaces-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Interface Name</th>
              <th>Message Volume Per Month</th>
              <th>Message Volume Per Year</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="4" className="empty-row">Loading trusts...</td>
              </tr>
            )}

            {!loading && !selectedTrust && (
              <tr>
                <td colSpan="4" className="empty-row">
                  Select a trust to view interfaces.
                </td>
              </tr>
            )}

            {!loading && selectedTrust && selectedInterfaces.length === 0 && (
              <tr>
                <td colSpan="4" className="empty-row">
                  No hardcoded interfaces configured for {selectedTrust}.
                </td>
              </tr>
            )}

            {!loading &&
              selectedInterfaces.map((item, index) => (
                <tr key={`${item.interfaceName}-${index}`}>
                  <td>{index + 1}</td>
                  <td className="interface-name">{item.interfaceName}</td>
                  <td>{item.monthlyAnalysis}</td>
                  <td>{item.yearlyVolume}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SummaryInterfaces;
