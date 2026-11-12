import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import ExcelJS from 'exceljs';

mkdirSync('tests/fixtures', { recursive: true });
mkdirSync('public/samples', { recursive: true });

async function createSampleXlsx() {
  const wb = new ExcelJS.Workbook();

  // Sheet 1: Sales
  const ws1 = wb.addWorksheet('Sales');
  ws1.mergeCells('A1:E1');
  const a1 = ws1.getCell('A1');
  a1.value = 'Sales Report 2026';
  a1.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  a1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7C66' } };
  a1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.getRow(1).height = 30;

  const headers = ['Region', 'Q1', 'Q2', 'Q3', 'Total'];
  const r2 = ws1.getRow(2);
  r2.values = headers;
  r2.height = 24;
  for (let c = 1; c <= 5; c++) {
    const cell = r2.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 4, tint: 0.4 } };
    cell.font = { bold: true };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  const regions = [
    'ภาคเหนือ', 'Central', 'South', 'East', 'West',
    'North East', 'Overseas', 'Online', 'Retail', 'Wholesale',
  ];

  for (let i = 0; i < 10; i++) {
    const rn = i + 3;
    const row = ws1.getRow(rn);
    const q1 = 1000 * (i + 1);
    const q2 = 1200 * (i + 1);
    const q3 = 1100 * (i + 1);
    row.getCell(1).value = regions[i];
    row.getCell(2).value = q1;
    row.getCell(2).numFmt = '#,##0';
    row.getCell(3).value = q2;
    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).value = q3;
    row.getCell(4).numFmt = '#,##0';
    row.getCell(5).value = {
      formula: `SUM(B${rn}:D${rn})`,
      result: q1 + q2 + q3,
    };
    row.getCell(5).numFmt = '#,##0';

    for (let c = 1; c <= 5; c++) {
      row.getCell(c).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  }

  // Red font cell
  ws1.getCell('B3').font = { color: { argb: 'FFFF0000' } };

  ws1.getColumn(1).width = 18;
  ws1.getColumn(2).width = 12;
  ws1.getColumn(3).width = 12;
  ws1.getColumn(4).width = 12;
  ws1.getColumn(5).width = 14;

  ws1.views = [{ state: 'frozen', ySplit: 2, xSplit: 0 }];

  // Sheet 2: Formats
  const ws2 = wb.addWorksheet('Formats');
  const fRow1 = ws2.getRow(1);
  fRow1.getCell(1).value = 'Percent';
  fRow1.getCell(2).value = 0.256;
  fRow1.getCell(2).numFmt = '0.0%';

  const fRow2 = ws2.getRow(2);
  fRow2.getCell(1).value = 'Date';
  fRow2.getCell(2).value = new Date('2023-03-15T00:00:00.000Z');
  fRow2.getCell(2).numFmt = 'yyyy-mm-dd';

  const fRow3 = ws2.getRow(3);
  fRow3.getCell(1).value = 'Currency';
  fRow3.getCell(2).value = 1234.56;
  fRow3.getCell(2).numFmt = '"฿"#,##0.00';

  const fRow4 = ws2.getRow(4);
  fRow4.getCell(1).value = 'Boolean';
  fRow4.getCell(2).value = true;

  const fRow5 = ws2.getRow(5);
  fRow5.getCell(1).value = 'Wrap Text';
  fRow5.getCell(2).value = 'Line 1\nLine 2';
  fRow5.getCell(2).alignment = { wrapText: true };

  ws2.getColumn(3).hidden = true;

  // Sheet 3: Notes
  const ws3 = wb.addWorksheet('Notes');
  ws3.getCell('A1').value = 'Plain note';
  ws3.getCell('A2').value = { text: 'Google', hyperlink: 'https://google.com' };
  ws3.getCell('A3').value = {
    richText: [
      { text: 'Hello ' },
      { font: { bold: true }, text: 'World' },
    ],
  };

  const buf = await wb.xlsx.writeBuffer();
  writeFileSync('tests/fixtures/sample.xlsx', Buffer.from(buf));
  copyFileSync('tests/fixtures/sample.xlsx', 'public/samples/sample.xlsx');
  console.log('sample.xlsx generated');
}

async function createLargeXlsx() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('LargeSheet');
  const headers = Array.from({ length: 10 }, (_, i) => `Col_${i + 1}`);
  ws.addRow(headers);

  // 20,000 rows
  const batchSize = 1000;
  for (let b = 0; b < 20; b++) {
    const rows = [];
    for (let r = 0; r < batchSize; r++) {
      const rowNum = b * batchSize + r + 1;
      rows.push([
        rowNum,
        `Item ${rowNum}`,
        rowNum * 1.5,
        rowNum % 2 === 0,
        `Category ${(rowNum % 10) + 1}`,
        rowNum * 10,
        rowNum * 20,
        rowNum * 30,
        `Status ${rowNum % 5}`,
        `Note ${rowNum}`,
      ]);
    }
    ws.addRows(rows);
  }

  const buf = await wb.xlsx.writeBuffer();
  writeFileSync('tests/fixtures/large.xlsx', Buffer.from(buf));
  console.log('large.xlsx generated');
}

function createCsvFixtures() {
  // sample.csv: UTF-8 + BOM
  const sampleCsvContent =
    '\uFEFFid,name,phone,amount,note\r\n' +
    '1,ภาคเหนือ,0812345678,1500,"First line,\r\nsecond line with comma"\r\n' +
    '2,Somchai,0899999999,2500,"Normal note"\r\n';
  writeFileSync('tests/fixtures/sample.csv', Buffer.from(sampleCsvContent, 'utf-8'));
  copyFileSync('tests/fixtures/sample.csv', 'public/samples/sample.csv');

  // nobom.csv: UTF-8 without BOM, ; delimiter
  const noBomContent =
    'id;name;phone;amount\r\n' +
    '1;ภาคเหนือ;0812345678;1500\r\n' +
    '2;Somsak;0891112233;3000\r\n';
  writeFileSync('tests/fixtures/nobom.csv', Buffer.from(noBomContent, 'utf-8'));

  // tab.tsv.csv: tab delimiter
  const tabContent =
    'id\tname\tphone\tamount\r\n' +
    '1\tภาคเหนือ\t0812345678\t1500\r\n' +
    '2\tSomsri\t0894445566\t4500\r\n';
  writeFileSync('tests/fixtures/tab.tsv.csv', Buffer.from(tabContent, 'utf-8'));

  // thai-874.csv: encoded using enc874
  const enc874 = (s) =>
    Buffer.from(
      [...s].map((ch) => {
        const cp = ch.codePointAt(0);
        if (cp < 0x80) return cp;
        if (cp >= 0x0e01 && cp <= 0x0e5b) return cp - 0x0d60;
        return 0x3f;
      })
    );
  const thaiContent =
    'id,name,phone,amount\r\n' +
    '1,ภาคเหนือ,0812345678,1500\r\n' +
    '2,สมชาย,0899999999,2500\r\n';
  writeFileSync('tests/fixtures/thai-874.csv', enc874(thaiContent));

  // large.csv: 50,000 rows
  const chunks = ['id,val1,val2,val3\r\n'];
  for (let i = 1; i <= 50000; i++) {
    chunks.push(`${i},Item_${i},${i * 2},${i % 2 === 0 ? 'TRUE' : 'FALSE'}\r\n`);
  }
  writeFileSync('tests/fixtures/large.csv', Buffer.from(chunks.join(''), 'utf-8'));
  console.log('csv fixtures generated');
}

async function main() {
  await createSampleXlsx();
  await createLargeXlsx();
  createCsvFixtures();
  console.log('All fixtures created successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
