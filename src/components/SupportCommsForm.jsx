import React, { useEffect, useState } from "react";
import { getTrusts } from "../api/trustService";
import { filterTrustsByAccess } from "../utils/trustAccess";
import {
  getCriticalInboundReceivers,
  getCriticalInterfaces,
} from "../api/criticalInterfacesService";
import "./AddActions.css";
import "./SupportCommsForm.css";

const EMPTY_INITIAL = {};
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s]+$/;
const DIRECTION_OPTIONS = {
  OUTBOUND: "OUTBOUND",
  INBOUND: "INBOUND",
};
const VALIDATION_ORDER = [
  "trustId",
  "direction",
  "interfaceName",
  "originatingSystemDepartment",
  "supportContactName",
  "supportEmails",
  "telephoneMobile",
];

const getListFromApiResponse = (response) => {
  const data = response?.data ?? response;
  const list =
    data?.data ??
    data?.content ??
    data?.items ??
    data?.criticalInterfaces ??
    data?.criticalInterfaceList ??
    data;

  return Array.isArray(list) ? list : [];
};

const getInterfaceId = (item, fallbackId) =>
  item?.id ??
  item?.interfaceId ??
  item?.interface_id ??
  item?.criticalInterfaceId ??
  item?.inboundReceiverId ??
  fallbackId;

const getInterfaceName = (item, selectedType) => {
  if (selectedType === DIRECTION_OPTIONS.INBOUND) {
    return (
      item?.serviceName ??
      item?.interfaceName ??
      item?.interface_name ??
      item?.name ??
      ""
    );
  }

  return (
    item?.endpointName ??
    item?.interfaceName ??
    item?.interface_name ??
    item?.queueName ??
    item?.serviceName ??
    item?.name ??
    ""
  );
};

const normalizeEmails = (emails) => {
  if (Array.isArray(emails)) {
    return emails
      .map((email) => String(email).trim())
      .filter(Boolean);
  }

  if (typeof emails === "string") {
    return emails
      .split(/[,\n;]+/)
      .map((email) => email.trim())
      .filter(Boolean);
  }

  return [];
};

const parseEmailsFromInput = (value) =>
  String(value ?? "")
    .split(/[,\n;]+/)
    .map((email) => email.trim())
    .filter(Boolean);

const toInputString = (value) =>
  value === undefined || value === null || value === "-" ? "" : String(value);

const validateFieldValue = (field, value) => {
  const stringValue = toInputString(value);

  switch (field) {
    case "trustId":
      return stringValue ? "" : "Trust name is required";
    case "direction":
      return stringValue ? "" : "Direction is required";
    case "interfaceName":
      return stringValue ? "" : "Interface name is required";
    case "originatingSystemDepartment":
      if (!stringValue.trim()) return "Department is required";
      if (stringValue.trim().length < 2) return "Department must be at least 2 characters";
      if (stringValue.trim().length > 100) return "Department must be 100 characters or less";
      return "";
    case "supportContactName":
      if (!stringValue.trim()) return "";
      if (stringValue.trim().length > 100) return "Support contact name must be 100 characters or less";
      return "";
    case "telephoneMobile":
      if (!stringValue.trim()) return "";
      if (
        stringValue
          .split(",")
          .map((phoneNumber) => phoneNumber.trim())
          .filter(Boolean)
          .some((phoneNumber) => !PHONE_REGEX.test(phoneNumber))
      ) {
        return "Enter digits and spaces only, separated by commas";
      }
      return "";
    default:
      return "";
  }
};

export default function SupportCommsForm({
  initial = EMPTY_INITIAL,
  onSuccess,
  onCancel,
  userProfile = null,
  disableIdentityFields = false,
  trusts = [],
}) {
  const [trustOptions, setTrustOptions] = useState([]);
  const [selectedTrustId, setSelectedTrustId] = useState("");
  const [selectedDirection, setSelectedDirection] = useState("");
  const [selectedInterfaceId, setSelectedInterfaceId] = useState("");
  const [interfaceName, setInterfaceName] = useState("");
  const [interfaceOptions, setInterfaceOptions] = useState([]);
  const [originatingSystemDepartment, setOriginatingSystemDepartment] =
    useState("");
  const [supportContactName, setSupportContactName] = useState("");
  const [telephoneMobile, setTelephoneMobile] = useState("");
  const [supportEmails, setSupportEmails] = useState([]);
  const [supportEmailInput, setSupportEmailInput] = useState("");
  const [interfaceLoading, setInterfaceLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (trusts.length > 0) {
      setTrustOptions(trusts);
      return;
    }

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
  }, [trusts, userProfile]);

  useEffect(() => {
    setSelectedTrustId(
      initial?.trustId?.toString() ?? initial?.trust_id?.toString() ?? ""
    );
    setSelectedDirection(
      initial?.type ??
        initial?.direction ??
        initial?.selectedDirection ??
        initial?.selectedType ??
        (initial?.interfaceName ?? initial?.interface_name
          ? DIRECTION_OPTIONS.OUTBOUND
          : "")
    );
    setSelectedInterfaceId(
      initial?.interfaceId?.toString() ??
        initial?.interface_id?.toString() ??
        initial?.criticalInterfaceId?.toString() ??
        ""
    );
    setInterfaceName(toInputString(initial?.interfaceName ?? initial?.interface_name));
    setOriginatingSystemDepartment(
      toInputString(
        initial?.originatingSystemDepartment ??
          initial?.originatingDepartment ??
          initial?.originatingSystem
      )
    );
    setSupportContactName(toInputString(initial?.supportContactName));
    setTelephoneMobile(
      toInputString(initial?.telephoneMobile ?? initial?.telephone ?? initial?.mobile)
    );
    setSupportEmails(normalizeEmails(initial?.supportEmails));
    setSupportEmailInput("");
    setErrors({});
    setError("");
  }, [initial]);

  useEffect(() => {
    let isActive = true;

    const loadInterfaceOptions = async () => {
      if (!selectedTrustId || !selectedDirection) {
        setInterfaceOptions(
          [initial]
            .filter(
              (item) =>
                item?.interfaceName || item?.interface_name || item?.interfaceId
            )
            .map((item) => ({
              id: String(
                item?.interfaceId ??
                  item?.interface_id ??
                  item?.criticalInterfaceId ??
                  item?.interfaceName ??
                  item?.interface_name
              ),
              name: item?.interfaceName ?? item?.interface_name ?? "",
            }))
        );
        setInterfaceLoading(false);
        return;
      }

      try {
        setInterfaceLoading(true);
        const response =
          selectedDirection === DIRECTION_OPTIONS.INBOUND
            ? await getCriticalInboundReceivers({
                trustId: selectedTrustId,
              })
            : await getCriticalInterfaces({
                trustId: selectedTrustId,
              });
        if (!isActive) return;

        const fetchedInterfaceOptions = getListFromApiResponse(response)
          .map((item, index) => ({
            id: String(getInterfaceId(item, `${selectedDirection}-${index}`)),
            name: getInterfaceName(item, selectedDirection).trim(),
          }))
          .filter((item) => item.name);
        const combinedOptions = Array.from(
          new Set(
            [
              ...fetchedInterfaceOptions.map((item) => JSON.stringify(item)),
              initial?.interfaceName || initial?.interface_name
                ? JSON.stringify({
                    id: String(
                      initial?.interfaceId ??
                        initial?.interface_id ??
                        initial?.criticalInterfaceId ??
                        initial?.interfaceName ??
                        initial?.interface_name
                    ),
                    name: initial?.interfaceName ?? initial?.interface_name ?? "",
                  })
                : null,
            ].filter(Boolean)
          )
        )
          .map((item) => JSON.parse(item))
          .sort((a, b) => a.name.localeCompare(b.name));

        setInterfaceOptions(combinedOptions);
      } catch (fetchError) {
        if (!isActive) return;
        console.error("Error fetching interface names:", fetchError);
        setInterfaceOptions(
          [initial]
            .filter(
              (item) =>
                item?.interfaceName || item?.interface_name || item?.interfaceId
            )
            .map((item) => ({
              id: String(
                item?.interfaceId ??
                  item?.interface_id ??
                  item?.criticalInterfaceId ??
                  item?.interfaceName ??
                  item?.interface_name
              ),
              name: item?.interfaceName ?? item?.interface_name ?? "",
            }))
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
    selectedTrustId,
    selectedDirection,
  ]);

  const getAllSupportEmails = () => {
    const nextEmails = [...supportEmails];

    parseEmailsFromInput(supportEmailInput).forEach((email) => {
      if (!nextEmails.some((item) => item.toLowerCase() === email.toLowerCase())) {
        nextEmails.push(email);
      }
    });

    return nextEmails;
  };

  const getFieldError = (field) => {
    switch (field) {
      case "supportEmails": {
        const parsedEmails = getAllSupportEmails();
        if (!parsedEmails.length) {
          return "At least one support email is required";
        }
        if (parsedEmails.some((email) => !EMAIL_REGEX.test(email))) {
          return "Enter email in this format: someone@example.com";
        }
        return "";
      }
      default:
        return validateFieldValue(field, {
          trustId: selectedTrustId,
          direction: selectedDirection,
          interfaceName: selectedInterfaceId || toInputString(interfaceName).trim(),
          originatingSystemDepartment,
          supportContactName,
          telephoneMobile,
        }[field] ?? "");
    }
  };

  const validateField = (field) => {
    const message = getFieldError(field);

    setErrors((prev) => ({
      ...prev,
      [field]: message || null,
    }));

    return !message;
  };

  const validateUpTo = (field) => {
    const nextErrors = {};
    const targetIndex = VALIDATION_ORDER.indexOf(field);
    const lastIndex =
      targetIndex === -1 ? VALIDATION_ORDER.length - 1 : targetIndex;

    VALIDATION_ORDER.slice(0, lastIndex + 1).forEach((fieldName) => {
      const message = getFieldError(fieldName);
      if (message) {
        nextErrors[fieldName] = message;
      }
    });

    setErrors((prev) => ({
      ...prev,
      ...nextErrors,
    }));

    return Object.keys(nextErrors).length === 0;
  };

  const validateAll = () => {
    const nextErrors = {};

    VALIDATION_ORDER.forEach((field) => {
      const message = getFieldError(field);
      if (message) {
        nextErrors[field] = message;
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const commitSupportEmails = (value) => {
    const parsedEmails = parseEmailsFromInput(value);

    if (!parsedEmails.length) {
      return false;
    }

    setSupportEmails((prev) => {
      const nextEmails = [...prev];

      parsedEmails.forEach((email) => {
        if (!nextEmails.some((item) => item.toLowerCase() === email.toLowerCase())) {
          nextEmails.push(email);
        }
      });

      return nextEmails;
    });
    setSupportEmailInput("");
    clearFieldError("supportEmails");
    return true;
  };

  const isFormValid =
    selectedTrustId &&
    selectedDirection &&
    selectedInterfaceId &&
    interfaceName.trim() &&
    !validateFieldValue("originatingSystemDepartment", originatingSystemDepartment) &&
    !validateFieldValue("supportContactName", supportContactName) &&
    !getFieldError("telephoneMobile") &&
    getAllSupportEmails().length > 0 &&
    getAllSupportEmails().every((email) => EMAIL_REGEX.test(email));

  const clearFieldError = (field) => {
    if (!errors[field]) return;

    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const finalSupportEmails = getAllSupportEmails();

    if (supportEmailInput.trim()) {
      setSupportEmails(finalSupportEmails);
      setSupportEmailInput("");
    }

    if (!validateAll()) return;

    setLoading(true);

    try {
      const payload = {
        direction: selectedDirection, 
        email: finalSupportEmails.join(", "),
        interfaceId: Number(selectedInterfaceId) || 0,
        originatingSystem: originatingSystemDepartment.trim(),
        supportName: supportContactName.trim(),
        telephone: telephoneMobile
          .split(",")
          .map((phoneNumber) => phoneNumber.trim())
          .filter(Boolean)
          .join(", "),
      };

      console.log("EmailListForm post payload:", payload);

      if (typeof onSuccess === "function") {
        await onSuccess(payload);
      }
    } catch (submitError) {
      console.error("Failed to save email item:", submitError);
      setError("Failed to save the email item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <h2 className="form-title">
        {initial?.id ? "Support Email Form" : "Add Support Email"}
      </h2>

      <div className="actions-form-actions">
        <div className="icon-btn" onClick={onCancel}>
          <i className="fa-solid fa-less-than"></i>
        </div>

        <button type="button" className="actions-list-btn" onClick={onCancel}>
          Support Comms
        </button>
      </div>

      {error && <div className="form-msg form-error">{error}</div>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label>Trust Name*</label>
          <select
            value={selectedTrustId}
            className={`form-select ${errors.trustId ? "input-invalid" : ""}`}
            onChange={(e) => {
              setSelectedTrustId(e.target.value);
              setSelectedDirection("");
              setSelectedInterfaceId("");
              setInterfaceName("");
              clearFieldError("trustId");
            }}
            onFocus={() => validateUpTo("trustId")}
            onBlur={() => validateField("trustId")}
            disabled={disableIdentityFields}
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
          <label>Direction*</label>
          <select
            value={selectedDirection}
            className={`form-select ${errors.direction ? "input-invalid" : ""}`}
            onChange={(e) => {
              setSelectedDirection(e.target.value);
              setSelectedInterfaceId("");
              setInterfaceName("");
              clearFieldError("direction");
            }}
            onFocus={() => validateUpTo("direction")}
            onBlur={() => validateField("direction")}
            disabled={disableIdentityFields || !selectedTrustId}
          >
            <option value="">
              {selectedTrustId ? "Select direction" : "Select trust first"}
            </option>
            <option value={DIRECTION_OPTIONS.OUTBOUND}>OUTBOUND</option>
            <option value={DIRECTION_OPTIONS.INBOUND}>INBOUND</option>
          </select>
          {errors.direction && <p className="input-error">{errors.direction}</p>}
        </div>

        <div className="form-group">
          <label>Interface Name*</label>
          <select
            value={selectedInterfaceId}
            className={`form-select ${errors.interfaceName ? "input-invalid" : ""}`}
            onChange={(e) => {
              const selectedOption = interfaceOptions.find(
                (option) => String(option.id) === e.target.value
              );
              setSelectedInterfaceId(e.target.value);
              setInterfaceName(selectedOption?.name ?? "");
              clearFieldError("interfaceName");
            }}
            onFocus={() => validateUpTo("interfaceName")}
            onBlur={() => validateField("interfaceName")}
            disabled={
              disableIdentityFields ||
              !selectedDirection ||
              interfaceLoading ||
              interfaceOptions.length === 0
            }
          >
            <option value="">
              {!selectedTrustId || !selectedDirection
                ? "Select trust and direction first"
                : interfaceLoading
                ? "Loading interface names..."
                : "Select interface name"}
            </option>
            {interfaceOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          {errors.interfaceName && (
            <p className="input-error">{errors.interfaceName}</p>
          )}
        </div>

        <div className="form-group">
          <label>Originating System/Department</label>
          <input
            type="text"
            value={originatingSystemDepartment}
            className={`form-input ${errors.originatingSystemDepartment ? "input-invalid" : ""}`}
            onChange={(e) => {
              setOriginatingSystemDepartment(e.target.value);
              clearFieldError("originatingSystemDepartment");
            }}
            onFocus={() => validateUpTo("originatingSystemDepartment")}
            onBlur={() => validateField("originatingSystemDepartment")}
          />
          {errors.originatingSystemDepartment && (
            <p className="input-error">{errors.originatingSystemDepartment}</p>
          )}
        </div>

        <div className="form-group">
          <label>Support Contact Name</label>
          <input
            type="text"
            value={supportContactName}
            className={`form-input ${errors.supportContactName ? "input-invalid" : ""}`}
            onChange={(e) => {
              setSupportContactName(e.target.value);
              clearFieldError("supportContactName");
            }}
            onFocus={() => validateUpTo("supportContactName")}
            onBlur={() => validateField("supportContactName")}
          />
          {errors.supportContactName && (
            <p className="input-error">{errors.supportContactName}</p>
          )}
        </div>

        <div className="form-group">
          <label>Support Emails*</label>
          <div
            className={`email-chip-input ${errors.supportEmails ? "input-invalid" : ""}`}
            onClick={() => {
              const input = document.getElementById("support-emails-input");
              input?.focus();
            }}
          >
            {supportEmails.map((email) => (
              <span key={email.toLowerCase()} className="selected-email">
                {email}
                <button
                  type="button"
                  aria-label={`Remove ${email}`}
                  onClick={() => {
                    setSupportEmails((prev) =>
                      prev.filter((item) => item.toLowerCase() !== email.toLowerCase())
                    );
                  }}
                >
                  x
                </button>
              </span>
            ))}
            <input
              id="support-emails-input"
              type="text"
              value={supportEmailInput}
              className="email-chip-text-input"
              placeholder={
                supportEmails.length
                  ? "Type another email"
                  : "Type email and press Enter"
              }
              onChange={(e) => {
                setSupportEmailInput(e.target.value);
                clearFieldError("supportEmails");
              }}
              onFocus={() => validateUpTo("supportEmails")}
              onKeyDown={(e) => {
                if (["Enter", "Tab", ","].includes(e.key)) {
                  const didCommit = commitSupportEmails(supportEmailInput);

                  if (didCommit || e.key !== "Tab") {
                    e.preventDefault();
                  }
                }

                if (
                  e.key === "Backspace" &&
                  !supportEmailInput &&
                  supportEmails.length > 0
                ) {
                  e.preventDefault();
                  setSupportEmails((prev) => prev.slice(0, -1));
                }
              }}
              onBlur={() => {
                commitSupportEmails(supportEmailInput);
                validateField("supportEmails");
              }}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData("text");

                if (/[,\n;]/.test(pastedText)) {
                  e.preventDefault();
                  commitSupportEmails(pastedText);
                }
              }}
            />
          </div>
          <p className="email-form-help">
            Press `Enter`, `Tab`, or comma to add each email address.
          </p>
          {errors.supportEmails && (
            <p className="input-error">{errors.supportEmails}</p>
          )}
        </div>

        <div className="form-group">
          <label>Telephone/Mobile</label>
          <input
            type="text"
            value={telephoneMobile}
            className={`form-input ${errors.telephoneMobile ? "input-invalid" : ""}`}
            onChange={(e) => {
              setTelephoneMobile(e.target.value.replace(/[^\d,\s]/g, ""));
              clearFieldError("telephoneMobile");
            }}
            onFocus={() => validateUpTo("telephoneMobile")}
            onBlur={() => validateField("telephoneMobile")}
            inputMode="numeric"
          />
          {errors.telephoneMobile && (
            <p className="input-error">{errors.telephoneMobile}</p>
          )}
        </div>

        <button type="submit" className="btn" disabled={loading || !isFormValid}>
          {loading ? "Saving..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
