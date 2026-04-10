import React, { useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { saveAs } from "file-saver";
import "./App.css";
 
const BankStatementUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [bankCode, setBankCode] = useState("");
  const [transactionType, setTransactionType] = useState("");
 
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };
 
  // Read Excel file
  const processExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
 
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: false });
 
        const allSheetData = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
 
          // Debug: Log available column names from Excel
          if (jsonData.length > 0) {
            const columnNames = Object.keys(jsonData[0]);
            console.log(`Sheet "${sheetName}" columns:`, columnNames);
            console.log(`Sheet "${sheetName}" first row raw data:`, jsonData[0]);
 
            // Check for date-related columns
            const dateColumns = columnNames.filter(col =>
              col.toLowerCase().includes('date') || col.toLowerCase().includes('txn')
            );
            console.log(`Date-related columns found:`, dateColumns);
          }
 
          return jsonData;
        });
 
        const flatData = allSheetData.flat();
        console.log('Total rows read from Excel:', flatData.length);
        resolve(flatData);
      };
 
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };
 
  const processBankStatement = async (rows) => {
    try {
      rows = rows.map((row, index) => {
        return {
          SerialNumber: row["S/N"] != null ? String(row["S/N"]) : "",
          TxnDate: row["Txn Date"] != null ? String(row["Txn Date"]) : "",
          ValueDate: row["Val. Date"] != null ? String(row["Val. Date"]) : "",
          Narration: row["Narration"] != null ? String(row["Narration"]) : "",
          RefNo: row["Ref. No"] != null ? String(row["Ref. No"]) : "",
          Debit: row["Debit"] != null ? String(row["Debit"]) : "",
          Credit: row["Credit"] != null ? String(row["Credit"]) : "",
          DrErp: row["DR ERP"] != null ? String(row["DR ERP"]) : "",
          CrErp: row["CR ERP"] != null ? String(row["CR ERP"]) : "",
          Balance: row["Balance"] != null ? String(row["Balance"]) : "",
          Comments: row["Comments"] != null ? String(row["Comments"]) : "",
        };
      })
 
      const payload = rows;
 
      console.log('Total rows being sent:', payload.length);
      console.log('Sample payload (first 3 rows):', JSON.stringify(payload.slice(0, 3), null, 2));
 
      // Build query parameters
      const params = {};
      if (bankCode) params.bankCode = bankCode;
      if (transactionType) params.transactionType = transactionType;
 
      const response = await axios.post(
        "https://localhost:7050/api/BankStatement/process",
        payload,
        {
          params,
          responseType: "blob", // VERY IMPORTANT
        }
      );
 
      saveAs(new Blob([response.data]), "BankStatement_Output.xlsx");
      setSuccessMessage("File processed successfully! Download started.");
      setErrorMessage(null);
    } catch (error) {
      console.error("Error processing bank statement:", error);
      setErrorMessage("Error processing bank statement. Check your data format.");
      setSuccessMessage(null);
    }
  };
 
  const handleSubmit = async () => {
    if (!selectedFile) {
      setErrorMessage("Please upload a file first!");
      return;
    }
 
    try {
      const rows = await processExcelFile(selectedFile);
      await processBankStatement(rows);
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("Error reading file.");
      setSuccessMessage(null);
    }
  };
 
  return (
    <div className="uploader-container">
      <div className="uploader-card">
        <h1 className="uploader-title">Bank Statement Uploader</h1>
        <p className="uploader-subtitle">Upload and process your Excel bank statements</p>
 
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="bank-code" className="form-label">
              <span className="label-icon">🏦</span>
              Bank Code
            </label>
            <input
              type="text"
              id="bank-code"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              placeholder="Enter bank code (e.g., 058)"
              className="form-input"
            />
          </div>
 
          <div className="form-group">
            <label htmlFor="transaction-type" className="form-label">
              <span className="label-icon">💳</span>
              Transaction Type
            </label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${transactionType === 'Withdrawal' ? 'active' : ''}`}
                onClick={() => setTransactionType('Withdrawal')}
              >
                Withdrawal
              </button>
              <button
                type="button"
                className={`toggle-btn ${transactionType === 'Deposit' ? 'active' : ''}`}
                onClick={() => setTransactionType('Deposit')}
              >
                Deposit
              </button>
            </div>
          </div>
        </div>
 
 
        <div className="file-input-wrapper">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="file-input"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="file-label">
            <span className="file-icon">📁</span>
            <span className="file-label-text">
              <strong>Click to browse</strong> or drag and drop
            </span>
            {selectedFile && (
              <span className="file-name">{selectedFile.name}</span>
            )}
          </label>
        </div>
 
        <button
          onClick={handleSubmit}
          disabled={!selectedFile}
          className="submit-button"
        >
          Upload and Process
        </button>
 
        {errorMessage && (
          <div className="error-message">{errorMessage}</div>
        )}
 
        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
      </div>
    </div>
  );
};
 
export default BankStatementUploader;