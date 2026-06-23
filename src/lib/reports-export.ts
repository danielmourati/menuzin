import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { brl, statusLabel, modeLabel } from "@/lib/format";

export type ReportData = {
  totalSales: number;
  ordersCount: number;
  averageTicket: number;
  topProducts: { name: string; qty: number; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  paymentMethods: { method: string; count: number; total: number }[];
  ordersByType: { mode: string; count: number; total: number }[];
};

export type ReportRange = { from: string; to: string };

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fileBase(range: ReportRange): string {
  return `relatorio-vendas_${range.from}_${range.to}`;
}

export function exportReportToPdf(
  data: ReportData,
  range: ReportRange,
  tenantName?: string,
): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Relatório de Vendas", margin, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  let subY = 68;
  if (tenantName) {
    doc.text(tenantName, margin, subY);
    subY += 14;
  }
  doc.text(
    `Período: ${fmtDate(range.from)} a ${fmtDate(range.to)}`,
    margin,
    subY,
  );
  doc.text(
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    pageWidth - margin,
    subY,
    { align: "right" },
  );
  doc.setTextColor(0);

  const kpiY = subY + 22;
  const kpiH = 56;
  const kpiW = (pageWidth - margin * 2 - 16) / 3;
  const kpis = [
    { label: "Vendas totais", value: brl(data.totalSales) },
    { label: "Pedidos", value: String(data.ordersCount) },
    { label: "Ticket médio", value: brl(data.averageTicket) },
  ];
  kpis.forEach((k, i) => {
    const x = margin + i * (kpiW + 8);
    doc.setDrawColor(226);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, kpiY, kpiW, kpiH, 6, 6, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(k.label, x + 12, kpiY + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(20);
    doc.text(k.value, x + 12, kpiY + 42);
  });
  doc.setTextColor(0);

  let cursorY = kpiY + kpiH + 20;

  const addTable = (title: string, head: string[], body: (string | number)[][]) => {
    if (body.length === 0) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, margin, cursorY);
    autoTable(doc, {
      startY: cursorY + 6,
      head: [head],
      body,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [241, 245, 249], textColor: 30, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      theme: "plain",
    });
    // @ts-expect-error lastAutoTable injected by plugin
    cursorY = doc.lastAutoTable.finalY + 22;
  };

  addTable(
    "Produtos mais vendidos",
    ["Produto", "Qtd", "Receita"],
    data.topProducts.map((p) => [p.name, p.qty, brl(p.revenue)]),
  );
  addTable(
    "Pedidos por status",
    ["Status", "Pedidos"],
    data.ordersByStatus.map((s) => [statusLabel[s.status] ?? s.status, s.count]),
  );
  addTable(
    "Formas de pagamento",
    ["Método", "Pedidos", "Total"],
    data.paymentMethods.map((m) => [m.method, m.count, brl(m.total)]),
  );
  addTable(
    "Modalidades",
    ["Modalidade", "Pedidos", "Total"],
    data.ordersByType.map((t) => [modeLabel[t.mode] ?? t.mode, t.count, brl(t.total)]),
  );

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" },
    );
  }

  doc.save(`${fileBase(range)}.pdf`);
}

export function exportReportToExcel(data: ReportData, range: ReportRange): void {
  const wb = XLSX.utils.book_new();
  const money = '"R$" #,##0.00;[Red]-"R$" #,##0.00';

  const resumo = [
    ["Relatório de Vendas"],
    [`Período: ${fmtDate(range.from)} a ${fmtDate(range.to)}`],
    [`Gerado em: ${new Date().toLocaleString("pt-BR")}`],
    [],
    ["Indicador", "Valor"],
    ["Vendas totais", data.totalSales],
    ["Pedidos", data.ordersCount],
    ["Ticket médio", data.averageTicket],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  wsResumo["B6"] = { t: "n", v: data.totalSales, z: money };
  wsResumo["B8"] = { t: "n", v: data.averageTicket, z: money };
  wsResumo["!cols"] = [{ wch: 28 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  const wsProdutos = XLSX.utils.aoa_to_sheet([
    ["Produto", "Quantidade", "Receita"],
    ...data.topProducts.map((p) => [p.name, p.qty, p.revenue]),
  ]);
  for (let i = 0; i < data.topProducts.length; i++) {
    const cell = XLSX.utils.encode_cell({ r: i + 1, c: 2 });
    wsProdutos[cell] = { t: "n", v: data.topProducts[i].revenue, z: money };
  }
  wsProdutos["!cols"] = [{ wch: 36 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsProdutos, "Produtos");

  const wsStatus = XLSX.utils.aoa_to_sheet([
    ["Status", "Pedidos"],
    ...data.ordersByStatus.map((s) => [statusLabel[s.status] ?? s.status, s.count]),
  ]);
  wsStatus["!cols"] = [{ wch: 24 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsStatus, "Status");

  const wsPag = XLSX.utils.aoa_to_sheet([
    ["Método", "Pedidos", "Total"],
    ...data.paymentMethods.map((m) => [m.method, m.count, m.total]),
  ]);
  for (let i = 0; i < data.paymentMethods.length; i++) {
    const cell = XLSX.utils.encode_cell({ r: i + 1, c: 2 });
    wsPag[cell] = { t: "n", v: data.paymentMethods[i].total, z: money };
  }
  wsPag["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsPag, "Pagamentos");

  const wsMod = XLSX.utils.aoa_to_sheet([
    ["Modalidade", "Pedidos", "Total"],
    ...data.ordersByType.map((t) => [modeLabel[t.mode] ?? t.mode, t.count, t.total]),
  ]);
  for (let i = 0; i < data.ordersByType.length; i++) {
    const cell = XLSX.utils.encode_cell({ r: i + 1, c: 2 });
    wsMod[cell] = { t: "n", v: data.ordersByType[i].total, z: money };
  }
  wsMod["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsMod, "Modalidades");

  XLSX.writeFile(wb, `${fileBase(range)}.xlsx`);
}
