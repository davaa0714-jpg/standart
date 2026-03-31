// lib/export.ts — Word, Excel, PDF файл үүсгэх

import type { TaskFull, MeetingStats, StaffStats } from '@/types/database'
import { STATUS_LABELS, TASK_TYPE_LABELS, PRIORITY_LABELS } from '@/types/database'
import { format } from 'date-fns'

const TODAY = format(new Date(), 'yyyy-MM-dd')
const ORG_NAME = 'Газрын Харилцааны Алба'

// ── WORD (.docx) ──────────────────────────────────────────────────
export async function exportToWord(tasks: TaskFull[], title: string) {
  const { Document, Packer, Paragraph, Table, TableRow, TableCell,
          TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle } = await import('docx')

  const headerCell = (text: string) =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20 })] })],
      shading: { fill: '2B5C8A' },
    })

  const dataCell = (text: string) =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, size: 18 })] })],
    })

  const tableRows = [
    new TableRow({
      children: [
        headerCell('№'),
        headerCell('Үүрэг / Даалгавар'),
        headerCell('Төрөл'),
        headerCell('Хариуцагч'),
        headerCell('Биелэх хугацаа'),
        headerCell('Төлөв'),
        headerCell('Биелэлт %'),
      ],
      tableHeader: true,
    }),
    ...tasks.map((t, i) =>
      new TableRow({
        children: [
          dataCell(String(i + 1)),
          dataCell(t.title),
          dataCell(TASK_TYPE_LABELS[t.task_type]),
          dataCell(t.assignee_name ?? '—'),
          dataCell(t.deadline),
          dataCell(STATUS_LABELS[t.status]),
          dataCell(t.progress + '%'),
        ],
      })
    ),
  ]

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: ORG_NAME,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: `Гаргасан огноо: ${TODAY}`, size: 18, color: '666666' })],
          alignment: AlignmentType.RIGHT,
        }),
        new Paragraph({ text: '' }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [new TextRun({
            text: `Нийт: ${tasks.length} үүрэг  |  Биелсэн: ${tasks.filter(t => t.status === 'done').length}  |  Хугацаа хэтэрсэн: ${tasks.filter(t => t.status === 'overdue').length}`,
            size: 18, bold: true,
          })],
        }),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  downloadBuffer(buffer, `${title}-${TODAY}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
}

// ── EXCEL (.xlsx) ─────────────────────────────────────────────────
export async function exportToExcel(tasks: TaskFull[], title: string) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = ORG_NAME
  wb.created = new Date()

  const ws = wb.addWorksheet('Үүрэг даалгавар', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  })

  // Гарчиг мөр
  ws.mergeCells('A1:H1')
  const titleCell = ws.getCell('A1')
  titleCell.value = `${ORG_NAME} — ${title}`
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B5C8A' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 28

  ws.mergeCells('A2:H2')
  ws.getCell('A2').value = `Гаргасан огноо: ${TODAY}`
  ws.getCell('A2').alignment = { horizontal: 'right' }
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF666666' } }

  // Толгой мөр
  const headers = ['№', 'Үүрэг / Даалгавар', 'Төрөл', 'Хариуцагч', 'Хэлтэс', 'Биелэх хугацаа', 'Төлөв', 'Биелэлт %']
  const headerRow = ws.addRow(headers)
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    }
  })
  ws.getRow(3).height = 22

  // Өгөгдөл мөрүүд
  tasks.forEach((t, i) => {
    const row = ws.addRow([
      i + 1,
      t.title,
      TASK_TYPE_LABELS[t.task_type],
      t.assignee_name ?? '—',
      t.assignee_department ?? '—',
      t.deadline,
      STATUS_LABELS[t.status],
      t.progress,
    ])

    const isOverdue = t.status === 'overdue'
    const isDone = t.status === 'done'

    row.eachCell((cell, col) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      }
      if (i % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F8FC' } }
      }
      if (isOverdue) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE8E8' } }
      }
      if (isDone) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
      }
      if (col === 8) {
        cell.numFmt = '0"%"'
        const pct = t.progress / 100
        cell.dataValidation = {
          type: 'decimal', operator: 'between',
          showErrorMessage: false, formulae: ['0', '100'],
        }
      }
    })
  })

  // Багана өргөн
  ws.getColumn(1).width = 5
  ws.getColumn(2).width = 40
  ws.getColumn(3).width = 12
  ws.getColumn(4).width = 18
  ws.getColumn(5).width = 16
  ws.getColumn(6).width = 14
  ws.getColumn(7).width = 20
  ws.getColumn(8).width = 12

  // Дүнгийн мөр
  ws.addRow([])
  const sumRow = ws.addRow([
    '', `Нийт: ${tasks.length}`, '', '',  '', '',
    `Биелсэн: ${tasks.filter(t=>t.status==='done').length}`,
    `${Math.round(tasks.filter(t=>t.status==='done').length/tasks.length*100)}%`,
  ])
  sumRow.font = { bold: true }

  // Хоёрдугаар хуудас — Ажилтнаар
  const ws2 = wb.addWorksheet('Ажилтнаар')
  ws2.addRow(['Ажилтан', 'Нийт', 'Биелсэн', 'Хугацаа хэтэрсэн', 'Биелэлт %']).font = { bold: true }
  const byStaff = new Map<string, { total: number; done: number; overdue: number }>()
  tasks.forEach(t => {
    const name = t.assignee_name ?? 'Тодорхойгүй'
    const cur = byStaff.get(name) ?? { total: 0, done: 0, overdue: 0 }
    cur.total++
    if (t.status === 'done') cur.done++
    if (t.status === 'overdue') cur.overdue++
    byStaff.set(name, cur)
  })
  byStaff.forEach((v, name) => {
    ws2.addRow([name, v.total, v.done, v.overdue, `${Math.round(v.done/v.total*100)}%`])
  })

  const buffer = await wb.xlsx.writeBuffer()
  downloadBuffer(buffer as ArrayBuffer, `${title}-${TODAY}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

// ── PDF ───────────────────────────────────────────────────────────
export async function exportToPDF(tasks: TaskFull[], title: string) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Гарчиг
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(ORG_NAME, doc.internal.pageSize.width / 2, 15, { align: 'center' })
  doc.setFontSize(11)
  doc.text(title, doc.internal.pageSize.width / 2, 22, { align: 'center' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Гаргасан: ${TODAY}`, doc.internal.pageSize.width - 15, 22, { align: 'right' })

  autoTable(doc, {
    startY: 28,
    head: [['№', 'Үүрэг / Даалгавар', 'Төрөл', 'Хариуцагч', 'Хугацаа', 'Төлөв', '%']],
    body: tasks.map((t, i) => [
      i + 1,
      t.title,
      TASK_TYPE_LABELS[t.task_type],
      t.assignee_name ?? '—',
      t.deadline,
      STATUS_LABELS[t.status],
      t.progress + '%',
    ]),
    headStyles: { fillColor: [43, 92, 138], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const task = tasks[data.row.index]
        if (task?.status === 'overdue') {
          data.cell.styles.fillColor = [253, 232, 232]
          data.cell.styles.textColor = [200, 50, 50]
        }
        if (task?.status === 'done') {
          data.cell.styles.fillColor = [232, 245, 233]
          data.cell.styles.textColor = [30, 130, 60]
        }
      }
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 80 },
      2: { cellWidth: 22 },
      3: { cellWidth: 35 },
      4: { cellWidth: 25 },
      5: { cellWidth: 35 },
      6: { cellWidth: 12 },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      // Хуудасны дугаар
      doc.setFontSize(8)
      doc.text(
        `Хуудас ${data.pageNumber}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 8,
        { align: 'center' }
      )
    },
  })

  // Дүн
  const finalY = (doc as any).lastAutoTable.finalY + 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(
    `Нийт: ${tasks.length}  |  Биелсэн: ${tasks.filter(t=>t.status==='done').length}  |  Хугацаа хэтэрсэн: ${tasks.filter(t=>t.status==='overdue').length}`,
    15, finalY
  )

  doc.save(`${title}-${TODAY}.pdf`)
}

// ── HELPER ────────────────────────────────────────────────────────
function downloadBuffer(buffer: ArrayBuffer | Buffer, filename: string, mimeType: string) {
  const blob = new Blob([buffer], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── UNIFIED EXPORT ────────────────────────────────────────────────
export async function exportTasks(
  tasks: TaskFull[],
  format: 'word' | 'excel' | 'pdf',
  title = 'Үүрэг-даалгаварын-жагсаалт'
) {
  switch (format) {
    case 'word':  return exportToWord(tasks, title)
    case 'excel': return exportToExcel(tasks, title)
    case 'pdf':   return exportToPDF(tasks, title)
  }
}
