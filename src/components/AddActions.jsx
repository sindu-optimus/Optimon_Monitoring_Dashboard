import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getTrusts } from "../api/trustService";
import { filterTrustsByAccess } from "../utils/trustAccess";
import {
  createSupportIssue,
  updateSupportIssue,
} from "../api/supportService";
import {
  extractInterfaceNamesFromMetrics,
  getMetricDetails,
} from "../api/metricsService";
import {
  faBold,
  faItalic,
  faUnderline,
  faListOl,
  faListUl,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./AddActions.css";

const EMPTY_INITIAL = {};
const REASON_OPTIONS = [
  "Planned Change Issue",
  "Upgrade Concern",
  "System Change Issue",
  "Interface Issue",
  "Planned Upgrade",
  "Others",
];

const AddActions = ({
  initial = EMPTY_INITIAL,
  onSuccess,
  onCancel,
  userProfile = null,
}) => {
  const location = useLocation();
  const { interfaceName: routeInterfaceName = "" } = location.state || {};

  const editorRef = useRef(null);

  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [trustOptions, setTrustOptions] = useState([]);
  const [selectedTrustId, setSelectedTrustId] = useState("");
  const [interfaceName, setInterfaceName] = useState("");
  const [interfaceOptions, setInterfaceOptions] = useState([]);
  const [interfaceLoading, setInterfaceLoading] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fontSize, setFontSize] = useState("3");
  const [color, setColor] = useState("#000000");

  useEffect(() => {
    let isActive = true;

    const fetchTrustOptions = async () => {
      try {
        const res = await getTrusts();
        if (!isActive) return;
        setTrustOptions(filterTrustsByAccess(res.data || [], userProfile));
      } catch (fetchError) {
        console.error("Error fetching trusts:", fetchError);
      }
    };

    fetchTrustOptions();

    return () => {
      isActive = false;
    };
  }, [userProfile]);

  useEffect(() => {
    const existingReason = (initial?.description1 ?? initial?.issue ?? "").trim();
    const matchesPresetReason = REASON_OPTIONS.find(
      (option) => option !== "Others" && option === existingReason
    );

    setSelectedTrustId(
      initial?.trust_id?.toString() ??
        initial?.trustId?.toString() ??
        ""
    );
    setInterfaceName(
      initial?.interface_name ??
        initial?.interfaceName ??
        routeInterfaceName ??
        ""
    );
    setSelectedReason(
      matchesPresetReason || (existingReason ? "Others" : "")
    );
    setCustomReason(matchesPresetReason ? "" : existingReason);
    if (editorRef.current) {
      editorRef.current.innerHTML =
        initial?.description2 ?? initial?.action ?? "";
    }
  }, [initial, routeInterfaceName]);

  useEffect(() => {
    if (trustOptions.length === 0) return;

    if (
      selectedTrustId &&
      !trustOptions.some((trust) => String(trust.id) === String(selectedTrustId))
    ) {
      setSelectedTrustId("");
    }
  }, [selectedTrustId, trustOptions]);

  useEffect(() => {
    let isActive = true;

    const loadInterfaceOptions = async () => {
      if (!selectedTrustId) {
        setInterfaceOptions(
          routeInterfaceName ? [routeInterfaceName] : []
        );
        setInterfaceLoading(false);
        return;
      }

      try {
        setInterfaceLoading(true);
        const metricsData = await getMetricDetails(selectedTrustId);
        if (!isActive) return;

        const fetchedInterfaceNames =
          extractInterfaceNamesFromMetrics(metricsData);
        const combinedOptions = Array.from(
          new Set(
            [
              ...fetchedInterfaceNames,
              routeInterfaceName,
              initial?.interface_name,
              initial?.interfaceName,
            ].filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));

        setInterfaceOptions(combinedOptions);
      } catch (fetchError) {
        if (!isActive) return;
        console.error("Error fetching interface names:", fetchError);
        setInterfaceOptions(
          [routeInterfaceName, initial?.interface_name, initial?.interfaceName]
            .filter(Boolean)
            .filter((value, index, arr) => arr.indexOf(value) === index)
        );
      } finally {
        if (isActive) {
          setInterfaceLoading(false);
        }
      }
    };

    loadInterfaceOptions();

    return () => {
      isActive = false;
    };
  }, [
    initial?.interfaceName,
    initial?.interface_name,
    routeInterfaceName,
    selectedTrustId,
  ]);

  useEffect(() => {
    if (!interfaceName) return;
    if (interfaceOptions.includes(interfaceName)) return;

    setInterfaceName("");
  }, [interfaceName, interfaceOptions]);

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const getActionText = () => editorRef.current?.innerText.trim() || "";
  const getReasonValue = () =>
    selectedReason === "Others" ? customReason.trim() : selectedReason.trim();

  const validateUpTo = (field) => {
    const err = {};

    if (!selectedTrustId) err.trustId = "Trust name is required";
    if (field === "trustId") return setErrors(err);

    if (!interfaceName.trim()) {
      err.interfaceName = "Interface name is required";
    }
    if (field === "interfaceName") return setErrors(err);

    if (!getReasonValue()) err.issue = "Describe the reason is required";
    if (selectedReason === "Others" && customReason.trim().length > 20) {
      err.issue = "Other reason must be 20 characters or less";
    }
    if (field === "issue") return setErrors(err);

    if (!getActionText()) {
      err.action = "Proposed action is required";
    }
    if (field === "action") return setErrors(err);

    setErrors(err);
  };

  const validateAll = () => {
    const err = {};

    if (!selectedTrustId) err.trustId = "Trust name is required";
    if (!interfaceName.trim()) {
      err.interfaceName = "Interface name is required";
    }
    if (!getReasonValue()) err.issue = "Describe the reason is required";
    if (selectedReason === "Others" && customReason.trim().length > 20) {
      err.issue = "Other reason must be 20 characters or less";
    }
    if (!getActionText()) {
      err.action = "Proposed action is required";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const isFormValid =
    selectedTrustId &&
    interfaceName.trim() &&
    getReasonValue() &&
    (selectedReason !== "Others" || customReason.trim().length <= 20) &&
    getActionText();

  const resetForm = () => {
    setSelectedTrustId("");
    setInterfaceName("");
    setSelectedReason("");
    setCustomReason("");
    setErrors({});
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!validateAll()) return;

    setLoading(true);

    const reasonValue = getReasonValue();

    const basePayload = {
      description1: reasonValue,
      description2: editorRef.current.innerHTML,
      interface_name: interfaceName.trim(),
      trust_id: Number(selectedTrustId),
    };

    try {
      if (initial?.id || initial?.supportIssueId) {
        const id = initial.id ?? initial.supportIssueId;
        const updatePayload = {
          id,
          createdOn:
            initial?.createdOn ??
            initial?.created_at ??
            initial?.createdAt ??
            null,
          updatedOn:
            initial?.updatedOn ??
            initial?.updated_at ??
            initial?.updatedAt ??
            null,
          description1: reasonValue,
          description2: editorRef.current.innerHTML,
          finalConclusion:
            initial?.finalConclusion ??
            initial?.final_conclusion ??
            "",
          interfaceName: interfaceName.trim(),
          isDeleted: Boolean(initial?.isDeleted),
          trust_id: Number(selectedTrustId),
        };

        console.log("Support issue update payload:", updatePayload);
        await updateSupportIssue(id, updatePayload);
        setSuccess("Action updated successfully");
      } else {
        console.log("Support issue create payload:", basePayload);
        await createSupportIssue(basePayload);
        setSuccess("Action created successfully");
      }

      if (typeof onSuccess === "function") {
        onSuccess();
      }

      resetForm();
    } catch (submitError) {
      console.error("Support issue save failed:", submitError);
      console.error("Support issue save response:", submitError.response?.data);
      setError(
        submitError.response?.data?.message ||
          submitError.response?.data?.error ||
          submitError.response?.data ||
          "Failed to save the action"
      );
    } finally {
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  return (
    <div className="content">
      <h2 className="form-title">
        {initial?.id || initial?.supportIssueId ? "Edit Action" : "Add Action"}
      </h2>

      <div className="actions-form-actions">
        <div className="icon-btn" onClick={onCancel}>
          <i className="fa-solid fa-less-than"></i>
        </div>
        
        <button
          type="button"
          className="actions-list-btn"
          onClick={onCancel}
        >
          List of Actions
        </button>
      </div>

      {error && <div className="form-msg form-error">{error}</div>}
      {success && <div className="form-msg form-success">{success}</div>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label>Trust Name*</label>
          <select
            value={selectedTrustId}
            className={`form-select ${errors.trustId ? "input-invalid" : ""}`}
            onFocus={() => validateUpTo("trustId")}
            onChange={(e) => {
              setSelectedTrustId(e.target.value);
              if (errors.trustId) {
                setErrors((prev) => ({ ...prev, trustId: null }));
              }
            }}
          >
            <option value="">Select trust</option>
            {trustOptions.map((trust) => (
              <option key={trust.id} value={trust.id}>
                {trust.name}
              </option>
            ))}
          </select>
          {errors.trustId && <p className="input-error">{errors.trustId}</p>}
        </div>

        <div className="form-group">
          <label>Interface Name*</label>
          <select
            value={interfaceName}
            className={`form-select ${errors.interfaceName ? "input-invalid" : ""}`}
            onFocus={() => validateUpTo("interfaceName")}
            onChange={(e) => {
              setInterfaceName(e.target.value);
              if (errors.interfaceName) {
                setErrors((prev) => ({ ...prev, interfaceName: null }));
              }
            }}
            disabled={interfaceLoading || interfaceOptions.length === 0}
          >
            <option value="">
              {interfaceLoading
                ? "Loading interface names..."
                : "Select interface name"}
            </option>
            {interfaceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.interfaceName && (
            <p className="input-error">{errors.interfaceName}</p>
          )}
        </div>

        <div className="form-group">
          <label>Reason*</label>
          <select
            value={selectedReason}
            className={`form-select ${errors.issue ? "input-invalid" : ""}`}
            onFocus={() => validateUpTo("issue")}
            onChange={(e) => {
              const nextReason = e.target.value;
              setSelectedReason(nextReason);
              if (errors.issue) {
                setErrors((prev) => ({ ...prev, issue: null }));
              }
            }}
          >
            <option value="">Select reason</option>
            {REASON_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          {selectedReason === "Others" && (
            <input
              type="text"
              value={customReason}
              maxLength="20"
              placeholder="Enter other reason"
              className={errors.issue ? "input-invalid" : ""}
              onFocus={() => validateUpTo("issue")}
              onChange={(e) => {
                const nextCustomReason = e.target.value.slice(0, 20);
                setCustomReason(nextCustomReason);
                if (errors.issue) {
                  setErrors((prev) => ({ ...prev, issue: null }));
                }
              }}
            />
          )}
          {errors.issue && <p className="input-error">{errors.issue}</p>}
        </div>

        <div className="form-group">
          <label>Proposed Action*</label>

          <div className="toolbar">
            <button type="button" onClick={() => handleFormat("bold")}>
              <FontAwesomeIcon icon={faBold} />
            </button>
            <button type="button" onClick={() => handleFormat("italic")}>
              <FontAwesomeIcon icon={faItalic} />
            </button>
            <button type="button" onClick={() => handleFormat("underline")}>
              <FontAwesomeIcon icon={faUnderline} />
            </button>
            <button type="button" onClick={() => handleFormat("insertOrderedList")}>
              <FontAwesomeIcon icon={faListOl} />
            </button>
            <button type="button" onClick={() => handleFormat("insertUnorderedList")}>
              <FontAwesomeIcon icon={faListUl} />
            </button>

            <select
              value={fontSize}
              onChange={(e) => {
                setFontSize(e.target.value);
                handleFormat("fontSize", e.target.value);
              }}
            >
              <option value="1">Small</option>
              <option value="3">Medium</option>
              <option value="5">Large</option>
              <option value="7">Extra Large</option>
            </select>

            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                handleFormat("foreColor", e.target.value);
              }}
            />
          </div>

          <div
            ref={editorRef}
            contentEditable
            className={`rich-editor ${errors.action ? "input-invalid" : ""}`}
            onFocus={() => validateUpTo("action")}
            onInput={() => {
              if (errors.action) {
                setErrors((prev) => ({ ...prev, action: null }));
              }
            }}
          />

          {errors.action && <p className="input-error">{errors.action}</p>}
        </div>

        <button
          type="submit"
          className="btn"
          disabled={loading || !isFormValid}
        >
          {loading ? "Saving..." : "Submit"}
        </button>
      </form>
    </div>
  );
};

export default AddActions;
