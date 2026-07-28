import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import TrustForm from "../../components/TrustForm";
import SearchBar from "../../components/SearchBar";
import { getTrusts, deleteTrust } from "../../api/trustService";
import "./AddTrust.css";

export default function AddTrust() {
  const [showForm, setShowForm] = useState(false);
  const [trusts, setTrusts] = useState([]);
  const [editingTrust, setEditingTrust] = useState(null);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    fetchTrusts();
  }, []);

  const fetchTrusts = async () => {
    try {
      const res = await getTrusts();
      setTrusts(res.data);
    } catch (error) {
      console.error("Error fetching trusts:", error);
    }
  };

  const handleSuccess = () => {
    setEditingTrust(null);
    setShowForm(false);
    fetchTrusts();
  };

  const handleEdit = (trust) => {
    setEditingTrust(trust);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this trust?")) return;

    try {
      await deleteTrust(id);
      fetchTrusts();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const filteredTrusts = useMemo(() => {
    const searchText = searchValue.trim().toLowerCase();

    if (!searchText) return trusts;

    return trusts.filter((trust) =>
      [trust?.name, trust?.description, trust?.isEnabled ? "active yes" : "inactive no"]
        .join(" ")
        .toLowerCase()
        .includes(searchText)
    );
  }, [searchValue, trusts]);

  const downloadExcelFile = () => {
    if (!filteredTrusts.length) return;

    const workbookRows = [
      ["S.No", "Trust Name", "Description", "Status"],
      ...filteredTrusts.map((trust, index) => [
        index + 1,
        trust.name || "-",
        trust.description || "-",
        trust.isEnabled ? "YES" : "NO",
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(workbookRows);
    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 24 },
      { wch: 42 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trusts");
    XLSX.writeFile(workbook, "trusts-list.xlsx");
  };

  if (showForm) {
    return (
      <TrustForm
        initial={editingTrust || {}}
        onSuccess={handleSuccess}
        onCancel={() => {
          setEditingTrust(null);
          setShowForm(false);
        }}
      />
    );
  }

  return (
    <div className="content">
      <div className="trust-header">
        <h2>Trusts List</h2>
      </div>

      <div className="trust-toolbar">
        <SearchBar
          className="trust-search"
          label="Search"
          value={searchValue}
          onChange={setSearchValue}
          placeholder="Search trusts..."
        />
        <div className="trustForm-actions">
        <button
          type="button"
          className="download-trust-btn"
          onClick={downloadExcelFile}
          disabled={filteredTrusts.length === 0}
        >
          <i className="ri-file-excel-2-line" aria-hidden="true"></i>
          Download Excel
        </button>

        <button
          className="add-btn"
          onClick={() => {
            setEditingTrust(null);
            setShowForm(true);
          }}
        >
          Add Trust
        </button>
        </div>
      </div>

      <div className="trust-table-wrap">
        <table className="trust-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Trust Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredTrusts.length === 0 ? (
              <tr>
                <td colSpan="5" className="trust-empty">
                  No trusts found
                </td>
              </tr>
            ) : (
              filteredTrusts.map((trust, index) => (
                <tr key={trust.id}>
                  <td>{index + 1}</td>
                  <td>{trust.name}</td>
                  <td>{trust.description || "-"}</td>
                  <td>{trust.isEnabled ? "Active" : "Inactive"}</td>
                  <td>
                    <div className="trust-action-buttons">
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(trust)}
                        title="Edit Trust"
                      >
                        <i className="ri-pencil-line"></i>
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(trust.id)}
                        title="Delete Trust"
                      >
                        <i className="ri-delete-bin-6-line"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
