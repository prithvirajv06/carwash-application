import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  planName: string;
  carNickname: string;
  carType: string;
  licensePlate: string;
  apartmentName: string;
  amount: number;
  currency: string;
  paymentDate: Date;
  subscriptionStart: Date;
  subscriptionEnd: Date;
  razorpayPaymentId: string;
}

export const generateInvoicePDF = async (data: InvoiceData): Promise<string> => {
  const invoicesDir = path.join(process.cwd(), 'uploads', 'invoices');
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }

  const fileName = `${data.invoiceNumber}.pdf`;
  const filePath = path.join(invoicesDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.rect(0, 0, 612, 100).fill('#1e40af');
    doc
      .fillColor('white')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('CARWASH SERVICE', 50, 30, { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Professional Mobile Car Washing', 50, 65, { align: 'center' });

    doc.fillColor('#1e3a8a').fontSize(20).font('Helvetica-Bold').text('INVOICE', 400, 120);
    doc.fillColor('#374151').fontSize(10).font('Helvetica');
    doc.text(`Invoice No: ${data.invoiceNumber}`, 400, 148);
    doc.text(`Date: ${data.paymentDate.toLocaleDateString('en-IN')}`, 400, 163);
    doc.text(`Payment ID: ${data.razorpayPaymentId}`, 400, 178);

    doc.fillColor('#1e3a8a').fontSize(13).font('Helvetica-Bold').text('Bill To:', 50, 120);
    doc.fillColor('#374151').fontSize(10).font('Helvetica');
    doc.text(data.customerName, 50, 140);
    doc.text(data.customerEmail, 50, 155);
    doc.text(data.customerPhone, 50, 170);
    doc.text(data.apartmentName, 50, 185);

    doc.moveTo(50, 220).lineTo(562, 220).strokeColor('#e5e7eb').lineWidth(1).stroke();

    const tableTop = 240;
    doc.fillColor('#f3f4f6').rect(50, tableTop, 512, 25).fill();
    doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 60, tableTop + 7);
    doc.text('Details', 250, tableTop + 7);
    doc.text('Amount', 480, tableTop + 7, { align: 'right' });

    doc.fillColor('#374151').font('Helvetica').fontSize(10);
    let y = tableTop + 35;

    const rows = [
      { desc: 'Wash Plan', detail: data.planName, amount: '' },
      { desc: 'Vehicle', detail: `${data.carNickname} (${data.carType})`, amount: '' },
      { desc: 'License Plate', detail: data.licensePlate, amount: '' },
      { desc: 'Subscription Period', detail: `${data.subscriptionStart.toLocaleDateString('en-IN')} - ${data.subscriptionEnd.toLocaleDateString('en-IN')}`, amount: '' },
    ];

    rows.forEach((row, i) => {
      if (i % 2 === 1) {
        doc.fillColor('#f9fafb').rect(50, y - 5, 512, 22).fill();
      }
      doc.fillColor('#374151');
      doc.text(row.desc, 60, y);
      doc.text(row.detail, 250, y);
      y += 22;
    });

    doc.moveTo(50, y + 10).lineTo(562, y + 10).strokeColor('#e5e7eb').lineWidth(1).stroke();

    const subtotal = data.amount;
    const gst = Math.round(subtotal * 0.18 * 100) / 100;
    const total = subtotal;

    y += 25;
    doc.fillColor('#374151').fontSize(10);
    doc.text('Subtotal (incl. GST):', 380, y);
    doc.text(`${data.currency} ${subtotal.toFixed(2)}`, 480, y, { align: 'right' });
    y += 18;
    doc.text('GST (18%):', 380, y);
    doc.text(`Included`, 480, y, { align: 'right' });

    y += 10;
    doc.fillColor('#1e40af').rect(370, y, 192, 30).fill();
    doc.fillColor('white').fontSize(12).font('Helvetica-Bold');
    doc.text('TOTAL PAID:', 380, y + 9);
    doc.text(`${data.currency} ${total.toFixed(2)}`, 480, y + 9, { align: 'right' });

    doc.fillColor('#059669').fontSize(11).font('Helvetica-Bold').text('✓  Payment Received', 50, y + 45);
    doc.fillColor('#6b7280').fontSize(8).font('Helvetica').text('Paid via Razorpay', 50, y + 60);

    doc.moveTo(50, 740).lineTo(562, 740).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.fillColor('#6b7280').fontSize(9).text('Thank you for choosing CarWash Service!', 50, 750, { align: 'center' });
    doc.text('For support, contact us at support@carwash.com', 50, 764, { align: 'center' });

    doc.end();

    stream.on('finish', () => {
      logger.info(`Invoice PDF generated: ${fileName}`);
      resolve(`/uploads/invoices/${fileName}`);
    });

    stream.on('error', reject);
  });
};
