import React, { useState } from "react";
import { api } from "../services/api";

const SAMPLE_CSV = `destination_url,custom_alias,campaign,click_limit,expires_at,password
https://example.com/product-launch,launch-2026,Q4 Product Launch,500,2027-12-31,
https://example.com/pricing-plan,pricing-pro,Newsletter & Social Growth,300,,
invalid-url-row,broken-alias,Q4 Product Launch,,,
https://example.com/duplicate,launch-2026,Q4 Product Launch,,,`;

export default function BulkImportView({ onImportSuccess }) {
  const [preview, setPreview] = useState(null);
  const [filterMode, setFilterMode] = useState("all");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setImportResult(null);
    setLoading(true);
    try {
      const data = await api.previewCsv(file);
      setPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "linkpulse-sample-import.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAccepted = async () => {
    if (!preview) return;
    const acceptedRows = preview.rows.filter((r) => r.is_valid);
    if (acceptedRows.length === 0) return;

    setImporting(true);
    setError("");
    try {
      const res = await api.commitBulkImport(acceptedRows);
      setImportResult(res);
      setPreview(null);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const filteredRows =
    preview?.rows.filter((r) => {
      if (filterMode === "valid") return r.status === "valid";
      if (filterMode === "error") return r.status === "error";
      if (filterMode === "duplicate") return r.status === "duplicate";
      return true;
    }) || [];

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2>Bulk CSV Link Import</h2>
          <p className="muted-text">
            Upload CSV files, preview valid rows, highlight errors and duplicates, and import accepted rows.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleDownloadSample}>
            Download Sample CSV
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {importResult && (
        <div className="panel success-banner">
          <h3>Bulk Import Complete!</h3>
          <p>
            Imported <strong>{importResult.imported_count}</strong> valid short links.
          </p>
        </div>
      )}

      <div className="panel upload-dropzone">
        <input
          type="file"
          accept=".csv"
          id="csv-file-input"
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />
        <label htmlFor="csv-file-input" className="upload-label">
          <div className="upload-title">
            {loading ? "Validating CSV rows..." : "Click to Upload CSV File"}
          </div>
          <div className="muted-text">
            Columns: <code>destination_url, custom_alias, campaign, click_limit, expires_at, password</code>
          </div>
        </label>
      </div>

      {preview && (
        <div className="panel">
          <div className="panel-header-row">
            <div className="row-actions">
              <button
                className={`btn-xs ${filterMode === "all" ? "btn-xs-primary" : ""}`}
                onClick={() => setFilterMode("all")}
              >
                All ({preview.total_rows})
              </button>
              <button
                className={`btn-xs ${filterMode === "valid" ? "btn-xs-primary" : ""}`}
                onClick={() => setFilterMode("valid")}
              >
                Valid ({preview.valid_rows})
              </button>
              <button
                className={`btn-xs ${filterMode === "duplicate" ? "btn-xs-primary" : ""}`}
                onClick={() => setFilterMode("duplicate")}
              >
                Duplicates ({preview.duplicate_rows})
              </button>
              <button
                className={`btn-xs ${filterMode === "error" ? "btn-xs-primary" : ""}`}
                onClick={() => setFilterMode("error")}
              >
                Errors ({preview.error_rows})
              </button>
            </div>

            <button
              className="btn btn-primary"
              disabled={preview.valid_rows === 0 || importing}
              onClick={handleImportAccepted}
            >
              {importing ? "Importing..." : `Import ${preview.valid_rows} Accepted Row(s)`}
            </button>
          </div>

          <div className="table-responsive" style={{ marginTop: "1rem" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row #</th>
                  <th>Status</th>
                  <th>Destination URL</th>
                  <th>Custom Alias</th>
                  <th>Campaign</th>
                  <th>Validation Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.row_number}
                    className={
                      row.status === "error"
                        ? "row-error"
                        : row.status === "duplicate"
                        ? "row-duplicate"
                        : "row-valid"
                    }
                  >
                    <td>#{row.row_number}</td>
                    <td>
                      <span
                        className={`badge ${
                          row.status === "valid"
                            ? "badge-success"
                            : row.status === "duplicate"
                            ? "badge-warning"
                            : "badge-danger"
                        }`}
                      >
                        {row.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ maxWidth: "260px", wordBreak: "break-all" }}>
                      {row.destination_url || "—"}
                    </td>
                    <td>
                      <code>{row.custom_alias || "(auto)"}</code>
                    </td>
                    <td>{row.campaign_name || "—"}</td>
                    <td>
                      {row.errors.length > 0 ? (
                        <ul className="error-list">
                          {row.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-emerald">Accepted & Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}