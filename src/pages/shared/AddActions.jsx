import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  faBold,
  faItalic,
  faUnderline,
  faListOl,
  faListUl,
  faTextHeight,
  faPalette,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./AddActions.css";

const AddActions = ({ username }) => {
  const location = useLocation();
  const dateInputRef = useRef(null);
  const { interfaceId } = location.state || {};

  const issueRef = useRef(null);
  const editorRef = useRef(null);

  const [issue, setIssue] = useState("");
  const [date, setDate] = useState("");

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [fontSize, setFontSize] = useState("3");
  const [color, setColor] = useState("#000000");

  const [responseMessage, setResponseMessage] = useState("");
  const [responseType, setResponseType] = useState("success");

  const backendUrl = "https://neevapi.ddns.net/api/nim/issue/v1";

  /* ---------------- VALIDATION ---------------- */

  const getActionText = () =>
    editorRef.current?.innerText.trim() || "";

  const validateUpTo = (field) => {
    const err = {};

    if (!issue.trim()) err.issue = "Describe the issue is required";
    if (field === "issue") return setErrors(err);

    if (!getActionText())
      err.action = "Proposed action is required";
    if (field === "action") return setErrors(err);

    if (!date) err.date = "Date is required";

    setErrors(err);
  };

  const validateAll = () => {
    const err = {};

    if (!issue.trim()) err.issue = "Describe the issue is required";
    if (!getActionText())
      err.action = "Proposed action is required";
    if (!date) err.date = "Date is required";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const isFormValid =
    issue.trim() &&
    getActionText() &&
    date;

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) return;

    setLoading(true);

    const formData = {
      issue,
      action: editorRef.current.innerHTML,
      date,
      interfaceId,
      username,
    };

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setResponseMessage("Form submitted successfully.");
        setResponseType("success");
        setIssue("");
        setDate("");
        editorRef.current.innerHTML = "";
      } else {
        throw new Error();
      }
    } catch {
      setResponseMessage("Failed to submit the form.");
      setResponseType("error");
    } finally {
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* ---------------- RICH TEXT ---------------- */

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="content">
      <h2>Add Actions</h2>

      {responseMessage && (
        <div className={`response-message ${responseType}`}>
          {responseMessage}
        </div>
      )}

      <form className="form" onSubmit={handleSubmit} noValidate>
        {/* ISSUE */}
        <div className="form-group">
          <label>Describe the Issue*</label>
          <textarea
            ref={issueRef}
            value={issue}
            rows="2"
            placeholder="Enter the issue"
            className={errors.issue ? "input-invalid" : ""}
            onChange={(e) => {
              setIssue(e.target.value);
              if (errors.issue)
                setErrors((p) => ({ ...p, issue: null }));
            }}
          />
          {errors.issue && (
            <p className="input-error">{errors.issue}</p>
          )}
        </div>

        {/* ACTION */}
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
            className={`rich-editor ${
              errors.action ? "input-invalid" : ""
            }`}
            onFocus={() => validateUpTo("action")}
            onInput={() => {
              if (errors.action)
                setErrors((p) => ({ ...p, action: null }));
            }}
          />

          {errors.action && (
            <p className="input-error">{errors.action}</p>
          )}
        </div>

        {/* DATE */}
        <div className="form-group">
          <label>Date*</label>
          <input
            type="date"
            ref={dateInputRef}
            value={date}
            className={errors.date ? "input-invalid" : ""}
            onFocus={() => validateUpTo("date")}
            onChange={(e) => {
              setDate(e.target.value);
              if (errors.date)
                setErrors((p) => ({ ...p, date: null }));
            }}
          />
          {errors.date && (
            <p className="input-error">{errors.date}</p>
          )}
        </div>

        <button
          type="submit"
          className="btn"
          disabled={loading || !isFormValid}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
};

export default AddActions;
