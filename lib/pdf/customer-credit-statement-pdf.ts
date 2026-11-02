import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface CustomerCreditStatementItemPdf {
  _id: string;
  itemName: string;
  rawItemName?: string;
  itemCode?: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  discountPrice?: number;
  additionalCost?: number;
  isUtilityBill?: boolean;
  utilityBillType?: "ELECTRICITY" | "WATER" | "OTHER" | null;
  utilityAccountNumber?: string | null;
  billAmount?: number | null;
  serviceCharge?: number | null;
  isTelecomReload?: boolean;
  telecomOperator?: string | null;
  telecomType?: "CUSTOM" | "PACKAGE" | null;
  categoryName?: string | null;
  reason?: string | null;
}

export interface CustomerCreditStatementTransactionPdf {
  _id: string;
  type: "CREDIT_SALE" | "REPAYMENT";
  categoryType?: string;
  categoryLabel?: string;
  amount: number;
  paymentMethod: string;
  billNumber: string;
  note: string;
  date: string | null;
  recordedBy: string;
  shopName?: string;
  bankAccount?: string | null;
  items?: CustomerCreditStatementItemPdf[];
  itemCount?: number;
  detailsSummary?: string;
  runningDebtBalance?: number;
}

export interface GenerateCustomerCreditPdfParams {
  customer: {
    _id: string;
    name: string;
    phone: string;
    totalCredit: number;
    totalPaid: number;
    currentBalance: number;
    lastActivityDate?: string | null;
    notes?: string;
    shop?: {
      _id?: string;
      name?: string;
      code?: string;
    } | null;
  };
  transactions: CustomerCreditStatementTransactionPdf[];
  generatedBy?: string;
}

export function exportCustomerCreditStatementPDF({
  customer,
  transactions,
  generatedBy = "Administrator",
}: GenerateCustomerCreditPdfParams) {
  // A4 Portrait: 210mm x 297mm
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  let currentY = 14;

  // 1. Top Decorative Brand Accent Line
  doc.setFillColor(37, 99, 235); // Royal Blue accent
  doc.rect(marginX, currentY, pageWidth - marginX * 2, 2.5, "F");
  currentY += 8;

  // 2. Company Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text("NEWGEN FINANCIAL SYSTEMS", marginX, currentY);

  // Statement Title on Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text("CUSTOMER CREDIT STATEMENT", pageWidth - marginX, currentY, { align: "right" });
  currentY += 5;

  // Subtitle / Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text("Customer Credit Account Ledger & Detailed Items Statement", marginX, currentY);

  const formattedDate = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.text(`Generated: ${formattedDate} | By: ${generatedBy}`, pageWidth - marginX, currentY, {
    align: "right",
  });
  currentY += 6;

  // 3. Customer Info Box
  const infoBoxWidth = pageWidth - marginX * 2;
  const infoBoxHeight = 17;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, infoBoxWidth, infoBoxHeight, 2, 2, "FD");

  const row1Y = currentY + 5.5;
  const row2Y = currentY + 11.5;
  const col1X = marginX + 4;
  const col2X = marginX + 65;
  const col3X = marginX + 125;

  // Col 1: Customer Name & Phone
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("CUSTOMER:", col1X, row1Y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(customer.name, col1X + 22, row1Y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("MOBILE NO:", col1X, row2Y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(customer.phone, col1X + 22, row2Y);

  // Col 2: Branch Info
  const branchText = customer.shop?.name
    ? `${customer.shop.name} (${customer.shop.code || "SHOP"})`
    : "Primary Branch";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("BRANCH:", col2X, row1Y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(branchText.length > 25 ? branchText.substring(0, 23) + "..." : branchText, col2X + 16, row1Y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("ACCOUNT ID:", col2X, row2Y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(customer._id.substring(customer._id.length - 8).toUpperCase(), col2X + 22, row2Y);

  // Col 3: Status & Last Activity
  const isSettled = customer.currentBalance <= 0;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("STATUS:", col3X, row1Y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(isSettled ? 5 : 225, isSettled ? 150 : 29, isSettled ? 105 : 72);
  doc.text(isSettled ? "SETTLED (NO DEBT)" : "OUTSTANDING DEBT", col3X + 15, row1Y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("LAST ACTIVITY:", col3X, row2Y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    customer.lastActivityDate ? new Date(customer.lastActivityDate).toLocaleDateString() : "None",
    col3X + 24,
    row2Y
  );

  currentY += infoBoxHeight + 4;

  // 4. KPI Financial Cards
  const kpiCardWidth = (infoBoxWidth - 6) / 3;
  const kpiHeight = 13;

  const kpis = [
    {
      label: "TOTAL CREDIT TAKEN",
      value: `LKR ${Number(customer.totalCredit || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      textColor: [100, 116, 139],
      bg: [255, 255, 255],
      border: [203, 213, 225],
    },
    {
      label: "TOTAL REPAYMENTS MADE",
      value: `LKR ${Number(customer.totalPaid || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      textColor: [5, 150, 105], // Emerald
      bg: [240, 253, 244],
      border: [167, 243, 208],
    },
    {
      label: "CURRENT OUTSTANDING DEBT",
      value: `LKR ${Number(customer.currentBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      textColor: customer.currentBalance > 0 ? [225, 29, 72] : [5, 150, 105],
      bg: customer.currentBalance > 0 ? [255, 241, 242] : [240, 253, 244],
      border: customer.currentBalance > 0 ? [254, 205, 211] : [167, 243, 208],
    },
  ];

  kpis.forEach((kpi, idx) => {
    const kpiX = marginX + idx * (kpiCardWidth + 3);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(kpiX, currentY, kpiCardWidth, kpiHeight, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kpiX + 3.5, currentY + 4.2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(kpi.textColor[0], kpi.textColor[1], kpi.textColor[2]);
    doc.text(kpi.value, kpiX + 3.5, currentY + 9.8);
  });

  currentY += kpiHeight + 5;

  // 5. Table of Transactions with Items Breakdown & Running Balance
  const tableData = transactions.map((t, index) => {
    const isRepay = t.type === "REPAYMENT" || (t as any).type === "DEBT_REPAYMENT";
    const dateStr = t.date ? new Date(t.date).toLocaleDateString() : "-";
    const billStr = t.billNumber || "-";

    // Build rich, detailed particulars text
    let particulars = "";

    if (isRepay) {
      particulars = `DEBT REPAYMENT (${t.paymentMethod || "CASH"})`;
      if (t.bankAccount) {
        particulars += `\nVia: ${t.bankAccount}`;
      }
      if (t.note && !t.note.toLowerCase().includes("debt repayment")) {
        particulars += `\nNote: ${t.note}`;
      }
    } else {
      // Credit Sale: list each item in detail
      if (t.items && t.items.length > 0) {
        particulars = t.items
          .map((item) => {
            let line = `• ${item.itemName}`;
            if (item.itemCode) {
              line += ` [${item.itemCode}]`;
            }
            if (item.quantity > 1 || item.unitPrice > 0) {
              line += ` (Qty: ${item.quantity} @ LKR ${Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })})`;
            }
            if (item.isUtilityBill && item.utilityAccountNumber) {
              line += `\n  Account: ${item.utilityAccountNumber}`;
              if (item.billAmount) {
                line += ` | Bill: LKR ${item.billAmount}`;
              }
              if (item.serviceCharge) {
                line += ` + Fee: LKR ${item.serviceCharge}`;
              }
            }
            if (item.discountPrice && item.discountPrice > 0) {
              line += ` [Disc: -LKR ${item.discountPrice}]`;
            }
            return line;
          })
          .join("\n");
      } else {
        particulars = (t.detailsSummary || t.note || "Credit Purchase").replace(/^Credit Sale:\s*/i, "");
      }
    }

    const debitAmount = !isRepay
      ? `+${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "-";

    const creditAmount = isRepay
      ? `-${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "-";

    const balanceStr =
      typeof t.runningDebtBalance === "number"
        ? `LKR ${Number(t.runningDebtBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "-";

    const typeLabel = isRepay ? "Repayment" : t.categoryLabel || "Purchase";

    return [
      (index + 1).toString(),
      dateStr,
      billStr,
      typeLabel,
      particulars,
      debitAmount,
      creditAmount,
      balanceStr,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX, bottom: 25 },
    head: [
      [
        "#",
        "DATE",
        "BILL / REF #",
        "TYPE",
        "PARTICULARS & ITEMS BREAKDOWN",
        "DEBIT (+)",
        "CREDIT (-)",
        "DEBT BALANCE",
      ],
    ],
    body: tableData,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      textColor: [51, 65, 85], // Slate 700
      cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
      lineColor: [226, 232, 240], // Slate 200
      lineWidth: 0.2,
      valign: "top",
    },
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
      halign: "left",
      cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate 50
    },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 19 },
      2: { cellWidth: 26, fontStyle: "bold" },
      3: { cellWidth: 22, fontStyle: "bold" },
      4: { cellWidth: "auto" }, // Expands with full item breakdown
      5: { cellWidth: 22, halign: "right", fontStyle: "bold" },
      6: { cellWidth: 22, halign: "right", fontStyle: "bold" },
      7: { cellWidth: 25, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      // Color-code Type column
      if (data.section === "body" && data.column.index === 3) {
        const text = String(data.cell.raw || "");
        if (text.toLowerCase().includes("repay")) {
          data.cell.styles.textColor = [5, 150, 105]; // Emerald
        } else {
          data.cell.styles.textColor = [30, 41, 59]; // Dark Slate
        }
      }

      // Color-code Debit (+) column
      if (data.section === "body" && data.column.index === 5) {
        const text = String(data.cell.raw || "");
        if (text.startsWith("+")) {
          data.cell.styles.textColor = [225, 29, 72]; // Rose (Debit increases debt)
        }
      }

      // Color-code Credit (-) column
      if (data.section === "body" && data.column.index === 6) {
        const text = String(data.cell.raw || "");
        if (text.startsWith("-")) {
          data.cell.styles.textColor = [5, 150, 105]; // Emerald (Credit settles debt)
        }
      }

      // Color-code Debt Balance column
      if (data.section === "body" && data.column.index === 7) {
        data.cell.styles.textColor = [15, 23, 42]; // Slate 900 bold
      }
    },
  });

  // 6. Signatures and Footers on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // If on the last page, draw signature lines if there is space
    if (i === totalPages) {
      const finalY = (doc as any).lastAutoTable?.finalY || currentY;
      if (finalY < pageHeight - 35) {
        const sigY = pageHeight - 24;

        // Officer Signature
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.3);
        doc.line(marginX, sigY, marginX + 50, sigY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text("Authorized Officer Signature", marginX, sigY + 4);

        // Customer Signature
        doc.line(pageWidth - marginX - 50, sigY, pageWidth - marginX, sigY);
        doc.text("Customer Signature / Acceptance", pageWidth - marginX - 50, sigY + 4);
      }
    }

    // Bottom Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    // Left Footer Notice
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "CONFIDENTIAL & PROPRIETARY | Customer Credit Ledger Statement - Generated via Newgen ERP",
      marginX,
      pageHeight - 6.5
    );

    // Right Page Number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 6.5, {
      align: "right",
    });
  }

  // Save the PDF
  const sanitizedCustomer = customer.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const sanitizedDate = new Date().toISOString().split("T")[0];
  const filename = `Credit_Statement_${sanitizedCustomer}_${sanitizedDate}.pdf`;
  doc.save(filename);
}

