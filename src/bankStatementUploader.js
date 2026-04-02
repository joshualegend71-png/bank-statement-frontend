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
  const [invalidDateRows, setInvalidDateRows] = useState([]);

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
        const workbook = XLSX.read(data, { type: "array" });

        const allSheetData = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

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

  // Default date to use when date is invalid or missing (1900-01-01)
  const DEFAULT_DATE = "1900-01-01";

  // Helper to convert value to decimal (or null if empty/invalid)
  const toDecimal = (value) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const num = Number(value);
    return isNaN(num) ? null : num;
  };

  // Helper function to safely parse and validate dates
  // Returns date in YYYY-MM-DD format which is universally accepted by .NET
  const parseDateToString = (dateValue, rowIndex, fieldName, invalidDatesRef) => {
    if (!dateValue && dateValue !== 0) {
      return DEFAULT_DATE;
    }

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date at row ${rowIndex + 1}, field ${fieldName}: "${dateValue}"`);
        invalidDatesRef.push({ row: rowIndex + 1, field: fieldName, value: dateValue });
        return DEFAULT_DATE;
      }
      // Format as YYYY-MM-DD which is compatible with .NET DateTime parsing
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.warn(`Error parsing date at row ${rowIndex + 1}, field ${fieldName}: "${dateValue}"`, error);
      invalidDatesRef.push({ row: rowIndex + 1, field: fieldName, value: dateValue });
      return DEFAULT_DATE;
    }
  };

  // Map Excel → Backend DTO
  const mapToBankStatementDto = (rows) => {
    const invalidDatesRef = [];
    const mappedRows = rows.map((row, index) => ({
      SerialNumber: row["SerialNumber"] || (index + 1).toString(),
      TxnDate: parseDateToString(row["TxnDate"], index, "TxnDate", invalidDatesRef),
      ValueDate: parseDateToString(row["ValueDate"], index, "ValueDate", invalidDatesRef),
      Narration: row["Narration"] || "",
      RefNo: row["RefNo"],
      Debit: row["Debit"],
      BankCharges: row["BankCharges"],
      DeferredRevenueRefund: row["DeferredRevenueRefund"],
      LicensingAndPermit: row["LicensingAndPermit"],
      StaffLoanAndAdvances: row["StaffLoanAndAdvances"],
      OperationalExpenses: row["OperationalExpenses"],
      FlightOperationExpenses: row["FlightOperationExpenses"],
      FreightExpenses: row["FreightExpenses"],
      AirportExpenses: row["AirportExpenses"],
      OfficeExpenses: row["OfficeExpenses"],
      OperationalStaffCost: row["OperationalStaffCost"],
      DieselAndFuel: row["DieselAndFuel"],
      CateringFees: row["CateringFees"],
      SecurityExp: row["SecurityExp"],
      RepairsAndMaintenanceOffice: row["RepairsAndMaintenanceOffice"],
      RepairsAndMaintAircraftParts: row["RepairsAndMaintAircraftParts"],
      RepairsAndMaintenanceMV: row["RepairsAndMaintenanceMV"],
      BrandingPublicity: row["BrandingPublicity"],
      CrewTraining: row["CrewTraining"],
      AviationFuel: row["AviationFuel"],
      CharterExpenses: row["CharterExpenses"],
      CharterCommission: row["CharterCommission"],
      NamaOtherCharges: row["NamaOtherCharges"],
      VisaFeeCerpacImmigrationODC1: row["VisaFeeCerpacImmigrationODC"],
      PscChargesBicourtney: row["PscChargesBicourtney"],
      NcaaChargesCommandCheck: row["NcaaChargesCommandCheck"],
      VipLoungeServices: row["VipLoungeServices"],
      NamaNavigationalCharges: row["NamaNavigationalCharges"],
      FaanLandingCharges: row["FaanLandingCharges"],
      IataLandingAndSubscriptions: row["IataLandingAndSubscriptions"],
      CostOfSales: row["CostOfSales"],
      OtherCostOfSales: row["OtherCostOfSales"],
      CleaningAndSanitation: row["CleaningAndSanitation"],
      Salary: row["Salary"],
      StationElectricity: row["StationElectricity"],
      ComputerAndOfficeEquipment: row["ComputerAndOfficeEquipment"],
      FurnitureAndFittings: row["FurnitureAndFittings"],
      Entertainment: row["Entertainment"],
      TelephoneExpenses: row["TelephoneExpenses"],
      ProfessionalAndLegalFees: row["ProfessionalAndLegalFees"],
      AccrualNsitf: row["AccrualNsitf"],
      MarketingExpenses: row["MarketingExpenses"],
      Insurance: row["Insurance"],
      HotelAccommodation: row["HotelAccommodation"],
      OfficeExpenses2: row["OfficeExpenses2"],
      MedicalExpensesOthers: row["MedicalExpensesOthers"],
      InternetServices: row["InternetServices"],
      OfficeRent: row["OfficeRent"],
      StationeryAndPrintingPapers: row["StationeryAndPrintingPapers"],
      PublicRelationExpenses: row["PublicRelationExpenses"],
      GiftAndDonations: row["GiftAndDonations"],
      Transport: row["Transport"],
    }));

    // Set invalid date rows for user notification
    setInvalidDateRows(invalidDatesRef);

    return mappedRows;
  };

  const processBankStatement = async (rows) => {
    try {
      // const payload = mapToBankStatementDto(rows);
      const invalidDatesRef = [];

      rows = rows.map((row, index) => {
        // Convert dates
        row.TxnDate = parseDateToString(row["TxnDate"], index, "TxnDate", invalidDatesRef)
        row.ValueDate = parseDateToString(row["ValueDate"], index, "ValueDate", invalidDatesRef)
        
        // Convert ALL numeric fields to proper decimals for backend compatibility
        row.Debit = toDecimal(row["Debit"]);
        row.BankCharges = toDecimal(row["BankCharges"]);
        row.DeferredRevenueRefund = toDecimal(row["DeferredRevenueRefund"]);
        row.LicensingAndPermit = toDecimal(row["LicensingAndPermit"]);
        row.StaffLoanAndAdvances = toDecimal(row["StaffLoanAndAdvances"]);
        row.OperationalExpenses = toDecimal(row["OperationalExpenses"]);
        row.FlightOperationExpenses = toDecimal(row["FlightOperationExpenses"]);
        row.FreightExpenses = toDecimal(row["FreightExpenses"]);
        row.AirportExpenses = toDecimal(row["AirportExpenses"]);
        row.OfficeExpenses = toDecimal(row["OfficeExpenses"]);
        row.OperationalStaffCost = toDecimal(row["OperationalStaffCost"]);
        row.DieselAndFuel = toDecimal(row["DieselAndFuel"]);
        row.CateringFees = toDecimal(row["CateringFees"]);
        row.SecurityExp = toDecimal(row["SecurityExp"]);
        row.RepairsAndMaintenanceOffice = toDecimal(row["RepairsAndMaintenanceOffice"]);
        row.RepairsAndMaintAircraftParts = toDecimal(row["RepairsAndMaintAircraftParts"]);
        row.RepairsAndMaintenanceMV = toDecimal(row["RepairsAndMaintenanceMV"]);
        row.BrandingPublicity = toDecimal(row["BrandingPublicity"]);
        row.CrewTraining = toDecimal(row["CrewTraining"]);
        row.AviationFuel = toDecimal(row["AviationFuel"]);
        row.CharterExpenses = toDecimal(row["CharterExpenses"]);
        row.CharterCommission = toDecimal(row["CharterCommission"]);
        row.NamaOtherCharges = toDecimal(row["NamaOtherCharges"]);
        row.VisaFeeCerpacImmigrationODC1 = toDecimal(row["VisaFeeCerpacImmigrationODC"]);
        row.PscChargesBicourtney = toDecimal(row["PscChargesBicourtney"]);
        row.NcaaChargesCommandCheck = toDecimal(row["NcaaChargesCommandCheck"]);
        row.VipLoungeServices = toDecimal(row["VipLoungeServices"]);
        row.NamaNavigationalCharges = toDecimal(row["NamaNavigationalCharges"]);
        row.FaanLandingCharges = toDecimal(row["FaanLandingCharges"]);
        row.IataLandingAndSubscriptions = toDecimal(row["IataLandingAndSubscriptions"]);
        row.CostOfSales = toDecimal(row["CostOfSales"]);
        row.OtherCostOfSales = toDecimal(row["OtherCostOfSales"]);
        row.CleaningAndSanitation = toDecimal(row["CleaningAndSanitation"]);
        row.Salary = toDecimal(row["Salary"]);
        row.StationElectricity = toDecimal(row["StationElectricity"]);
        row.ComputerAndOfficeEquipment = toDecimal(row["ComputerAndOfficeEquipment"]);
        row.FurnitureAndFittings = toDecimal(row["FurnitureAndFittings"]);
        row.Entertainment = toDecimal(row["Entertainment"]);
        row.TelephoneExpenses = toDecimal(row["TelephoneExpenses"]);
        row.ProfessionalAndLegalFees = toDecimal(row["ProfessionalAndLegalFees"]);
        row.AccrualNsitf = toDecimal(row["AccrualNsitf"]);
        row.MarketingExpenses = toDecimal(row["MarketingExpenses"]);
        row.Insurance = toDecimal(row["Insurance"]);
        row.HotelAccommodation = toDecimal(row["HotelAccommodation"]);
        row.OfficeExpenses2 = toDecimal(row["OfficeExpenses2"]);
        row.MedicalExpensesOthers = toDecimal(row["MedicalExpensesOthers"]);
        row.InternetServices = toDecimal(row["InternetServices"]);
        row.OfficeRent = toDecimal(row["OfficeRent"]);
        row.StationeryAndPrintingPapers = toDecimal(row["StationeryAndPrintingPapers"]);
        row.PublicRelationExpenses = toDecimal(row["PublicRelationExpenses"]);
        row.GiftAndDonations = toDecimal(row["GiftAndDonations"]);
        row.Transport = toDecimal(row["Transport"]);
        
        return row;
      })

      console.log(rows)
      const payload = rows;

      // Debug: Log the first few and problematic entries
      console.log('Total rows being sent:', payload.length);
      console.log('Sample payload (first 3 rows):', JSON.stringify(payload.slice(0, 3), null, 2));

      // Log TxnDate and ValueDate values for verification
      console.log('Sample TxnDate/ValueDate values:');
      payload.slice(0, 5).forEach((p, i) => {
        console.log(`  Row ${i + 1}: TxnDate="${p.TxnDate}", ValueDate="${p.ValueDate}"`);
      });

      // Check for rows with default date (potential issues)
      const defaultDateRows = payload.filter((p, i) => p.TxnDate === DEFAULT_DATE || p.ValueDate === DEFAULT_DATE);
      if (defaultDateRows.length > 0) {
        console.warn(`Found ${defaultDateRows.length} rows with default date (1900-01-01). These may need review.`);
      }

      // Check for any non-string TxnDate values
      const invalidTxnDates = payload.filter((p, i) => {
        return typeof p.TxnDate !== 'string' || p.TxnDate === '';
      });
      if (invalidTxnDates.length > 0) {
        console.error('Found invalid TxnDate values:', invalidTxnDates.slice(0, 5));
      }

      // Warn user about invalid dates but still proceed
      if (invalidDateRows.length > 0) {
        const uniqueRows = [...new Set(invalidDateRows.map(d => d.row))];
        const warningMsg = `Warning: ${invalidDateRows.length} invalid date(s) found in row(s): ${uniqueRows.slice(0, 10).join(', ')}${uniqueRows.length > 10 ? '...' : ''}. These will be set to a default date (1900-01-01).`;
        console.warn(warningMsg);
        setErrorMessage(warningMsg);
        // Clear the warning after 10 seconds
        setTimeout(() => {
          setErrorMessage(null);
        }, 10000);
      }

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
    } finally {
      // Clear invalid date rows after processing
      setInvalidDateRows([]);
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